import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { sanitizeInput, escapeHtml } from '../src/utils/validation.js'
import { checkBackendHealth, submitInquiryLive } from '../src/utils/apiClient.js'

test('1. Input Sanitization: preserves plain text without unnecessary HTML escaping', () => {
  // Plain text with quotes, ampersands, slashes, and mathematical operators
  const rawTitle = 'LangGraph & Vector RAG / "Autonomous AI" <Core>'
  const sanitized = sanitizeInput(rawTitle)

  // Must NOT convert to HTML entities for plain text storage
  assert.equal(sanitized, 'LangGraph & Vector RAG / "Autonomous AI" <Core>')
  assert.doesNotMatch(sanitized, /&amp;|&quot;|&#x27;|&#x2F;|&lt;|&gt;/)

  // Control characters are stripped while preserving tabs and newlines
  const textWithControlChars = 'Hello\u0000World\u0007!\nLine 2\tTabbed'
  const cleaned = sanitizeInput(textWithControlChars)
  assert.equal(cleaned, 'HelloWorld!\nLine 2\tTabbed')

  // Length limit enforcement
  const longText = 'A'.repeat(50)
  const truncated = sanitizeInput(longText, 20)
  assert.equal(truncated.length, 20)
  assert.equal(truncated, 'A'.repeat(20))

  // Unicode NFC normalization
  const nonNFC = 'e\u0301' // 'e' + combining acute accent
  const normalized = sanitizeInput(nonNFC)
  assert.equal(normalized, 'é')

  // Context-aware escapeHtml is available for raw HTML output
  assert.equal(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'.replace('&#x2F;', '/'))
})

test('2. Health Check: returns consistent response object and handles timeouts', async () => {
  // Start dummy HTTP server
  let statusCodeToReturn = 200
  let bodyToReturn = JSON.stringify({ status: 'healthy', storage: { mode: 'postgresql' } })
  let responseDelayMs = 0
  let contentTypeHeader = 'application/json'

  const server = http.createServer((req, res) => {
    setTimeout(() => {
      res.writeHead(statusCodeToReturn, { 'Content-Type': contentTypeHeader })
      res.end(bodyToReturn)
    }, responseDelayMs)
  })

  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port

  // Temporary monkey-patch global fetch targeting dummy test server
  const originalFetch = globalThis.fetch

  try {
    globalThis.fetch = (url, options) => {
      const targetUrl = url.replace('http://localhost:5001/api/health', `http://127.0.0.1:${port}`)
      return originalFetch(targetUrl, options)
    }

    // Case A: 200 OK with valid JSON
    statusCodeToReturn = 200
    bodyToReturn = JSON.stringify({ status: 'healthy', storage: { mode: 'postgresql' } })
    const resA = await checkBackendHealth(1000)
    assert.equal(resA.online, true)
    assert.equal(resA.statusCode, 200)
    assert.equal(resA.data.status, 'healthy')
    assert.equal(resA.error, null)

    // Case B: Unsuccessful HTTP response (503 Service Unavailable)
    statusCodeToReturn = 503
    bodyToReturn = JSON.stringify({ status: 'unhealthy', error: 'PostgreSQL connection failed' })
    const resB = await checkBackendHealth(1000)
    assert.equal(resB.online, false)
    assert.equal(resB.statusCode, 503)
    assert.equal(resB.data.status, 'unhealthy')
    assert.match(resB.error, /PostgreSQL connection failed/i)

    // Case C: Malformed JSON from backend error gateway
    statusCodeToReturn = 502
    contentTypeHeader = 'text/html'
    bodyToReturn = '<html><body>502 Bad Gateway</body></html>'
    const resC = await checkBackendHealth(1000)
    assert.equal(resC.online, false)
    assert.equal(resC.statusCode, 502)
    assert.equal(resC.data, null) // Malformed JSON safely handled
    assert.match(resC.error, /HTTP 502/i)

    // Case D: Health check timeout triggers AbortController
    statusCodeToReturn = 200
    contentTypeHeader = 'application/json'
    responseDelayMs = 300
    const resD = await checkBackendHealth(50) // 50ms timeout
    assert.equal(resD.online, false)
    assert.equal(resD.statusCode, null)
    assert.match(resD.error, /timed out/i)
  } finally {
    globalThis.fetch = originalFetch
    await new Promise((resolve) => server.close(resolve))
  }
})

test('3. Live Submission: distinguishes network failure from server failure', async () => {
  // Start dummy HTTP server
  let statusCodeToReturn = 201
  let bodyToReturn = JSON.stringify({
    referenceId: 'CYN-20261101-ABCD1234ABCD1234ABCD1234ABCD1234',
    assignedArchitect: 'Jaipur Lead Architect',
    slaResponseHours: 4,
    storageMode: 'postgresql',
    isLiveBackend: true,
  })

  const server = http.createServer((req, res) => {
    res.writeHead(statusCodeToReturn, { 'Content-Type': 'application/json' })
    res.end(bodyToReturn)
  })

  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port

  const originalFetch = globalThis.fetch

  try {
    globalThis.fetch = (url, options) => {
      const targetUrl = url.replace('http://localhost:5001/api/inquiries', `http://127.0.0.1:${port}`)
      return originalFetch(targetUrl, options)
    }

    // Case A: 201 Created (Live DB success)
    statusCodeToReturn = 201
    const resA = await submitInquiryLive({ projectTitle: 'Real Submission' })
    assert.equal(resA.success, true)
    assert.equal(resA.statusCode, 201)
    assert.equal(resA.storageMode, 'postgresql')
    assert.equal(resA.isLiveBackend, true)

    // Case B: 500 Server Error
    statusCodeToReturn = 500
    bodyToReturn = JSON.stringify({ error: 'Internal PostgreSQL crash', errorType: 'SERVER_ERROR' })
    const resB = await submitInquiryLive({ projectTitle: 'Failing Submission' })
    assert.equal(resB.success, false)
    assert.equal(resB.statusCode, 500)
    assert.equal(resB.errorType, 'SERVER_ERROR')
    assert.match(resB.error, /Internal PostgreSQL crash/)

    // Case C: AbortError handling
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(
      async () => {
        await submitInquiryLive({ projectTitle: 'Aborted Submission' }, { signal: controller.signal })
      },
      (err) => {
        assert.equal(err.name, 'AbortError')
        return true
      }
    )

    // Case D: Network failure (target non-existent port)
    globalThis.fetch = () => {
      const netErr = new TypeError('fetch failed: ECONNREFUSED')
      throw netErr
    }
    const resD = await submitInquiryLive({ projectTitle: 'Offline Submission' })
    assert.equal(resD.success, false)
    assert.equal(resD.statusCode, 0)
    assert.equal(resD.errorType, 'NETWORK_ERROR')
    assert.match(resD.error, /Could not reach the Cynbit Express backend/i)
  } finally {
    globalThis.fetch = originalFetch
    await new Promise((resolve) => server.close(resolve))
  }
})

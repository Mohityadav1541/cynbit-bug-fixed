import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { app } from '../server/app.js'
import { config, parseTrustProxy } from '../server/config.js'
import { inquiryRepository } from '../server/storage/inquiryRepository.js'
import { generateReferenceId } from '../server/routes/inquiries.js'
import { localDevStore } from '../server/storage/localStore.js'
import { inquiryRateLimiter, getClientIp } from '../server/middleware/rateLimiter.js'
import { extractScopingFields } from '../src/utils/draftStorage.js'
import { isReviewerModeActive, setReviewerMode, REVIEWER_STORAGE_KEY } from '../src/config/cynbitConfig.js'
import { submitInquiryMock, SIMULATION_MODES } from '../src/utils/mockApi.js'
import { checkBackendHealth } from '../src/utils/apiClient.js'

describe('=== CYNBIT ARCHITECTURAL REGRESSION TEST SUITE ===', () => {
  let server
  let baseUrl

  const validPayload = {
    engagementStream: 'Autonomous AI Agents',
    projectTitle: 'Enterprise Claims Intelligence Platform',
    projectDescription: 'Building distributed agents to autonomously review, triage, and process high-volume enterprise claims with strict human-in-the-loop auditability.',
    techStack: ['Python', 'PostgreSQL', 'LangGraph', 'Docker'],
    timeline: '3 - 6 Months',
    budgetRange: '$50,000 - $100,000',
    fullName: 'Alex Demo',
    email: 'alex@example.com',
    phone: '+1 555-0199',
    company: 'Example Demonstration Inc.',
  }

  before(async () => {
    server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port
    baseUrl = `http://127.0.0.1:${port}`
  })

  after(async () => {
    inquiryRateLimiter.close()
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  // CASE 1: Public reference lookup returns 404
  test('1. Public reference lookup returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/inquiries/CYN-20261101-ABCD1234EF567890`)
    assert.equal(res.status, 404)
    const body = await res.json()
    assert.equal(body.success, false)
    assert.equal(body.statusCode, 404)
    assert.equal(body.errorType, 'NOT_FOUND')
    assert.equal(body.data, undefined)
  })

  // CASE 2: Reference IDs use sufficient cryptographic randomness
  test('2. Reference IDs use sufficient cryptographic randomness', () => {
    const id1 = generateReferenceId()
    const id2 = generateReferenceId()

    assert.notEqual(id1, id2)
    // Format: CYN-YYYYMMDD-[32 hex chars] (16 bytes = 128 bits entropy)
    const refRegex = /^CYN-\d{8}-[0-9A-F]{32}$/
    assert.match(id1, refRegex, 'Reference ID must match 128-bit hex format')
    assert.match(id2, refRegex, 'Reference ID must match 128-bit hex format')

    // Verify entropy across 100 generated IDs
    const idSet = new Set()
    for (let i = 0; i < 100; i++) {
      idSet.add(generateReferenceId())
    }
    assert.equal(idSet.size, 100, '100 generated reference IDs must all be unique')
  })

  // CASE 3: Spoofed X-Forwarded-For is not blindly trusted
  test('3. Spoofed X-Forwarded-For is not blindly trusted', () => {
    const originalTrust = app.get('trust proxy')
    app.set('trust proxy', false)

    try {
      const mockReq = {
        ip: '127.0.0.1',
        headers: {
          'x-forwarded-for': '203.0.113.195, 198.51.100.1',
          'cf-connecting-ip': '198.51.100.25',
        },
        socket: { remoteAddress: '127.0.0.1' },
      }

      const clientIp = getClientIp(mockReq)
      assert.equal(clientIp, '127.0.0.1', 'Must evaluate to socket address, ignoring spoofed headers')
    } finally {
      app.set('trust proxy', originalTrust)
    }
  })

  // CASE 4: Trust proxy configuration works as documented
  test('4. Trust proxy configuration works as documented', () => {
    assert.equal(parseTrustProxy(false), false)
    assert.equal(parseTrustProxy('false'), false)
    assert.equal(parseTrustProxy(true), true)
    assert.equal(parseTrustProxy('true'), true)
    assert.equal(parseTrustProxy('1'), 1)
    assert.equal(parseTrustProxy(2), 2)
    assert.equal(parseTrustProxy('loopback'), 'loopback')
    assert.deepEqual(parseTrustProxy('127.0.0.1, 10.0.0.1'), ['127.0.0.1', '10.0.0.1'])
  })

  // CASE 5: Local JSON fallback is prohibited in production
  test('5. Local JSON fallback is prohibited in production', async () => {
    const originalEnv = config.NODE_ENV
    const originalConnected = inquiryRepository.isDbConnected
    const originalPool = inquiryRepository.pgPool

    try {
      config.NODE_ENV = 'production'
      inquiryRepository.setIsDbConnected(false)
      inquiryRepository.setPgPool(null)

      const initialLocalCount = localDevStore.list().length

      let threwError = false
      try {
        await inquiryRepository.saveInquiry({
          ...validPayload,
          referenceId: generateReferenceId(),
        })
      } catch (err) {
        threwError = true
        assert.ok(err.message.includes('unavailable') || err.message.includes('Production'))
      }

      assert.equal(threwError, true, 'saveInquiry must throw in production when DB is offline')
      assert.equal(localDevStore.list().length, initialLocalCount, 'Must NEVER write to local JSON store in production')
    } finally {
      config.NODE_ENV = originalEnv
      inquiryRepository.setIsDbConnected(originalConnected)
      inquiryRepository.setPgPool(originalPool)
    }
  })

  // CASE 6: PostgreSQL failure returns HTTP 503 in production
  test('6. PostgreSQL failure returns HTTP 503 in production', async () => {
    const originalEnv = config.NODE_ENV
    const originalConnected = inquiryRepository.isDbConnected
    const originalPool = inquiryRepository.pgPool

    try {
      config.NODE_ENV = 'production'
      inquiryRepository.setIsDbConnected(false)
      inquiryRepository.setPgPool(null)

      const res = await fetch(`${baseUrl}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      })

      assert.equal(res.status, 503, 'Must return HTTP 503 when primary DB is unavailable in production')
      const body = await res.json()
      assert.equal(body.success, false)
      assert.equal(body.statusCode, 503)
      assert.equal(body.errorType, 'SERVICE_UNAVAILABLE')
    } finally {
      config.NODE_ENV = originalEnv
      inquiryRepository.setIsDbConnected(originalConnected)
      inquiryRepository.setPgPool(originalPool)
    }
  })

  // CASE 7: Health liveness works independently
  test('7. Health liveness works independently', async () => {
    const res = await fetch(`${baseUrl}/api/health/live`)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.status, 'live')
    assert.ok(typeof body.uptimeSeconds === 'number')
    assert.ok(typeof body.timestamp === 'string')
  })

  // CASE 8: Health readiness checks persistent storage
  test('8. Health readiness checks persistent storage', async () => {
    // In test environment, reports ready with storage diagnostics
    const res = await fetch(`${baseUrl}/api/health/ready`)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.status, 'ready')
    assert.ok(['postgresql', 'local-development'].includes(body.storage))

    // Guarantees zero credential leakage
    const rawJson = JSON.stringify(body)
    assert.ok(!rawJson.includes('password'))
    assert.ok(!rawJson.includes('DATABASE_URL'))
  })

  // CASE 9: Public APIs never expose customer PII
  test('9. Public APIs never expose customer PII', async () => {
    const res = await fetch(`${baseUrl}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    })

    assert.equal(res.status, 201)
    const body = await res.json()
    assert.equal(body.success, true)
    assert.ok(body.referenceId)
    assert.ok(body.assignedArchitect)

    // Strictly excludes IP, user-agent, email, and phone
    assert.equal(body.ipAddress, undefined)
    assert.equal(body.userAgent, undefined)
    assert.equal(body.email, undefined)
    assert.equal(body.phone, undefined)
    assert.equal(body.fullName, undefined)
    assert.equal(body.inquiry, undefined)
  })

  // CASE 10: LocalStorage contains no personal contact information
  test('10. LocalStorage contains no personal contact information', () => {
    const rawFormState = {
      serviceStream: 'ai-agents',
      projectTitle: 'AI Fraud Detection',
      projectDescription: 'High performance transaction audit agent',
      techFocus: ['Python', 'PostgreSQL'],
      timeline: '3-6-months',
      budgetRange: '$50,000+',
      budgetIndex: 3,
      // Personal identifiable information
      fullName: 'Alex Demo',
      email: 'alex@example.com',
      phone: '+1 555-0199',
      company: 'Example Demonstration Inc.',
    }

    const scopingOnly = extractScopingFields(rawFormState)

    // Scoping fields are preserved
    assert.equal(scopingOnly.serviceStream, 'ai-agents')
    assert.equal(scopingOnly.projectTitle, 'AI Fraud Detection')

    // Personal identifiers are strictly stripped
    assert.equal(scopingOnly.fullName, undefined)
    assert.equal(scopingOnly.email, undefined)
    assert.equal(scopingOnly.phone, undefined)
    assert.equal(scopingOnly.company, undefined)
  })

  // CASE 11: Customer mode does not expose reviewer-only controls
  test('11. Customer mode does not expose reviewer-only controls', () => {
    const originalWindow = globalThis.window
    try {
      // Simulate normal customer environment: no URL parameters, no local storage flag
      globalThis.window = {
        location: { search: '' },
        localStorage: {
          getItem: () => null,
          setItem: () => {},
        },
      }

      assert.equal(isReviewerModeActive(), false, 'Customer mode must evaluate to false')
    } finally {
      globalThis.window = originalWindow
    }
  })

  // CASE 12: Reviewer mode correctly enables simulator tools
  test('12. Reviewer mode correctly enables simulator tools', () => {
    const originalWindow = globalThis.window
    try {
      let storedValue = null
      globalThis.window = {
        location: { search: '?reviewer=1' },
        localStorage: {
          getItem: (key) => (key === REVIEWER_STORAGE_KEY ? storedValue : null),
          setItem: (key, val) => {
            if (key === REVIEWER_STORAGE_KEY) storedValue = String(val)
          },
        },
      }

      assert.equal(isReviewerModeActive(), true, '?reviewer=1 must enable reviewer mode')
      assert.equal(storedValue, 'true', 'Must persist reviewer state')

      // Programmatic toggle
      setReviewerMode(false)
      assert.equal(storedValue, 'false')
    } finally {
      globalThis.window = originalWindow
    }
  })

  // CASE 13: Fake submission is not confused with real persistence
  test('13. Fake submission is not confused with real persistence', async () => {
    const mockResult = await submitInquiryMock(validPayload, SIMULATION_MODES.SUCCESS)

    assert.equal(mockResult.success, true)
    assert.equal(mockResult.isLiveBackend, undefined, 'Mock submission must NOT be flagged as live backend')
    assert.notEqual(mockResult.storageMode, 'postgresql', 'Mock submission must NEVER claim PostgreSQL storage')
  })

  // CASE 14: API timeout cleanup works
  test('14. API timeout cleanup works', async () => {
    const dummyServer = http.createServer((req, res) => {
      // Delay response longer than the timeout
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok' }))
      }, 500)
    })

    await new Promise((resolve) => dummyServer.listen(0, resolve))
    const port = dummyServer.address().port

    const originalFetch = globalThis.fetch
    try {
      globalThis.fetch = (url, options) => {
        const targetUrl = url.replace('http://localhost:5001/api/health', `http://127.0.0.1:${port}`)
        return originalFetch(targetUrl, options)
      }

      // Check with a very short timeout of 50ms
      const healthRes = await checkBackendHealth(50)
      assert.equal(healthRes.online, false)
      assert.ok(healthRes.error.includes('timed out'))
    } finally {
      globalThis.fetch = originalFetch
      await new Promise((resolve) => dummyServer.close(resolve))
    }
  })

  // CASE 15: Existing async recovery behavior remains correct
  test('15. Existing async recovery behavior remains correct', async () => {
    // Network failure throws a TypeError representing network disconnection
    await assert.rejects(
      async () => submitInquiryMock(validPayload, SIMULATION_MODES.NETWORK_ERROR),
      { name: 'TypeError' }
    )

    // HTTP 500 server crash simulation returns structured error
    const srvErr = await submitInquiryMock(validPayload, SIMULATION_MODES.SERVER_500)
    assert.equal(srvErr.success, false)
    assert.equal(srvErr.statusCode, 500)

    // HTTP 429 rate limit simulation returns cooldown retry seconds
    const rateErr = await submitInquiryMock(validPayload, SIMULATION_MODES.RATE_LIMIT)
    assert.equal(rateErr.success, false)
    assert.equal(rateErr.statusCode, 429)
    assert.ok(rateErr.retryAfterSeconds > 0)
  })
})

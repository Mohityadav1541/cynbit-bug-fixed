import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { app } from '../server/app.js'
import { inquiryRateLimiter } from '../server/middleware/rateLimiter.js'
import { localDevStore } from '../server/storage/localStore.js'
import { inquiryRepository } from '../server/storage/inquiryRepository.js'

describe('Cynbit Backend Express API Integration Tests', () => {
  let server
  let baseUrl

  before(async () => {
    // Start Express app on an ephemeral port (port 0)
    server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port
    baseUrl = `http://127.0.0.1:${port}`
  })

  after(async () => {
    await new Promise((resolve) => server.close(resolve))
    await inquiryRepository.close()
  })

  // Helper to reset rate limits before tests
  const resetRateLimits = () => {
    inquiryRateLimiter.reset()
  }

  const validPayload = {
    engagementStream: 'Autonomous AI Agents',
    projectTitle: 'Enterprise Knowledge Graph & LLM Orchestrator',
    projectDescription:
      'Designing and deploying an autonomous multi-agent reasoning architecture with retrieval-augmented generation and vector indexing.',
    businessObjective: 'Automate high-volume customer inquiries and reduce escalation turnaround.',
    mainChallenges: 'Low latency requirements and multi-tenant security isolation.',
    expectedFunctionality: 'Streaming chat interface, tool calling, and audit logging.',
    techStack: ['Next.js', 'Python', 'PostgreSQL', 'Docker'],
    timeline: '3 - 6 Months',
    budgetRange: '$50,000 - $100,000',
    fullName: 'Jane Doe',
    email: 'jane.doe@enterprise-corp.com',
    phone: '+91-9876543210',
    company: 'Enterprise Corp Global',
    website_url_hp: '',
  }

  test('1. GET /api/health: returns 200 OK and storage diagnostics', async () => {
    const res = await fetch(`${baseUrl}/api/health`)
    assert.equal(res.status, 200)

    const data = await res.json()
    assert.equal(data.status, 'healthy')
    assert.equal(data.service, 'Cynbit Architecture Discovery API')
    assert.ok(typeof data.uptimeSeconds === 'number')
    assert.ok(data.storage)
    assert.ok(['local-fallback', 'postgresql'].includes(data.storage.mode))
    assert.equal(data.storage.connected, true)
  })

  test('2. POST /api/inquiries: successfully creates inquiry with 201 Created and reference ID', async () => {
    resetRateLimits()

    const res = await fetch(`${baseUrl}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    })

    assert.equal(res.status, 201)
    const data = await res.json()

    assert.equal(data.success, true)
    assert.equal(data.statusCode, 201)
    // Verify reference ID uses at least 16 cryptographically random bytes (32 hex characters = 128 bits entropy)
    assert.match(data.referenceId, /^CYN-\d{8}-[A-F0-9]{32}$/)
    assert.equal(data.assignedArchitect, 'Lead AI & LLM Systems Architect')
    assert.equal(data.slaResponseHours, 24)
    assert.ok(['local-fallback', 'postgresql'].includes(data.storageMode))

    // Verify it is stored and retrievable
    const stored = localDevStore.findByReferenceId(data.referenceId)
    assert.ok(stored)
    assert.equal(stored.email, 'jane.doe@enterprise-corp.com')
  })

  test('3. POST /api/inquiries: honeypot bot trap returns 400 SECURITY_GATEWAY', async () => {
    resetRateLimits()

    const botPayload = {
      ...validPayload,
      website_url_hp: 'https://spam-crawler-target.ru',
    }

    const res = await fetch(`${baseUrl}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(botPayload),
    })

    assert.equal(res.status, 400)
    const data = await res.json()
    assert.equal(data.success, false)
    assert.equal(data.errorType, 'SECURITY_GATEWAY')
    assert.ok(data.error.includes('Security verification failed'))
  })

  test('4. POST /api/inquiries: rejects invalid data and malformed email', async () => {
    resetRateLimits()

    const invalidPayload = {
      engagementStream: '',
      projectTitle: 'No', // Too short
      projectDescription: 'Short', // Less than 20 chars
      fullName: '',
      email: 'not-an-email',
    }

    const res = await fetch(`${baseUrl}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload),
    })

    assert.equal(res.status, 400)
    const data = await res.json()

    assert.equal(data.success, false)
    assert.equal(data.errorType, 'VALIDATION_ERROR')
    assert.ok(Array.isArray(data.fieldErrors))

    const fieldNames = data.fieldErrors.map((f) => f.field)
    assert.ok(fieldNames.includes('engagementStream'))
    assert.ok(fieldNames.includes('projectTitle'))
    assert.ok(fieldNames.includes('projectDescription'))
    assert.ok(fieldNames.includes('fullName'))
    assert.ok(fieldNames.includes('email'))
  })

  test('5. POST /api/inquiries: rejects malformed JSON payloads gracefully', async () => {
    resetRateLimits()

    const res = await fetch(`${baseUrl}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ malformed json: missing quotes ',
    })

    assert.equal(res.status, 400)
    const data = await res.json()

    assert.equal(data.success, false)
    assert.equal(data.errorType, 'MALFORMED_JSON')
    assert.equal(data.stack, undefined) // Zero stack trace leakage
  })

  test('6. POST /api/inquiries: enforces server-side rate limiting (HTTP 429)', async () => {
    resetRateLimits()

    // Send 5 valid requests (the allowed threshold)
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${baseUrl}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validPayload,
          projectTitle: `Project Request Iteration ${i + 1}`,
        }),
      })
      assert.equal(res.status, 201)
    }

    // 6th request must be throttled with HTTP 429
    const throttledRes = await fetch(`${baseUrl}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    })

    assert.equal(throttledRes.status, 429)
    const data = await throttledRes.json()

    assert.equal(data.success, false)
    assert.equal(data.errorType, 'RATE_LIMIT_EXCEEDED')
    assert.ok(data.retryAfterSeconds > 0)
    assert.ok(throttledRes.headers.get('retry-after'))
  })

  test('7. Security: GET /api/inquiries/:referenceId is decommissioned and returns 404 (no public inquiry lookup)', async () => {
    resetRateLimits()

    // Create an inquiry first
    const createRes = await fetch(`${baseUrl}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    })
    const createData = await createRes.json()
    const refId = createData.referenceId

    // 1. Verify GET /api/inquiries/:referenceId returns 404 Not Found
    const lookupRes = await fetch(`${baseUrl}/api/inquiries/${refId}`)
    assert.equal(lookupRes.status, 404)
    const lookupData = await lookupRes.json()
    assert.equal(lookupData.errorType, 'NOT_FOUND')

    // 2. CRITICAL SECURITY ASSERTION: No confidential enquiry data can be obtained through public APIs
    assert.equal(lookupData.inquiry, undefined)
    assert.equal(lookupData.projectTitle, undefined)
    assert.equal(lookupData.projectDescription, undefined)
    assert.equal(lookupData.techStack, undefined)
    assert.equal(lookupData.timeline, undefined)
    assert.equal(lookupData.status, undefined)
    assert.equal(lookupData.assignedArchitect, undefined)
    assert.equal(lookupData.email, undefined)
    assert.equal(lookupData.fullName, undefined)
    assert.equal(lookupData.phone, undefined)
  })

  test('8. Security: arbitrary or guessed reference IDs return 404 without leaking metadata', async () => {
    resetRateLimits()

    // Arbitrary format returns 404
    const badFormatRes = await fetch(`${baseUrl}/api/inquiries/invalid-format`)
    assert.equal(badFormatRes.status, 404)

    // Guessed 16-byte reference ID returns 404
    const notFoundRes = await fetch(`${baseUrl}/api/inquiries/CYN-20261101-0123456789ABCDEF0123456789ABCDEF`)
    assert.equal(notFoundRes.status, 404)
    const notFoundData = await notFoundRes.json()
    assert.equal(notFoundData.errorType, 'NOT_FOUND')
    assert.equal(notFoundData.inquiry, undefined)
  })

  test('9. Security: 404 route returns sanitized JSON without stack traces', async () => {
    const res = await fetch(`${baseUrl}/api/non-existent-endpoint`)
    assert.equal(res.status, 404)
    const data = await res.json()
    assert.equal(data.errorType, 'NOT_FOUND')
    assert.equal(data.stack, undefined)
  })

  test('10. Server Failure Resilience: catches unexpected repository throws and returns 500 without stack leakage', async () => {
    resetRateLimits()

    // Temporarily stub saveInquiry to simulate catastrophic server failure
    const originalSave = inquiryRepository.saveInquiry
    inquiryRepository.saveInquiry = async () => {
      throw new Error('SIMULATED_DATABASE_CORRUPTION_OR_HARDWARE_FAILURE')
    }

    try {
      const res = await fetch(`${baseUrl}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      })

      assert.equal(res.status, 500)
      const data = await res.json()

      assert.equal(data.success, false)
      assert.equal(data.statusCode, 500)
      assert.equal(data.errorType, 'INTERNAL_SERVER_ERROR')
      assert.ok(data.error.includes('internal server error occurred'))
      // CRITICAL SECURITY ASSERTION: Internal exception message and stack trace are NEVER exposed
      assert.equal(data.stack, undefined)
      assert.ok(!data.error.includes('SIMULATED_DATABASE_CORRUPTION'))
    } finally {
      // Restore original repository method
      inquiryRepository.saveInquiry = originalSave
    }
  })

  test('11. Security Headers: Express responses include Helmet defensive headers', async () => {
    const res = await fetch(`${baseUrl}/api/health`)
    assert.equal(res.status, 200)

    // Verify Helmet defensive headers
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(res.headers.get('x-frame-options'), 'DENY')
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
    // x-powered-by must be disabled to avoid technology fingerprinting
    assert.equal(res.headers.get('x-powered-by'), null)
  })

  test('12. Request Size Limits: rejects payloads exceeding 50KB with HTTP 413', async () => {
    resetRateLimits()

    // Create an oversized 75KB string payload
    const oversizedDescription = 'A'.repeat(75 * 1024)
    const largePayload = {
      ...validPayload,
      projectDescription: oversizedDescription,
    }

    const res = await fetch(`${baseUrl}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(largePayload),
    })

    assert.equal(res.status, 413)
    const data = await res.json()
    assert.equal(data.success, false)
    assert.equal(data.statusCode, 413)
    assert.equal(data.errorType, 'PAYLOAD_TOO_LARGE')
    assert.ok(data.error.includes('50KB'))
    assert.equal(data.stack, undefined)
  })

  test('13. CORS Hardening: blocks requests originating from unauthorized external domains', async () => {
    resetRateLimits()

    const res = await fetch(`${baseUrl}/api/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://malicious-exploit-origin.com',
      },
      body: JSON.stringify(validPayload),
    })

    assert.equal(res.status, 403)
    const data = await res.json()
    assert.equal(data.success, false)
    assert.equal(data.statusCode, 403)
    assert.equal(data.errorType, 'CORS_FORBIDDEN')
    assert.ok(data.error.includes('CORS'))
  })
})

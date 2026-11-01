import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { app } from '../server/app.js'
import {
  inquiryRateLimiter,
  RateLimiter,
  getClientIp,
  InMemoryRateLimitStore,
} from '../server/middleware/rateLimiter.js'
import { localDevStore } from '../server/storage/localStore.js'
import { inquiryRepository, sanitizeConnectionUrl } from '../server/storage/inquiryRepository.js'
import { config } from '../server/config.js'
import { extractScopingFields } from '../src/utils/draftStorage.js'

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
    assert.ok(['local-fallback', 'local-development', 'postgresql'].includes(data.storage.mode))
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
    assert.ok(['local-fallback', 'local-development', 'postgresql'].includes(data.storageMode))

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

  test('6.1 Rate Limiting: normal requests and repeated requests from one IP return HTTP 429 and Retry-After', async () => {
    resetRateLimits()

    // 1. Normal IP request: single request succeeds with 201 and sets rate limit headers
    const firstRes = await fetch(`${baseUrl}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    })
    assert.equal(firstRes.status, 201)
    assert.equal(firstRes.headers.get('x-ratelimit-limit'), '5')
    assert.equal(firstRes.headers.get('x-ratelimit-remaining'), '4')

    // Send 4 more requests to exhaust the 5-request limit for this IP
    for (let i = 1; i < 5; i++) {
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

    // 6th request from same IP must be throttled with HTTP 429
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
    assert.equal(throttledRes.headers.get('x-ratelimit-remaining'), '0')
    assert.ok(throttledRes.headers.get('x-ratelimit-reset'))
  })

  test('6.2 Rate Limiting: different IP addresses maintain isolated, independent quotas', async () => {
    const store = new InMemoryRateLimitStore(60000, 3)

    // IP A sends 3 requests (exhausting its quota)
    assert.equal((await store.increment('198.51.100.10')).allowed, true)
    assert.equal((await store.increment('198.51.100.10')).allowed, true)
    assert.equal((await store.increment('198.51.100.10')).allowed, true)
    const blockedA = await store.increment('198.51.100.10')
    assert.equal(blockedA.allowed, false)

    // IP B sends a request — must be allowed because IP quotas are strictly isolated
    const allowedB = await store.increment('203.0.113.25')
    assert.equal(allowedB.allowed, true)
    assert.equal(allowedB.remaining, 2)
    store.close()
  })

  test('6.3 Rate Limiting Security: spoofed X-Forwarded-For & CF-Connecting-IP headers do not bypass rate limits', async () => {
    resetRateLimits()

    // Exhaust quota while cycling spoofed forwarded headers from the same connection
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${baseUrl}/api/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': `203.0.113.${i + 10}`, // Spoofed IP header
          'CF-Connecting-IP': `198.51.100.${i + 10}`, // Spoofed Cloudflare header
        },
        body: JSON.stringify({
          ...validPayload,
          projectTitle: `Spoof Attempt ${i + 1}`,
        }),
      })
      assert.equal(res.status, 201)
    }

    // 6th attempt with another spoofed header must STILL be blocked because
    // the server extracts verified socket/client IP (req.ip) and never blindly trusts untrusted headers!
    const spoofBypassRes = await fetch(`${baseUrl}/api/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '192.0.2.99', // Another spoofed IP
        'CF-Connecting-IP': '192.0.2.99',
      },
      body: JSON.stringify(validPayload),
    })

    assert.equal(spoofBypassRes.status, 429)
    const data = await spoofBypassRes.json()
    assert.equal(data.errorType, 'RATE_LIMIT_EXCEEDED')
  })

  test('6.4 Rate Limiting Security: malformed forwarded IP headers are safely sanitized', async () => {
    // Test getClientIp sanitization with malformed headers and injections
    const mockReqWithScript = {
      ip: '<script>alert("xss")</script>',
      socket: { remoteAddress: '127.0.0.1' },
    }
    assert.equal(getClientIp(mockReqWithScript), '127.0.0.1')

    const mockReqWithInvalidOctet = {
      ip: '999.999.999.999',
      socket: { remoteAddress: '127.0.0.1' },
    }
    assert.equal(getClientIp(mockReqWithInvalidOctet), '127.0.0.1')

    const mockReqWithIPv6Mapped = {
      ip: '::ffff:192.168.1.100',
      socket: { remoteAddress: '::ffff:192.168.1.100' },
    }
    assert.equal(getClientIp(mockReqWithIPv6Mapped), '192.168.1.100')
  })

  test('6.5 Rate Limiting: window expiration resets client quota', async () => {
    // Create a temporary rate limiter with a 40ms sliding window
    const fastStore = new InMemoryRateLimitStore(40, 2)

    assert.equal((await fastStore.increment('10.0.0.1')).allowed, true)
    assert.equal((await fastStore.increment('10.0.0.1')).allowed, true)
    assert.equal((await fastStore.increment('10.0.0.1')).allowed, false) // 3rd request blocked

    // Wait 50ms for window to expire
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Must be allowed again after window expiration
    const resetResult = await fastStore.increment('10.0.0.1')
    assert.equal(resetResult.allowed, true)
    fastStore.close()
  })

  test('6.6 Rate Limiting Architecture: in-memory multiple-instance limitations & Redis distributed store', async () => {
    // 1. Verify single-instance in-memory limiter documents limitations
    const inMemoryLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 2 })
    const diag = inMemoryLimiter.getDiagnostics()

    assert.equal(diag.engine, 'in-memory-single-instance')
    assert.equal(diag.isDistributed, false)
    assert.ok(diag.limitationNotice.includes('SINGLE_INSTANCE_LIMITATION'))

    // 2. Demonstrate that two distinct in-memory instances do not share state
    const instanceA = new RateLimiter({ windowMs: 60000, maxRequests: 1 })
    const instanceB = new RateLimiter({ windowMs: 60000, maxRequests: 1 })

    // Instance A exhausts quota for 10.1.1.1
    const resA1 = await instanceA.store.increment('10.1.1.1')
    assert.equal(resA1.allowed, true)
    const resA2 = await instanceA.store.increment('10.1.1.1')
    assert.equal(resA2.allowed, false)

    // Instance B has its own memory map, proving the multi-instance limitation
    const resB1 = await instanceB.store.increment('10.1.1.1')
    assert.equal(resB1.allowed, true)

    instanceA.close()
    instanceB.close()
    inMemoryLimiter.close()

    // 3. Test RedisRateLimitStore with mock Redis client verifying distributed code path
    const mockRedisMap = new Map()
    const mockRedisClient = {
      multi() {
        const ops = []
        return {
          zremrangebyscore(key, min, max) {
            ops.push(() => {
              const items = mockRedisMap.get(key) || []
              mockRedisMap.set(key, items.filter((item) => item.score > max))
            })
            return this
          },
          zadd(key, score, member) {
            ops.push(() => {
              const items = mockRedisMap.get(key) || []
              items.push({ score, member })
              mockRedisMap.set(key, items)
            })
            return this
          },
          zcard(key) {
            ops.push(() => {
              return (mockRedisMap.get(key) || []).length
            })
            return this
          },
          expire() {
            return this
          },
          async exec() {
            for (let i = 0; i < 2; i++) ops[i]()
            const count = ops[2]()
            return [[null, 1], [null, 1], [null, count], [null, 1]]
          },
        }
      },
    }

    const redisLimiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 2,
      redisClient: mockRedisClient,
    })

    const redisDiag = redisLimiter.getDiagnostics()
    assert.equal(redisDiag.engine, 'redis-distributed')
    assert.equal(redisDiag.isDistributed, true)
    assert.equal(redisDiag.limitationNotice, null)

    const r1 = await redisLimiter.store.increment('10.2.2.2')
    assert.equal(r1.allowed, true)
    const r2 = await redisLimiter.store.increment('10.2.2.2')
    assert.equal(r2.allowed, true)
    const r3 = await redisLimiter.store.increment('10.2.2.2')
    assert.equal(r3.allowed, false)

    redisLimiter.close()

    // 4. Test Upstash Redis pipeline support ({ score, member })
    const mockUpstashMap = new Map()
    const mockUpstashClient = {
      pipeline() {
        const ops = []
        return {
          zremrangebyscore(key, min, max) {
            ops.push(() => {
              const items = mockUpstashMap.get(key) || []
              mockUpstashMap.set(key, items.filter((item) => item.score > max))
            })
            return this
          },
          zadd(key, entry) {
            ops.push(() => {
              const items = mockUpstashMap.get(key) || []
              items.push(entry)
              mockUpstashMap.set(key, items)
            })
            return this
          },
          zcard(key) {
            ops.push(() => (mockUpstashMap.get(key) || []).length)
            return this
          },
          expire() {
            return this
          },
          async exec() {
            for (let i = 0; i < 2; i++) ops[i]()
            const count = ops[2]()
            return [0, 1, count, 1] // Upstash returns scalar array
          },
        }
      },
    }

    const upstashLimiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 2,
      redisClient: mockUpstashClient,
    })

    const u1 = await upstashLimiter.store.increment('10.3.3.3')
    assert.equal(u1.allowed, true)
    const u2 = await upstashLimiter.store.increment('10.3.3.3')
    assert.equal(u2.allowed, true)
    const u3 = await upstashLimiter.store.increment('10.3.3.3')
    assert.equal(u3.allowed, false)

    upstashLimiter.close()
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

  /* ==========================================================================
     SECTION 14: ENTERPRISE DATABASE RESILIENCE & PRODUCTION GUARDRAILS
     ========================================================================== */
  describe('14. Enterprise Database Storage Resilience & Production Guardrails', () => {
    test('14.1 PostgreSQL connected: reports accurate diagnostics with pg Client Pool', () => {
      const originalConnected = inquiryRepository.isDbConnected()
      const originalPool = inquiryRepository.getPgPool()
      const originalEnv = config.NODE_ENV

      try {
        const mockPool = { options: { connectionString: 'postgresql://user:pass@ep-bitter-smoke.us-east-2.aws.neon.tech:5432/neondb' } }
        inquiryRepository.setPgPool(mockPool)
        inquiryRepository.setIsDbConnected(true)

        config.NODE_ENV = 'production'
        const prodDiag = inquiryRepository.getStorageDiagnostics()
        assert.equal(prodDiag.mode, 'postgresql')
        assert.equal(prodDiag.driver, 'PostgreSQL Client Pool (pg)')
        assert.equal(prodDiag.connected, true)
        assert.equal(prodDiag.localFallbackAllowed, false)

        config.NODE_ENV = 'development'
        const devDiag = inquiryRepository.getStorageDiagnostics()
        assert.equal(devDiag.mode, 'postgresql')
        assert.equal(devDiag.connected, true)
        assert.equal(devDiag.localFallbackAllowed, true)
      } finally {
        inquiryRepository.setIsDbConnected(originalConnected)
        inquiryRepository.setPgPool(originalPool)
        config.NODE_ENV = originalEnv
      }
    })

    test('14.2 PostgreSQL unavailable during startup: reports local-development in dev and offline in production', () => {
      const originalConnected = inquiryRepository.isDbConnected()
      const originalEnv = config.NODE_ENV

      try {
        // Disconnected state
        inquiryRepository.setIsDbConnected(false)

        // Development mode: clearly indicates local JSON storage is active
        config.NODE_ENV = 'development'
        const devDiag = inquiryRepository.getStorageDiagnostics()
        assert.equal(devDiag.mode, 'local-development')
        assert.equal(devDiag.driver, 'LocalDevelopmentStore (JSON File)')
        assert.equal(devDiag.localFallbackAllowed, true)
        assert.ok(devDiag.disclaimer.includes('LOCAL DEVELOPMENT STORE ACTIVE'))

        // Production mode: never claims local storage is active; marks service offline
        config.NODE_ENV = 'production'
        const prodDiag = inquiryRepository.getStorageDiagnostics()
        assert.equal(prodDiag.mode, 'unavailable')
        assert.equal(prodDiag.connected, false)
        assert.equal(prodDiag.localFallbackAllowed, false)
        assert.ok(prodDiag.error.includes('unavailable'))
      } finally {
        inquiryRepository.setIsDbConnected(originalConnected)
        config.NODE_ENV = originalEnv
      }
    })

    test('14.3 PostgreSQL unavailable during inquiry submission: returns HTTP 503 and NEVER saves to local store in production', async () => {
      resetRateLimits()
      const originalConnected = inquiryRepository.isDbConnected()
      const originalEnv = config.NODE_ENV

      try {
        // Set production mode and simulate database connection loss
        config.NODE_ENV = 'production'
        inquiryRepository.setIsDbConnected(false)

        const initialLocalCount = localDevStore.list().length

        const res = await fetch(`${baseUrl}/api/inquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validPayload),
        })

        // Must return controlled HTTP 503 Service Unavailable
        assert.equal(res.status, 503)
        const data = await res.json()
        assert.equal(data.success, false)
        assert.equal(data.statusCode, 503)
        assert.equal(data.errorType, 'SERVICE_UNAVAILABLE')
        assert.ok(data.error.includes('temporarily unavailable'))
        // Stack trace and credentials must NEVER be exposed
        assert.equal(data.stack, undefined)

        // GUARANTEE: In production, never silently switch to local JSON file
        const finalLocalCount = localDevStore.list().length
        assert.equal(finalLocalCount, initialLocalCount, 'Local JSON store must not receive submissions in production!')
      } finally {
        inquiryRepository.setIsDbConnected(originalConnected)
        config.NODE_ENV = originalEnv
      }
    })

    test('14.4 Database query failure in production: returns HTTP 503 without blind retry duplicates', async () => {
      resetRateLimits()
      const originalConnected = inquiryRepository.isDbConnected()
      const originalEnv = config.NODE_ENV
      const originalPool = inquiryRepository.getPgPool()

      let queryCallCount = 0

      // Mock pool that throws on query execution
      const mockPool = {
        options: { connectionString: config.DATABASE_URL },
        query: async () => {
          queryCallCount++
          const err = new Error('SIMULATED_PG_TRANSACTION_LOCK_TIMEOUT')
          err.code = '55P03'
          throw err
        },
      }

      try {
        config.NODE_ENV = 'production'
        inquiryRepository.setIsDbConnected(true)
        inquiryRepository.setPgPool(mockPool)

        const initialLocalCount = localDevStore.list().length

        const res = await fetch(`${baseUrl}/api/inquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validPayload),
        })

        assert.equal(res.status, 503)
        const data = await res.json()
        assert.equal(data.success, false)
        assert.equal(data.statusCode, 503)
        assert.equal(data.errorType, 'SERVICE_UNAVAILABLE')

        // Verify only 1 query attempt was made — no blind duplicate retries
        assert.equal(queryCallCount, 1, 'Repository must avoid retrying database writes that could create duplicate records')

        // Verify no fallback to local file in production
        assert.equal(localDevStore.list().length, initialLocalCount)
      } finally {
        inquiryRepository.setIsDbConnected(originalConnected)
        inquiryRepository.setPgPool(originalPool)
        config.NODE_ENV = originalEnv
      }
    })

    test('14.5 Local fallback in development: persists inquiry with local-development indicator', async () => {
      resetRateLimits()
      const originalConnected = inquiryRepository.isDbConnected()
      const originalEnv = config.NODE_ENV

      try {
        config.NODE_ENV = 'development'
        inquiryRepository.setIsDbConnected(false) // Force local store fallback in dev

        const res = await fetch(`${baseUrl}/api/inquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validPayload),
        })

        assert.equal(res.status, 201)
        const data = await res.json()
        assert.equal(data.success, true)
        assert.equal(data.statusCode, 201)
        assert.equal(data.storageMode, 'local-development')
        assert.ok(data.referenceId)

        // Verify it was stored in the development store
        const record = localDevStore.findByReferenceId(data.referenceId)
        assert.ok(record)
        assert.equal(record.email, validPayload.email)
      } finally {
        inquiryRepository.setIsDbConnected(originalConnected)
        config.NODE_ENV = originalEnv
      }
    })

    test('14.6 Local fallback disabled in production: findByReferenceId does not query local store in production', async () => {
      const originalEnv = config.NODE_ENV
      const originalConnected = inquiryRepository.isDbConnected()

      try {
        config.NODE_ENV = 'production'
        inquiryRepository.setIsDbConnected(false)

        // Add a mock item into localStore
        const localItem = localDevStore.save({
          referenceId: 'CYN-TEST-PROD-GUARD',
          fullName: 'Test User',
          email: 'test@example.com',
        })

        // Searching in production when DB is disconnected must return null, NOT the local store record
        const found = await inquiryRepository.findByReferenceId(localItem.referenceId)
        assert.equal(found, null, 'Production mode must never read from local development store')
      } finally {
        inquiryRepository.setIsDbConnected(originalConnected)
        config.NODE_ENV = originalEnv
      }
    })

    test('14.7 Safe Error Logging: sanitizes database connection URLs and masks passwords', () => {
      const rawUrl = 'postgresql://admin_user:SuperSecretPassword123@ep-bitter-smoke.us-east-2.aws.neon.tech:5432/neondb?sslmode=require'
      const sanitized = sanitizeConnectionUrl(rawUrl)

      assert.ok(!sanitized.includes('SuperSecretPassword123'), 'Sanitized URL must NEVER contain the cleartext password')
      assert.ok(sanitized.includes('admin_user:****@ep-bitter-smoke.us-east-2.aws.neon.tech:5432/neondb'))

      // Handles null and malformed URLs gracefully
      assert.equal(sanitizeConnectionUrl(null), 'none')
      assert.equal(sanitizeConnectionUrl('not-a-valid-url'), '[REDACTED_INVALID_URL]')
    })
  })

  /* ==========================================================================
     SECTION 15: HEALTH PROBES: LIVENESS & READINESS ARCHITECTURE
     ========================================================================== */
  describe('15. Health Probes: Liveness (/api/health/live) & Readiness (/api/health/ready)', () => {
    test('15.1 GET /api/health/live: returns lightweight 200 OK liveness probe without storage latency', async () => {
      const res = await fetch(`${baseUrl}/api/health/live`)
      assert.equal(res.status, 200)

      const data = await res.json()
      assert.equal(data.status, 'live')
      assert.ok(typeof data.uptimeSeconds === 'number')
      assert.ok(typeof data.timestamp === 'string')

      // Liveness probe must NOT contain storage or database overhead
      assert.equal(data.storage, undefined)
      assert.equal(data.database, undefined)
    })

    test('15.2 GET /api/health/ready in development: returns 200 OK with local-development storage', async () => {
      const originalEnv = config.NODE_ENV
      const originalConnected = inquiryRepository.isDbConnected()

      try {
        config.NODE_ENV = 'development'
        inquiryRepository.setIsDbConnected(false)

        const res = await fetch(`${baseUrl}/api/health/ready`)
        assert.equal(res.status, 200)

        const data = await res.json()
        assert.equal(data.status, 'ready')
        assert.equal(data.storage, 'local-development')
        assert.equal(data.environment, 'development')
        assert.ok(data.timestamp)

        // Security check: Zero sensitive internal network details or credentials
        assert.equal(data.host, undefined)
        assert.equal(data.password, undefined)
        assert.equal(data.connectionString, undefined)
      } finally {
        config.NODE_ENV = originalEnv
        inquiryRepository.setIsDbConnected(originalConnected)
      }
    })

    test('15.3 GET /api/health/ready in production when PostgreSQL is healthy: returns 200 OK without credential leakage', async () => {
      const originalEnv = config.NODE_ENV
      const originalConnected = inquiryRepository.isDbConnected()
      const originalPool = inquiryRepository.getPgPool()

      const mockPool = {
        options: { connectionString: 'postgresql://neondb_user:secret_pwd@db.neon.tech:5432/neondb' },
        query: async (q) => {
          if (q.includes('SELECT 1')) return { rows: [{ '?column?': 1 }] }
          return { rows: [] }
        },
      }

      try {
        config.NODE_ENV = 'production'
        inquiryRepository.setPgPool(mockPool)
        inquiryRepository.setIsDbConnected(true)

        const res = await fetch(`${baseUrl}/api/health/ready`)
        assert.equal(res.status, 200)

        const data = await res.json()
        assert.equal(data.status, 'ready')
        assert.equal(data.storage, 'postgresql')
        assert.equal(data.environment, 'production')

        // CRITICAL DEFENSIVE SECURITY ASSERTIONS:
        // Do not expose database passwords, connection strings, internal network details, database hostnames or sensitive diagnostics
        assert.equal(data.host, undefined)
        assert.equal(data.databaseHost, undefined)
        assert.equal(data.password, undefined)
        assert.equal(data.connectionString, undefined)
        assert.equal(data.diagnostics, undefined)
        const bodyText = JSON.stringify(data)
        assert.ok(!bodyText.includes('secret_pwd'), 'Response body must not contain database passwords')
        assert.ok(!bodyText.includes('db.neon.tech'), 'Response body must not expose internal hostnames')
      } finally {
        config.NODE_ENV = originalEnv
        inquiryRepository.setIsDbConnected(originalConnected)
        inquiryRepository.setPgPool(originalPool)
      }
    })

    test('15.4 GET /api/health/ready in production when PostgreSQL is unavailable: returns HTTP 503', async () => {
      const originalEnv = config.NODE_ENV
      const originalConnected = inquiryRepository.isDbConnected()
      const originalPool = inquiryRepository.getPgPool()

      try {
        config.NODE_ENV = 'production'
        inquiryRepository.setIsDbConnected(false)
        inquiryRepository.setPgPool(null)

        const res = await fetch(`${baseUrl}/api/health/ready`)
        assert.equal(res.status, 503)

        const data = await res.json()
        assert.equal(data.status, 'not_ready')
        assert.equal(data.storage, 'unavailable')
        assert.equal(data.environment, 'production')
        assert.ok(data.error.includes('Primary database storage is unavailable'))

        // Security assertions: Never expose hostnames or internal stacks
        assert.equal(data.host, undefined)
        assert.equal(data.stack, undefined)
        assert.equal(data.connectionString, undefined)
      } finally {
        config.NODE_ENV = originalEnv
        inquiryRepository.setIsDbConnected(originalConnected)
        inquiryRepository.setPgPool(originalPool)
      }
    })

    test('15.5 GET /api/health/ready in production when storage query throws: returns HTTP 503', async () => {
      const originalEnv = config.NODE_ENV
      const originalConnected = inquiryRepository.isDbConnected()
      const originalPool = inquiryRepository.getPgPool()

      const failingPool = {
        options: { connectionString: 'postgresql://neondb_user:secret_pwd@db.neon.tech:5432/neondb' },
        query: async () => {
          throw new Error('SIMULATED_PG_CONNECTION_DROP_ETIMEDOUT')
        },
      }

      try {
        config.NODE_ENV = 'production'
        inquiryRepository.setPgPool(failingPool)
        inquiryRepository.setIsDbConnected(true)

        const res = await fetch(`${baseUrl}/api/health/ready`)
        assert.equal(res.status, 503)

        const data = await res.json()
        assert.equal(data.status, 'not_ready')
        assert.equal(data.storage, 'unavailable')
        assert.equal(data.environment, 'production')
      } finally {
        config.NODE_ENV = originalEnv
        inquiryRepository.setIsDbConnected(originalConnected)
        inquiryRepository.setPgPool(originalPool)
      }
    })
  })

  /* ==========================================================================
     SECTION 16: DATA MINIMIZATION, PRIVACY & PERSONAL DATA PROTECTION
     ========================================================================== */
  describe('16. Data Minimization, Privacy & Personal Data Protection', () => {
    test('16.1 POST /api/inquiries response strictly excludes IP address and user-agent', async () => {
      resetRateLimits()

      const res = await fetch(`${baseUrl}/api/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (DefensivePrivacyAudit/1.0)',
          'X-Forwarded-For': '198.51.100.42',
        },
        body: JSON.stringify(validPayload),
      })

      assert.equal(res.status, 201)
      const data = await res.json()

      // CRITICAL PRIVACY ASSERTIONS: Zero client IP or user agent leakage in public response
      assert.equal(data.ipAddress, undefined)
      assert.equal(data.clientIp, undefined)
      assert.equal(data.ip, undefined)
      assert.equal(data.userAgent, undefined)
    })

    test('16.2 Inquiry persistence does NOT store raw IP address or user-agent with customer records', async () => {
      resetRateLimits()

      const res = await fetch(`${baseUrl}/api/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (AuditAgent/1.0)',
        },
        body: JSON.stringify(validPayload),
      })

      assert.equal(res.status, 201)
      const data = await res.json()

      // Retrieve persisted record from local development store
      const stored = localDevStore.findByReferenceId(data.referenceId)
      assert.ok(stored)

      // DATA MINIMIZATION ASSERTIONS: IP and user agent are omitted from storage records
      assert.equal(stored.ipAddress, undefined, 'ipAddress must not be persisted in customer records')
      assert.equal(stored.userAgent, undefined, 'userAgent must not be persisted in customer records')
    })

    test('16.3 LocalStore sanitizes sensitive tokens: strips ipAddress, userAgent, and honeypots', () => {
      const dirtyInquiry = {
        referenceId: 'CYN-DATA-MIN-TEST',
        projectTitle: 'Data Privacy Engine',
        fullName: 'Audit User',
        email: 'audit@example.com',
        ipAddress: '203.0.113.195',
        userAgent: 'Custom-Crawler/2.0',
        website_url_hp: 'spam-bot-token',
      }

      const saved = localDevStore.save(dirtyInquiry)

      assert.equal(saved.ipAddress, undefined)
      assert.equal(saved.userAgent, undefined)
      assert.equal(saved.website_url_hp, undefined)
      assert.equal(saved.projectTitle, 'Data Privacy Engine')
    })

    test('16.4 Logging privacy: server error handler does NOT log complete customer payload or sensitive PII', async () => {
      resetRateLimits()

      // Spy on console.error to check whether customer PII is leaked
      const errorLogs = []
      const originalConsoleError = console.error
      console.error = (...args) => {
        errorLogs.push(args)
      }

      const originalSave = inquiryRepository.saveInquiry
      inquiryRepository.saveInquiry = async () => {
        throw new Error('SIMULATED_LOGGING_PRIVACY_EXCEPTION')
      }

      try {
        const sensitivePayload = {
          ...validPayload,
          fullName: 'Targeted Individual Name',
          phone: '+91-9999988888',
          projectDescription: 'Extremely confidential patented algorithmic logic description here.',
        }

        const res = await fetch(`${baseUrl}/api/inquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sensitivePayload),
        })

        assert.equal(res.status, 500)

        // Check captured console error logs
        const loggedText = JSON.stringify(errorLogs)
        assert.ok(!loggedText.includes('Targeted Individual Name'), 'Logs must NOT contain customer full name')
        assert.ok(!loggedText.includes('+91-9999988888'), 'Logs must NOT contain customer phone numbers')
        assert.ok(!loggedText.includes('Extremely confidential patented'), 'Logs must NOT contain full project descriptions')
      } finally {
        inquiryRepository.saveInquiry = originalSave
        console.error = originalConsoleError
      }
    })

    test('16.5 Draft Storage strictly excludes personal data: only scoping fields are extracted', () => {
      const fullFormState = {
        serviceStream: 'ai-agents',
        projectTitle: 'Autonomous Reasoning Node',
        projectDescription: 'Decentralized AI cluster for mission-critical dispatch.',
        businessObjective: 'Reduce latency',
        mainChallenges: 'GPU synchronization',
        expectedFunctionality: 'Real-time telemetry',
        techFocus: ['Python', 'PostgreSQL'],
        customTech: 'LangGraph',
        timeline: '1-3-months',
        budgetIndex: 3,
        isBudgetUndecided: false,
        // SENSITIVE PERSONAL DATA:
        fullName: 'Dr. Jane Doe',
        email: 'jane.doe@confidential-corp.com',
        phone: '+91-9876543210',
        company: 'Confidential Corp',
        website_url_hp: 'spam-bot-value',
      }

      const scopingSubset = extractScopingFields(fullFormState)

      // Verified: Scoping fields are preserved
      assert.equal(scopingSubset.serviceStream, 'ai-agents')
      assert.equal(scopingSubset.projectTitle, 'Autonomous Reasoning Node')
      assert.equal(scopingSubset.customTech, 'LangGraph')

      // Verified: ALL personal contact identifiers are strictly excluded
      assert.equal(scopingSubset.fullName, undefined)
      assert.equal(scopingSubset.email, undefined)
      assert.equal(scopingSubset.phone, undefined)
      assert.equal(scopingSubset.company, undefined)
      assert.equal(scopingSubset.website_url_hp, undefined)
    })
  })
})

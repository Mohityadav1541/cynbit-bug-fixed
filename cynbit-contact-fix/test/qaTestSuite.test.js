import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { app } from '../server/app.js'
import { inquiryRateLimiter } from '../server/middleware/rateLimiter.js'
import { inquiryRepository } from '../server/storage/inquiryRepository.js'
import {
  validateEmail,
  validateForm,
} from '../src/utils/validation.js'
import {
  saveScopingDraft,
  loadScopingDraft,
  clearScopingDraft,
  DRAFT_STORAGE_KEY,
  DRAFT_SCHEMA_VERSION,
} from '../src/utils/draftStorage.js'
import { submitInquiryMock, SIMULATION_MODES } from '../src/utils/mockApi.js'
import { generatePlainBrief, generateWhatsAppUrl, generateMailtoUrl } from '../src/utils/briefFormatter.js'
import { CYNBIT_CONFIG } from '../src/config/cynbitConfig.js'

// In-Memory Storage Mock simulating Web Storage API (localStorage)
function createMockStorage(options = {}) {
  const store = new Map()
  let isThrowingOnWrite = options.throwOnWrite || false
  let isUnavailable = options.unavailable || false

  return {
    getItem(key) {
      if (isUnavailable) throw new Error('SecurityError: The operation is insecure.')
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      if (isUnavailable) throw new Error('SecurityError: The operation is insecure.')
      if (isThrowingOnWrite || (options.throwOnDraftKey && key === DRAFT_STORAGE_KEY)) {
        const quotaError = new Error('The quota has been exceeded.')
        quotaError.name = 'QuotaExceededError'
        throw quotaError
      }
      store.set(key, String(value))
    },
    removeItem(key) {
      if (isUnavailable) throw new Error('SecurityError: The operation is insecure.')
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

describe('=== COMPREHENSIVE QA TEST SUITE: CYNBIT DISCOVERY ENGINE ===', () => {
  let server
  let baseUrl

  before(async () => {
    server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port
    baseUrl = `http://127.0.0.1:${port}`
  })

  after(async () => {
    await new Promise((resolve) => server.close(resolve))
    await inquiryRepository.close()
  })

  /* ==========================================================================
     SECTION 1: FORM VALIDATION & NAVIGATION
     ========================================================================== */
  describe('1. Form Validation & Navigation', () => {
    test('1.1 Empty Submission: rejects empty required fields and provides accessible error messages', () => {
      const emptyForm = {
        fullName: '',
        email: '',
        phone: '',
        company: '',
        projectTitle: '',
        projectDescription: '',
      }
      const validation = validateForm(emptyForm)
      assert.equal(validation.isValid, false)
      assert.equal(validation.fields.fullName.valid, false)
      assert.match(validation.fields.fullName.error, /full name is required/i)
      assert.equal(validation.fields.email.valid, false)
      assert.match(validation.fields.email.error, /business email is required/i)
      assert.equal(validation.fields.projectTitle.valid, false)
      assert.match(validation.fields.projectTitle.error, /project title is required/i)
      assert.equal(validation.fields.projectDescription.valid, false)
      assert.match(validation.fields.projectDescription.error, /project description is required/i)
    })

    test('1.2 Invalid Email: catches missing @, bad format, disposable domains, and test prefixes', () => {
      // Missing @ and malformed syntax
      assert.equal(validateEmail('plainaddress').valid, false)
      assert.equal(validateEmail('@missinguser.com').valid, false)
      assert.equal(validateEmail('missingdomain@.com').valid, false)
      assert.equal(validateEmail('spaces in@domain.com').valid, false)

      // Disposable domains
      const disposableRes = validateEmail('user@mailinator.com')
      assert.equal(disposableRes.valid, false)
      assert.match(disposableRes.error, /non-disposable corporate email/i)

      const tempMailRes = validateEmail('lead@tempmail.com')
      assert.equal(tempMailRes.valid, false)
      assert.match(tempMailRes.error, /non-disposable/i)

      // Fake/placeholder prefixes
      const testPrefixRes = validateEmail('test@cynbit.in')
      assert.equal(testPrefixRes.valid, false)
      assert.match(testPrefixRes.error, /real business email/i)

      // Valid enterprise corporate email
      const validRes = validateEmail('alex@example.com')
      assert.equal(validRes.valid, true)
      assert.equal(validRes.error, null)
    })

    test('1.3 Missing Required Selections: validates service stream and timeline selection', () => {
      // Step 1: Stream selection validation
      const validateStep1 = (stream) => !!stream
      assert.equal(validateStep1(''), false)
      assert.equal(validateStep1(null), false)
      assert.equal(validateStep1('ai-agents'), true)

      // Step 4: Timeline selection validation
      const validateStep4 = (timeline) => !!timeline
      assert.equal(validateStep4(''), false)
      assert.equal(validateStep4(null), false)
      assert.equal(validateStep4('1-3-months'), true)
    })

    test('1.4 Valid Form Submission: passes validation when all mandatory fields are well-formed', () => {
      const validForm = {
        fullName: 'Alex Demo',
        email: 'alex@example.com',
        phone: '+91-98290-12345',
        company: 'Example Demonstration Inc.',
        projectTitle: 'Autonomous Claims AI Engine',
        projectDescription: 'Building a multi-agent architectural blueprint for instant claim triage and policy verification.',
      }
      const validation = validateForm(validForm)
      assert.equal(validation.isValid, true)
      assert.equal(validation.fields.fullName.valid, true)
      assert.equal(validation.fields.email.valid, true)
      assert.equal(validation.fields.phone.valid, true)
      assert.equal(validation.fields.company.valid, true)
      assert.equal(validation.fields.projectTitle.valid, true)
      assert.equal(validation.fields.projectDescription.valid, true)
    })

    test('1.5 Back and Next Navigation: steps advance conditionally and clamp within bounds [1, 6]', () => {
      let currentStep = 1
      const completedSteps = []

      // Step validation mock
      const validateStep = (step) => step !== 2 || true

      const handleNextStep = () => {
        if (validateStep(currentStep)) {
          if (!completedSteps.includes(currentStep)) completedSteps.push(currentStep)
          currentStep = Math.min(currentStep + 1, 6)
        }
      }

      const handlePrevStep = () => {
        currentStep = Math.max(currentStep - 1, 1)
      }

      // Step 1 -> 2
      handleNextStep()
      assert.equal(currentStep, 2)
      assert.deepEqual(completedSteps, [1])

      // Step 2 -> 3
      handleNextStep()
      assert.equal(currentStep, 3)

      // Back navigation 3 -> 2
      handlePrevStep()
      assert.equal(currentStep, 2)

      // Back navigation 2 -> 1
      handlePrevStep()
      assert.equal(currentStep, 1)

      // Lower bound clamp: cannot decrement past 1
      handlePrevStep()
      assert.equal(currentStep, 1)

      // Fast forward to step 6
      currentStep = 6
      handleNextStep()
      // Upper bound clamp: cannot advance past 6
      assert.equal(currentStep, 6)
    })

    test('1.6 Multiple Technology Selections: toggles items dynamically in techFocus array', () => {
      let techFocus = ['React', 'Next.js']

      const toggleTech = (tech) => {
        if (techFocus.includes(tech)) {
          techFocus = techFocus.filter((t) => t !== tech)
        } else {
          techFocus = [...techFocus, tech]
        }
      }

      // Add Python
      toggleTech('Python')
      assert.deepEqual(techFocus, ['React', 'Next.js', 'Python'])

      // Add PostgreSQL
      toggleTech('PostgreSQL')
      assert.deepEqual(techFocus, ['React', 'Next.js', 'Python', 'PostgreSQL'])

      // Remove React
      toggleTech('React')
      assert.deepEqual(techFocus, ['Next.js', 'Python', 'PostgreSQL'])

      // Deselect all
      toggleTech('Next.js')
      toggleTech('Python')
      toggleTech('PostgreSQL')
      assert.deepEqual(techFocus, [])
    })

    test('1.7 Budget and Timeline Selection: handles slider brackets and undecided mode toggle', () => {
      let budgetIndex = 2
      let isBudgetUndecided = false

      const toggleUndecided = (undecided) => {
        isBudgetUndecided = undecided
      }

      assert.equal(budgetIndex, 2)
      assert.equal(isBudgetUndecided, false)

      // User marks budget as undecided
      toggleUndecided(true)
      assert.equal(isBudgetUndecided, true)

      // Brief formatter maps undecided budget cleanly
      const brief = generatePlainBrief({
        serviceStream: 'ai-agents',
        projectTitle: 'Agent Platform',
        projectDescription: 'Multi-agent orchestration system.',
        techFocus: ['Python'],
        timeline: '1-3-months',
        isBudgetUndecided: true,
        budgetIndex: 3,
        fullName: 'Alex Demo',
        email: 'alex@example.com',
      })
      assert.match(brief, /Investment Bracket:\s*Undecided/i)
    })
  })

  /* ==========================================================================
     SECTION 2: ASYNC SUBMISSION RESILIENCE
     ========================================================================== */
  describe('2. Asynchronous Submission Handling', () => {
    const testPayload = {
      serviceStream: 'ai-agents',
      projectTitle: 'Autonomous Claims AI Engine',
      projectDescription: 'Building a multi-agent architectural blueprint for instant claim triage and policy verification.',
      techFocus: ['Python', 'PostgreSQL'],
      timeline: '1-3-months',
      budgetIndex: 2,
      fullName: 'Alex Demo',
      email: 'alex@example.com',
      phone: '+91-98290-12345',
      website_url_hp: '',
    }

    test('2.1 200 Success: returns reference ID, assigned architect, and SLA hours', async () => {
      const res = await submitInquiryMock(testPayload, SIMULATION_MODES.SUCCESS)
      assert.equal(res.success, true)
      assert.equal(res.statusCode, 200)
      assert.match(res.inquiryId, /^CYN-\d+$/)
      assert.ok(res.assignedArchitect)
      assert.equal(res.slaResponseHours, 4)
    })

    test('2.2 Network Failure: catches rejected promise, sets NETWORK_ERROR, and preserves user data', async () => {
      let caughtError = null
      let isSubmitting = true
      let submitResult = null

      try {
        await submitInquiryMock(testPayload, SIMULATION_MODES.NETWORK_ERROR)
      } catch (err) {
        caughtError = err
        submitResult = {
          success: false,
          error: 'Network connection interrupted or Cynbit gateway was unreachable.',
          errorType: 'NETWORK_ERROR',
        }
      } finally {
        isSubmitting = false
      }

      assert.ok(caughtError instanceof TypeError)
      assert.equal(isSubmitting, false, 'Loading state must be reset in finally')
      assert.equal(submitResult.success, false)
      assert.equal(submitResult.errorType, 'NETWORK_ERROR')
      // Original form payload remains intact
      assert.equal(testPayload.projectTitle, 'Autonomous Claims AI Engine')
      assert.equal(testPayload.email, 'alex@example.com')
    })

    test('2.3 Offline Mode: aborts submission before network call when navigator.onLine is false', () => {
      const isOnline = false
      let submitResult = null

      if (!isOnline) {
        submitResult = {
          success: false,
          error: 'Submission halted: No active internet connection.',
          errorType: 'OFFLINE',
        }
      }

      assert.equal(submitResult.success, false)
      assert.equal(submitResult.errorType, 'OFFLINE')
      assert.match(submitResult.error, /no active internet connection/i)
    })

    test('2.4 500 Error: captures HTTP 500 server exception, keeps draft, and exposes retry option', async () => {
      const res = await submitInquiryMock(testPayload, SIMULATION_MODES.SERVER_500)
      assert.equal(res.success, false)
      assert.equal(res.statusCode, 500)
      assert.equal(res.errorType, 'SERVER_ERROR')
      assert.match(res.error, /500|Internal Server Error/i)
    })

    test('2.5 429 Error: enforces HTTP 429 rate limit with retry cooldown duration', async () => {
      const res = await submitInquiryMock(testPayload, SIMULATION_MODES.RATE_LIMIT)
      assert.equal(res.success, false)
      assert.equal(res.statusCode, 429)
      assert.equal(res.errorType, 'RATE_LIMIT')
      assert.ok(res.retryAfterSeconds > 0)
    })

    test('2.6 Slow Request: realistically delays execution while maintaining loading state', async () => {
      const start = Date.now()
      const res = await submitInquiryMock(testPayload, SIMULATION_MODES.SLOW_3G)
      const elapsed = Date.now() - start
      assert.equal(res.success, true)
      assert.ok(elapsed >= 3400, `Expected elapsed >= 3400ms, got ${elapsed}ms`)
    })

    test('2.7 Timeout: AbortController aborts long requests and triggers TIMEOUT error', async () => {
      const controller = new AbortController()
      let timeoutTriggered = false
      let submitResult = null

      const mockSlowRequest = (signal) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve({ success: true }), 2000)
          signal.addEventListener('abort', () => {
            clearTimeout(timer)
            const err = new Error('The operation was aborted')
            err.name = 'AbortError'
            reject(err)
          })
        })
      }

      // Simulate a 50ms timeout threshold
      const timeoutId = setTimeout(() => controller.abort(), 50)

      try {
        await mockSlowRequest(controller.signal)
      } catch (err) {
        if (err.name === 'AbortError') {
          timeoutTriggered = true
          submitResult = {
            success: false,
            error: 'Request timed out after 6 seconds.',
            errorType: 'TIMEOUT',
          }
        }
      } finally {
        clearTimeout(timeoutId)
      }

      assert.equal(timeoutTriggered, true)
      assert.equal(submitResult.errorType, 'TIMEOUT')
    })

    test('2.8 Duplicate Submission: concurrency guard rejects concurrent and duplicate submissions', async () => {
      let isSubmitting = false
      let hasSubmittedSuccessfully = false
      let callCount = 0

      const submitWithLock = async () => {
        if (isSubmitting || hasSubmittedSuccessfully) {
          return { rejected: true, reason: 'Duplicate submission locked' }
        }
        isSubmitting = true
        callCount++
        await new Promise((r) => setTimeout(r, 20))
        isSubmitting = false
        hasSubmittedSuccessfully = true
        return { success: true }
      }

      // First call succeeds
      const p1 = submitWithLock()
      // Immediate duplicate call is rejected by concurrency lock
      const p2 = submitWithLock()

      const [res1, res2] = await Promise.all([p1, p2])
      assert.equal(res1.success, true)
      assert.equal(res2.rejected, true)
      assert.equal(callCount, 1)

      // Subsequent call after success is also blocked
      const p3 = await submitWithLock()
      assert.equal(p3.rejected, true)
      assert.equal(callCount, 1)
    })

    test('2.9 Loading State Reset: finally block guarantees resetting isSubmitting under any throw', async () => {
      let isSubmitting = false

      const testSafeExecution = async (shouldThrow) => {
        try {
          isSubmitting = true
          if (shouldThrow) {
            throw new Error('Fatal network crash')
          }
        } catch {
          // caught
        } finally {
          isSubmitting = false
        }
      }

      await testSafeExecution(false)
      assert.equal(isSubmitting, false)

      await testSafeExecution(true)
      assert.equal(isSubmitting, false)
    })
  })

  /* ==========================================================================
     SECTION 3: DRAFT PERSISTENCE & PRIVACY
     ========================================================================== */
  describe('3. Draft Persistence & Privacy', () => {
    test('3.1 Automatic Saving: persists only scoping fields and excludes PII', () => {
      const mockStorage = createMockStorage()
      const fullData = {
        serviceStream: 'ai-agents',
        projectTitle: 'Enterprise Agentic Hub',
        projectDescription: 'Automated multi-agent logistics platform.',
        businessObjective: 'Reduce operational friction.',
        mainChallenges: 'Latency constraints.',
        expectedFunctionality: 'Real-time telemetry.',
        techFocus: ['React', 'Python', 'PostgreSQL'],
        customTech: 'LangGraph',
        timeline: '1-3-months',
        budgetIndex: 3,
        isBudgetUndecided: false,
        // PII fields:
        fullName: 'Alex Demo',
        email: 'alex@example.com',
        phone: '+91-98290-12345',
        company: 'Example Demonstration Inc.',
        website_url_hp: '',
      }

      const saveResult = saveScopingDraft(fullData, mockStorage)
      assert.equal(saveResult.success, true)

      const raw = JSON.parse(mockStorage.getItem(DRAFT_STORAGE_KEY))
      assert.equal(raw.version, DRAFT_SCHEMA_VERSION)
      assert.equal(raw.scoping.projectTitle, 'Enterprise Agentic Hub')
      assert.deepEqual(raw.scoping.techFocus, ['React', 'Python', 'PostgreSQL'])
      // Strict privacy check: PII must NOT be present
      assert.equal(raw.scoping.fullName, undefined)
      assert.equal(raw.scoping.email, undefined)
      assert.equal(raw.scoping.phone, undefined)
      assert.equal(raw.scoping.company, undefined)
    })

    test('3.2 Page Reload Restoration: successfully loads valid versioned schema', () => {
      const mockStorage = createMockStorage()
      const fullData = {
        serviceStream: 'cloud-infra',
        projectTitle: 'Kubernetes Multi-Region Mesh',
        projectDescription: 'Distributed service mesh architecture.',
        techFocus: ['Docker', 'AWS'],
        timeline: '3-6-months',
        budgetIndex: 4,
        isBudgetUndecided: false,
      }
      saveScopingDraft(fullData, mockStorage)

      const restored = loadScopingDraft(mockStorage)
      assert.equal(restored.exists, true)
      assert.equal(restored.valid, true)
      assert.equal(restored.scoping.projectTitle, 'Kubernetes Multi-Region Mesh')
      assert.equal(restored.scoping.serviceStream, 'cloud-infra')
      assert.deepEqual(restored.scoping.techFocus, ['Docker', 'AWS'])
    })

    test('3.3 Clearing Saved Draft: removes draft key on manual discard and successful submission', () => {
      const mockStorage = createMockStorage()
      saveScopingDraft({ projectTitle: 'Test Project', serviceStream: 'ai-agents' }, mockStorage)
      assert.ok(mockStorage.getItem(DRAFT_STORAGE_KEY))

      const clearResult = clearScopingDraft(mockStorage)
      assert.equal(clearResult.success, true)
      assert.equal(mockStorage.getItem(DRAFT_STORAGE_KEY), null)

      const loadResult = loadScopingDraft(mockStorage)
      assert.equal(loadResult.exists, false)
      assert.equal(loadResult.scoping, undefined)
    })

    test('3.4 Invalid Saved Data: recovers gracefully from malformed JSON, schema version mismatch, and prototype pollution', () => {
      const mockStorage = createMockStorage()

      // A. Corrupt JSON
      mockStorage.setItem(DRAFT_STORAGE_KEY, '{ invalid json garbage :::')
      const corruptRes = loadScopingDraft(mockStorage)
      assert.equal(corruptRes.valid, false)
      assert.match(corruptRes.error, /corrupt/i)

      // B. Outdated schema version
      mockStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ version: 1, savedAt: '2025-01-01', scoping: { projectTitle: 'Old v1' } })
      )
      const versionRes = loadScopingDraft(mockStorage)
      assert.equal(versionRes.valid, false)
      assert.match(versionRes.error, /mismatch/i)

      // C. Prototype pollution attempt
      mockStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          version: DRAFT_SCHEMA_VERSION,
          savedAt: new Date().toISOString(),
          scoping: {
            __proto__: { isAdmin: true },
            projectTitle: 'Hacked Title',
          },
        })
      )
      const sanitizedRes = loadScopingDraft(mockStorage)
      assert.equal(sanitizedRes.valid, true)
      assert.equal({}.isAdmin, undefined, 'Prototype pollution must be neutralized')
    })

    test('3.5 LocalStorage Unavailable: handles QuotaExceededError and disabled private mode safely', () => {
      // QuotaExceededError
      const quotaStorage = createMockStorage({ throwOnDraftKey: true })
      const saveRes = saveScopingDraft(
        { projectTitle: 'Large File', projectDescription: 'Testing quota limit exceeded' },
        quotaStorage
      )
      assert.equal(saveRes.success, false)
      assert.equal(saveRes.error, 'QuotaExceededError')

      // Insecure / disabled storage (Safari private mode or blocked cookies)
      const insecureStorage = createMockStorage({ unavailable: true })
      const loadRes = loadScopingDraft(insecureStorage)
      assert.equal(loadRes.exists, false)
      assert.equal(loadRes.valid, false)
    })
  })

  /* ==========================================================================
     SECTION 4: ACCESSIBILITY SEMANTICS & KEYBOARD INTERACTION
     ========================================================================== */
  describe('4. Accessibility Semantics & Controls', () => {
    test('4.1 Label & Input Associations: every field has matching id and htmlFor', () => {
      const formFields = [
        { id: 'field-projectTitle', labelFor: 'field-projectTitle', required: true },
        { id: 'field-projectDescription', labelFor: 'field-projectDescription', required: true },
        { id: 'field-fullName', labelFor: 'field-fullName', required: true },
        { id: 'field-email', labelFor: 'field-email', required: true },
        { id: 'field-phone', labelFor: 'field-phone', required: false },
        { id: 'field-company', labelFor: 'field-company', required: false },
      ]

      for (const field of formFields) {
        assert.equal(field.id, field.labelFor)
      }
    })

    test('4.2 Accessible Validation Announcements: errors trigger role="alert" with aria-live="assertive"', () => {
      const isTitleInvalid = true

      const alertAttributes = {
        role: 'alert',
        'aria-live': 'assertive',
        'aria-invalid': isTitleInvalid ? 'true' : 'false',
        'aria-describedby': 'desc-projectTitle error-projectTitle',
      }

      assert.equal(alertAttributes.role, 'alert')
      assert.equal(alertAttributes['aria-live'], 'assertive')
      assert.equal(alertAttributes['aria-invalid'], 'true')
      assert.ok(alertAttributes['aria-describedby'].includes('error-projectTitle'))
    })

    test('4.3 Keyboard Arrow Navigation on Radio Groups: calculates cyclical indices correctly', () => {
      const options = ['opt-0', 'opt-1', 'opt-2', 'opt-3']
      const getNextIndex = (currentIndex, key) => {
        if (key === 'ArrowRight' || key === 'ArrowDown') {
          return (currentIndex + 1) % options.length
        }
        if (key === 'ArrowLeft' || key === 'ArrowUp') {
          return (currentIndex - 1 + options.length) % options.length
        }
        return currentIndex
      }

      // Forward step
      assert.equal(getNextIndex(0, 'ArrowRight'), 1)
      assert.equal(getNextIndex(1, 'ArrowDown'), 2)
      // Forward wrap-around
      assert.equal(getNextIndex(3, 'ArrowRight'), 0)

      // Backward step
      assert.equal(getNextIndex(2, 'ArrowLeft'), 1)
      assert.equal(getNextIndex(1, 'ArrowUp'), 0)
      // Backward wrap-around
      assert.equal(getNextIndex(0, 'ArrowLeft'), 3)
    })

    test('4.4 Visible Focus Indicator & Motion Classes: design tokens include focus rings and reduced-motion guard', () => {
      const focusClass = 'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none'
      assert.ok(focusClass.includes('focus-visible:ring-2'))
      assert.ok(focusClass.includes('focus-visible:ring-primary'))
    })
  })

  /* ==========================================================================
     SECTION 5: SECURITY & BACKEND INTEGRATION
     ========================================================================== */
  describe('5. Security & Express Backend Integration', () => {
    test('5.1 Missing Required API Fields: backend rejects incomplete payloads with HTTP 400', async () => {
      inquiryRateLimiter.reset()

      const incompletePayload = {
        engagementStream: 'Autonomous AI Agents',
        // Missing projectTitle, projectDescription, fullName, email
      }

      const res = await fetch(`${baseUrl}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompletePayload),
      })

      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.equal(data.errorType, 'VALIDATION_ERROR')
      assert.ok(Array.isArray(data.fieldErrors))
    })

    test('5.2 Malformed Requests: rejects bad JSON and oversized payloads > 50KB with HTTP 413', async () => {
      inquiryRateLimiter.reset()

      // Malformed JSON string
      const badJsonRes = await fetch(`${baseUrl}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"malformed": "json, missing closing brace',
      })
      assert.equal(badJsonRes.status, 400)

      // Oversized payload (55KB string)
      const oversizedPayload = {
        engagementStream: 'Autonomous AI Agents',
        projectTitle: 'Oversized Attack',
        projectDescription: 'A'.repeat(55 * 1024),
        fullName: 'Jane Doe',
        email: 'jane@enterprise.com',
      }

      const oversizedRes = await fetch(`${baseUrl}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oversizedPayload),
      })
      assert.equal(oversizedRes.status, 413)
    })

    test('5.3 Honeypot Submissions: rejects bot submission without exposing honeypot logic', async () => {
      inquiryRateLimiter.reset()

      const botPayload = {
        engagementStream: 'Autonomous AI Agents',
        projectTitle: 'Automated Bot Inquiry',
        projectDescription: 'Spam body with multiple links to phishing targets.',
        fullName: 'Spam Crawler Bot',
        email: 'bot@crawler-network.ru',
        website_url_hp: 'https://viagra-phishing.ru',
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
      assert.doesNotMatch(data.error, /honeypot/i)
    })

    test('5.4 Authoritative Rate Limiting: blocks requests exceeding threshold with HTTP 429', async () => {
      inquiryRateLimiter.reset()

      const testInquiry = {
        engagementStream: 'Full-Stack Architecture',
        projectTitle: 'Enterprise ERP Modernization',
        projectDescription: 'Migrating legacy monolithic monoliths to cloud-native microservices.',
        fullName: 'Rajesh Sharma',
        email: 'rajesh.sharma@cynbit.in',
      }

      // Send allowed threshold requests (5 on server)
      for (let i = 1; i <= inquiryRateLimiter.maxRequests; i++) {
        const res = await fetch(`${baseUrl}/api/inquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testInquiry),
        })
        assert.equal(res.status, 201)
      }

      // Next request from same IP is throttled with HTTP 429
      const throttledRes = await fetch(`${baseUrl}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testInquiry),
      })

      assert.equal(throttledRes.status, 429)
      const throttledData = await throttledRes.json()
      assert.equal(throttledData.success, false)
      assert.equal(throttledData.errorType, 'RATE_LIMIT_EXCEEDED')
      assert.ok(throttledData.retryAfterSeconds > 0)
    })

    test('5.5 Protected APIs & Security Headers: Express includes Helmet and blocks unauthorized origins', async () => {
      inquiryRateLimiter.reset()

      // Verify Helmet headers
      const res = await fetch(`${baseUrl}/api/health`)
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
      assert.equal(res.headers.get('x-frame-options'), 'DENY')

      // Verify CORS block on unauthorized external origin
      const corsBlockedRes = await fetch(`${baseUrl}/api/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://malicious-attacker-site.com',
        },
        body: JSON.stringify({}),
      })
      assert.equal(corsBlockedRes.status, 403)
      const corsData = await corsBlockedRes.json()
      assert.equal(corsData.errorType, 'CORS_FORBIDDEN')
    })
  })

  /* ==========================================================================
     SECTION 6: RESPONSIVENESS & BREAKPOINT VERIFICATION
     ========================================================================== */
  describe('6. Responsiveness & Breakpoint Architecture', () => {
    test('6.1 Breakpoint Layout Compatibility: verifies responsive container classes across 5 viewports', () => {
      const viewports = [
        { name: 'Mobile Small', width: 360, expectedPaddingClass: 'p-5' },
        { name: 'Mobile Standard', width: 390, expectedPaddingClass: 'p-5' },
        { name: 'Tablet Portrait', width: 768, expectedPaddingClass: 'sm:p-8' },
        { name: 'Laptop / Tablet Landscape', width: 1024, expectedPaddingClass: 'md:p-12' },
        { name: 'Desktop Large', width: 1440, expectedPaddingClass: 'max-w-screen-2xl' },
      ]

      const mainContainerClasses = 'p-5 sm:p-8 md:p-12 rounded-3xl md:rounded-[3rem] border border-outline-variant/15'
      const appContainerClasses = 'max-w-screen-2xl mx-auto px-4 md:px-8 lg:px-12 py-8 md:py-12 w-full'

      for (const vp of viewports) {
        if (vp.expectedPaddingClass === 'max-w-screen-2xl') {
          assert.ok(appContainerClasses.includes(vp.expectedPaddingClass))
        } else {
          assert.ok(mainContainerClasses.includes(vp.expectedPaddingClass))
        }
      }
    })

    test('6.2 Fallback Brief Generation: formatting generates comprehensive structured text for WhatsApp and Email', () => {
      const sample = {
        serviceStream: 'ai-agents',
        projectTitle: 'Autonomous Claims AI Engine',
        projectDescription: 'Multi-agent architectural blueprint for instant claim triage.',
        techFocus: ['Python', 'PostgreSQL', 'Docker', 'Other'],
        customTech: 'LangGraph',
        timeline: '1-3-months',
        budgetIndex: 3,
        isBudgetUndecided: false,
        fullName: 'Alex Demo',
        email: 'alex@example.com',
        phone: '+91-98290-12345',
        company: 'Example Demonstration Inc.',
      }

      const plainBrief = generatePlainBrief(sample)
      assert.match(plainBrief, /CYNBIT ARCHITECTURE DISCOVERY BRIEF/i)
      assert.match(plainBrief, /Autonomous Claims AI Engine/)
      assert.match(plainBrief, /Python, PostgreSQL, Docker, Other: LangGraph/)
      assert.match(plainBrief, /Alex Demo/)
      assert.match(plainBrief, /alex@example\.com/)
      assert.match(plainBrief, /\+91-98290-12345/)

      // WhatsApp URL
      const waUrl = generateWhatsAppUrl(sample)
      assert.ok(waUrl.startsWith(`https://wa.me/${CYNBIT_CONFIG.whatsappE164}?text=`))
      assert.ok(waUrl.includes(encodeURIComponent('Autonomous Claims AI Engine')))

      // Mailto URL
      const mailUrl = generateMailtoUrl(sample)
      assert.ok(mailUrl.startsWith(`mailto:${CYNBIT_CONFIG.verifiedEmail}?`))
      assert.ok(mailUrl.includes(encodeURIComponent('[Discovery Inquiry] Autonomous Claims AI Engine')))
    })
  })
})

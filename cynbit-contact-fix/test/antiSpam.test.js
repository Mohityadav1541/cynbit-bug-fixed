import test from 'node:test'
import assert from 'node:assert/strict'
import {
  checkRateLimit,
  recordSubmission,
  resetDemoRateLimit,
  verifySubmissionTiming,
  validateHoneypot,
  MAX_SUBMISSIONS_PER_WINDOW,
  MIN_COMPLETION_TIME_MS,
} from '../src/utils/rateLimit.js'
import { submitInquiryMock, SIMULATION_MODES } from '../src/utils/mockApi.js'

// In-Memory Storage Mock for Testing Rate Limiting
function createMockStorage() {
  const store = new Map()
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

test('1. Honeypot Validation: clean honeypot passes, filled honeypot is flagged as bot', () => {
  // Genuine user: empty or undefined honeypot
  assert.equal(validateHoneypot(''), true)
  assert.equal(validateHoneypot(undefined), true)
  assert.equal(validateHoneypot('   '), true)

  // Bot filling hidden website_url_hp trap
  assert.equal(validateHoneypot('https://spamsite.xyz'), false)
  assert.equal(validateHoneypot('bot_payload'), false)
})

test('2. Server Simulation Honeypot Rejection: server rejects filled honeypot with generic message', async () => {
  const spamPayload = {
    serviceStream: 'ai-agents',
    projectTitle: 'Automated Spam Attack',
    projectDescription: 'Spam body with links',
    fullName: 'Spam Bot',
    email: 'spammer@botnet.ru',
    website_url_hp: 'https://viagra-seo-spam.com',
  }

  const response = await submitInquiryMock(spamPayload, SIMULATION_MODES.SUCCESS)

  assert.equal(response.success, false)
  assert.equal(response.statusCode, 400)
  assert.equal(response.errorType, 'SECURITY_GATEWAY')
  // Must NOT expose honeypot implementation to the client
  assert.doesNotMatch(response.error, /honeypot/i)
  assert.match(response.error, /security verification/i)
})

test('3. Submission Timing Verification: flags suspiciously fast bot submissions', () => {
  const now = Date.now()

  // Case A: Bot submits within 500ms of form load
  const botStartTime = now - 500
  const botResult = verifySubmissionTiming(botStartTime, MIN_COMPLETION_TIME_MS)
  assert.equal(botResult.suspicious, true)
  assert.ok(botResult.elapsedMs < MIN_COMPLETION_TIME_MS)
  assert.match(botResult.message, /unusually fast/i)

  // Case B: Genuine human user completes after 8 seconds
  const humanStartTime = now - 8000
  const humanResult = verifySubmissionTiming(humanStartTime, MIN_COMPLETION_TIME_MS)
  assert.equal(humanResult.suspicious, false)
  assert.ok(humanResult.elapsedMs >= MIN_COMPLETION_TIME_MS)
})

test('4. Timing Progressive Resilience: genuine users are not permanently locked out', () => {
  let formLoadTime = Date.now() - 1000 // Fast typist triggers warning (1 sec)

  const check1 = verifySubmissionTiming(formLoadTime, MIN_COMPLETION_TIME_MS)
  assert.equal(check1.suspicious, true)

  // System challenges user and advances timer to allow confirmation
  formLoadTime = Date.now() - (MIN_COMPLETION_TIME_MS + 500) // User confirms after review

  const check2 = verifySubmissionTiming(formLoadTime, MIN_COMPLETION_TIME_MS)
  assert.equal(check2.suspicious, false)
})

test('5. Rate Limiting: allows up to 3 submissions per hour, throttles 4th attempt', () => {
  const storage = createMockStorage()

  // Attempt 1
  const check1 = checkRateLimit(storage)
  assert.equal(check1.allowed, true)
  assert.equal(check1.remainingAttempts, 3)
  recordSubmission(storage)

  // Attempt 2
  const check2 = checkRateLimit(storage)
  assert.equal(check2.allowed, true)
  assert.equal(check2.remainingAttempts, 2)
  recordSubmission(storage)

  // Attempt 3
  const check3 = checkRateLimit(storage)
  assert.equal(check3.allowed, true)
  assert.equal(check3.remainingAttempts, 1)
  recordSubmission(storage)

  // Attempt 4 (Exceeded)
  const check4 = checkRateLimit(storage)
  assert.equal(check4.allowed, false)
  assert.equal(check4.remainingAttempts, 0)
  assert.ok(check4.minutesLeft > 0)
  assert.match(check4.message, /Rate Limit Exceeded/i)
  assert.match(check4.message, /3 project inquiries/i)
})

test('6. Rate Limit Reset: resetDemoRateLimit clears rolling window', () => {
  const storage = createMockStorage()
  recordSubmission(storage)
  recordSubmission(storage)
  recordSubmission(storage)

  assert.equal(checkRateLimit(storage).allowed, false)

  resetDemoRateLimit(storage)
  assert.equal(checkRateLimit(storage).allowed, true)
  assert.equal(checkRateLimit(storage).remainingAttempts, MAX_SUBMISSIONS_PER_WINDOW)
})

test('7. Server Validation: rejects missing required fields and invalid email syntax', async () => {
  // Missing required project title
  const missingTitle = {
    serviceStream: 'ai-agents',
    projectTitle: '',
    projectDescription: 'Description here',
    fullName: 'John Doe',
    email: 'john@example.com',
  }
  const res1 = await submitInquiryMock(missingTitle, SIMULATION_MODES.SUCCESS)
  assert.equal(res1.success, false)
  assert.equal(res1.statusCode, 400)
  assert.match(res1.error, /invalid or missing/i)

  // Malformed email
  const badEmail = {
    serviceStream: 'ai-agents',
    projectTitle: 'Valid Project',
    projectDescription: 'Valid description',
    fullName: 'John Doe',
    email: 'not-an-email',
  }
  const res2 = await submitInquiryMock(badEmail, SIMULATION_MODES.SUCCESS)
  assert.equal(res2.success, false)
  assert.equal(res2.statusCode, 400)
  assert.match(res2.error, /valid corporate or business email/i)
})

test('8. Normal Clean User Flow: complete valid inquiry succeeds with HTTP 200', async () => {
  const cleanPayload = {
    serviceStream: 'ai-agents',
    projectTitle: 'Autonomous Logistics Planner',
    projectDescription: 'Multi-agent system dispatching truck fleets across state hubs.',
    fullName: 'Vikramaditya Rathore',
    email: 'vikram@logistics-india.in',
    website_url_hp: '', // Clean honeypot
  }

  const res = await submitInquiryMock(cleanPayload, SIMULATION_MODES.SUCCESS)
  assert.equal(res.success, true)
  assert.equal(res.statusCode, 200)
  assert.ok(res.inquiryId.startsWith('CYN-'))
  assert.ok(res.assignedArchitect)
})


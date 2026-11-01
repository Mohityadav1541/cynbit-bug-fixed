import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SYNTHETIC_DEMO_DATA,
  REVIEWER_STORAGE_KEY,
  isReviewerModeActive,
  setReviewerMode,
} from '../src/config/cynbitConfig.js'
import {
  validateFullName,
  validateEmail,
  validateProjectTitle,
  validateProjectDescription,
} from '../src/utils/validation.js'
import { SIMULATION_MODES, submitInquiryMock } from '../src/utils/mockApi.js'

test('1. Synthetic Demo Information Validation', () => {
  // Verify standard synthetic demo identity
  assert.equal(SYNTHETIC_DEMO_DATA.fullName, 'Alex Demo')
  assert.equal(SYNTHETIC_DEMO_DATA.email, 'alex@example.com')
  assert.equal(SYNTHETIC_DEMO_DATA.company, 'Example Demonstration Inc.')

  // Verify that all synthetic demo data fields pass form validation cleanly
  const nameRes = validateFullName(SYNTHETIC_DEMO_DATA.fullName)
  assert.equal(nameRes.valid, true, 'Alex Demo must pass name validation')

  const emailRes = validateEmail(SYNTHETIC_DEMO_DATA.email)
  assert.equal(emailRes.valid, true, 'alex@example.com must pass email validation')

  const titleRes = validateProjectTitle(SYNTHETIC_DEMO_DATA.projectTitle)
  assert.equal(titleRes.valid, true, 'Demo project title must pass validation')

  const descRes = validateProjectDescription(SYNTHETIC_DEMO_DATA.projectDescription)
  assert.equal(descRes.valid, true, 'Demo project description must pass validation')
})

test('2. Reviewer Mode URL Parameter and Storage Resolution', () => {
  // Helper to construct simulated browser window environment
  const createMockWindow = (search = '', storedValue = null) => {
    let mockStorage = storedValue
    return {
      location: {
        search,
      },
      localStorage: {
        getItem(key) {
          return key === REVIEWER_STORAGE_KEY ? mockStorage : null
        },
        setItem(key, value) {
          if (key === REVIEWER_STORAGE_KEY) {
            mockStorage = String(value)
          }
        },
      },
    }
  }

  // Preserve global window
  const originalWindow = globalThis.window

  try {
    // Case A: Default customer environment (no query param, no localStorage)
    globalThis.window = createMockWindow('', null)
    assert.equal(isReviewerModeActive(), false, 'Default should be customer mode (false)')

    // Case B: URL parameter ?reviewer=1 activates reviewer mode and persists to storage
    globalThis.window = createMockWindow('?reviewer=1', null)
    assert.equal(isReviewerModeActive(), true, '?reviewer=1 should activate reviewer mode')
    assert.equal(globalThis.window.localStorage.getItem(REVIEWER_STORAGE_KEY), 'true')

    // Case C: URL parameter ?reviewer=true activates reviewer mode
    globalThis.window = createMockWindow('?reviewer=true', null)
    assert.equal(isReviewerModeActive(), true, '?reviewer=true should activate reviewer mode')

    // Case D: URL parameter ?reviewer=0 deactivates reviewer mode and updates storage
    globalThis.window = createMockWindow('?reviewer=0', 'true')
    assert.equal(isReviewerModeActive(), false, '?reviewer=0 should deactivate reviewer mode')
    assert.equal(globalThis.window.localStorage.getItem(REVIEWER_STORAGE_KEY), 'false')

    // Case E: URL parameter ?reviewer=false deactivates reviewer mode
    globalThis.window = createMockWindow('?reviewer=false', 'true')
    assert.equal(isReviewerModeActive(), false, '?reviewer=false should deactivate reviewer mode')

    // Case F: Stored reviewer preference persists across navigation without query params
    globalThis.window = createMockWindow('', 'true')
    assert.equal(isReviewerModeActive(), true, 'Stored true should retain reviewer mode')

    globalThis.window = createMockWindow('', 'false')
    assert.equal(isReviewerModeActive(), false, 'Stored false should retain customer mode')

    // Case G: setReviewerMode updates storage correctly
    globalThis.window = createMockWindow('', null)
    setReviewerMode(true)
    assert.equal(globalThis.window.localStorage.getItem(REVIEWER_STORAGE_KEY), 'true')
    setReviewerMode(false)
    assert.equal(globalThis.window.localStorage.getItem(REVIEWER_STORAGE_KEY), 'false')
  } finally {
    globalThis.window = originalWindow
  }
})

test('3. Simulated Responses vs Real Submissions Differentiation', async () => {
  // Test simulated mock response behavior
  const mockResult = await submitInquiryMock(SYNTHETIC_DEMO_DATA, SIMULATION_MODES.SUCCESS)
  assert.equal(mockResult.success, true)
  assert.ok(mockResult.inquiryId.startsWith('CYN-'))

  // Reviewer fault injection modes
  const error500 = await submitInquiryMock(SYNTHETIC_DEMO_DATA, SIMULATION_MODES.SERVER_500)
  assert.equal(error500.success, false)
  assert.equal(error500.statusCode, 500)
  assert.equal(error500.errorType, 'SERVER_ERROR')

  const rateLimit429 = await submitInquiryMock(SYNTHETIC_DEMO_DATA, SIMULATION_MODES.RATE_LIMIT)
  assert.equal(rateLimit429.success, false)
  assert.equal(rateLimit429.statusCode, 429)
})

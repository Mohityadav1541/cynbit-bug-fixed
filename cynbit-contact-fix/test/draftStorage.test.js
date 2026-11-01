import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DRAFT_STORAGE_KEY,
  DRAFT_SCHEMA_VERSION,
  isStorageAvailable,
  extractScopingFields,
  saveScopingDraft,
  loadScopingDraft,
  clearScopingDraft,
} from '../src/utils/draftStorage.js'

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
    _getRawStore() {
      return store
    },
    _setThrowOnWrite(val) {
      isThrowingOnWrite = val
    },
    _setUnavailable(val) {
      isUnavailable = val
    },
  }
}

test('1. Privacy Verification: extractScopingFields excludes personal info', () => {
  const fullFormData = {
    serviceStream: 'ai-agents',
    projectTitle: 'Enterprise Agentic Hub',
    projectDescription: 'Autonomous orchestration for logistics.',
    businessObjective: 'Reduce latency by 40%',
    mainChallenges: 'Real-time synchronization',
    expectedFunctionality: 'Agent dispatch, monitoring dashboards',
    techFocus: ['React', 'Python', 'AWS'],
    customTech: 'LangGraph',
    timeline: '3-6-months',
    budgetIndex: 3,
    isBudgetUndecided: false,
    // Sensitive / Personal Fields that MUST NOT be persisted:
    fullName: 'Jane Doe',
    email: 'jane.doe@enterprise.com',
    phone: '+1-555-0199',
    company: 'Acme Global Corp',
    honeypotField: 'spam_token_123',
    passwordHash: 'secret_hash',
  }

  const scoping = extractScopingFields(fullFormData)

  // Verify scoping fields are preserved
  assert.equal(scoping.serviceStream, 'ai-agents')
  assert.equal(scoping.projectTitle, 'Enterprise Agentic Hub')
  assert.equal(scoping.budgetIndex, 3)
  assert.deepEqual(scoping.techFocus, ['React', 'Python', 'AWS'])

  // Verify privacy: personal and sensitive fields MUST NOT be present
  assert.equal(scoping.fullName, undefined)
  assert.equal(scoping.email, undefined)
  assert.equal(scoping.phone, undefined)
  assert.equal(scoping.company, undefined)
  assert.equal(scoping.honeypotField, undefined)
  assert.equal(scoping.passwordHash, undefined)
})

test('2. Save Draft: writes versioned v2 schema and timestamp to storage', () => {
  const storage = createMockStorage()
  const formData = {
    serviceStream: 'fullstack-architecture',
    projectTitle: 'Real-Time FinTech Engine',
    projectDescription: 'Sub-millisecond ledger system.',
    techFocus: ['React', 'Next.js', 'PostgreSQL'],
    budgetIndex: 2,
    timeline: '1-3-months',
    // Personal fields
    fullName: 'Alice Smith',
    email: 'alice@fintech.io',
  }

  const result = saveScopingDraft(formData, storage)
  assert.equal(result.success, true)
  assert.ok(result.timestamp)

  const rawItem = storage.getItem(DRAFT_STORAGE_KEY)
  assert.ok(rawItem, 'Raw draft item should exist in storage')

  const parsed = JSON.parse(rawItem)
  assert.equal(parsed.version, DRAFT_SCHEMA_VERSION)
  assert.equal(parsed.schema, 'cynbit.discovery.scoping.v2')
  assert.ok(parsed.updatedAt)
  assert.equal(parsed.scoping.projectTitle, 'Real-Time FinTech Engine')
  // Verify personal data wasn't serialized
  assert.equal(parsed.scoping.fullName, undefined)
  assert.equal(parsed.scoping.email, undefined)
})

test('3. Restore Draft: restores all scoping parameters correctly', () => {
  const storage = createMockStorage()
  const formData = {
    serviceStream: 'cloud-infra',
    projectTitle: 'Kubernetes Multi-Region Mesh',
    projectDescription: 'Zero-trust architecture across 3 AWS regions.',
    businessObjective: '99.999% availability',
    techFocus: ['AWS', 'Google Cloud'],
    timeline: 'over-6-months',
    budgetIndex: 4,
    isBudgetUndecided: false,
  }

  saveScopingDraft(formData, storage)

  // Simulate page reload by reading fresh
  const restored = loadScopingDraft(storage)
  assert.equal(restored.exists, true)
  assert.equal(restored.valid, true)
  assert.ok(restored.scoping)
  assert.equal(restored.scoping.serviceStream, 'cloud-infra')
  assert.equal(restored.scoping.projectTitle, 'Kubernetes Multi-Region Mesh')
  assert.equal(restored.scoping.budgetIndex, 4)
  assert.deepEqual(restored.scoping.techFocus, ['AWS', 'Google Cloud'])
})

test('4. Clear Draft: deletes draft key from storage', () => {
  const storage = createMockStorage()
  saveScopingDraft({ projectTitle: 'Draft To Clear', projectDescription: 'Testing removal' }, storage)

  assert.ok(storage.getItem(DRAFT_STORAGE_KEY))

  const clearResult = clearScopingDraft(storage)
  assert.equal(clearResult.success, true)
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), null)

  const check = loadScopingDraft(storage)
  assert.equal(check.exists, false)
})

test('5. Restore Invalid Draft: handles corrupted JSON gracefully without crashing', () => {
  const storage = createMockStorage()
  storage.setItem(DRAFT_STORAGE_KEY, '{corrupted-json-payload...')

  const check = loadScopingDraft(storage)
  assert.equal(check.exists, true)
  assert.equal(check.valid, false)
  assert.match(check.error, /Corrupted JSON/i)
})

test('6. Restore Invalid Draft: handles schema version mismatch gracefully', () => {
  const storage = createMockStorage()
  const stalePayload = {
    version: 1, // Stale version
    updatedAt: new Date().toISOString(),
    scoping: { projectTitle: 'Legacy Project' },
  }
  storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(stalePayload))

  const check = loadScopingDraft(storage)
  assert.equal(check.exists, true)
  assert.equal(check.valid, false)
  assert.match(check.error, /schema mismatch/i)
})

test('7. Untrusted Input Sanitization: rejects prototype pollution and handles bad types', () => {
  const storage = createMockStorage()
  const maliciousPayload = {
    version: DRAFT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    scoping: {
      serviceStream: 'unrecognized-stream-injection',
      projectTitle: 'Valid Title',
      techFocus: 'not-an-array', // Bad type
      budgetIndex: 999, // Out of bounds
      __proto__: { polluted: true },
    },
  }
  storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(maliciousPayload))

  const check = loadScopingDraft(storage)
  assert.equal(check.exists, true)
  assert.equal(check.valid, true)
  // Falls back to safe defaults
  assert.equal(check.scoping.serviceStream, 'ai-agents')
  assert.equal(check.scoping.projectTitle, 'Valid Title')
  assert.deepEqual(check.scoping.techFocus, [])
  assert.equal(check.scoping.budgetIndex, 2)
})

test('8. Unavailable Storage Simulation: Safari private mode or disabled storage', () => {
  const brokenStorage = createMockStorage({ unavailable: true })

  // Should return false rather than throwing
  assert.equal(isStorageAvailable(brokenStorage), false)

  const saveRes = saveScopingDraft({ projectTitle: 'Test' }, brokenStorage)
  assert.equal(saveRes.success, false)

  const loadRes = loadScopingDraft(brokenStorage)
  assert.equal(loadRes.exists, false)
  assert.equal(loadRes.valid, false)
})

test('9. Storage Quota Full Simulation: handles QuotaExceededError gracefully', () => {
  const fullStorage = createMockStorage({ throwOnDraftKey: true })

  const saveRes = saveScopingDraft(
    { projectTitle: 'Large Project', projectDescription: 'Testing full quota' },
    fullStorage
  )
  assert.equal(saveRes.success, false)
  assert.equal(saveRes.error, 'QuotaExceededError')
})

test('10. Successful Submission Lifecycle: clearing draft upon submission leaves clean slate', () => {
  const storage = createMockStorage()

  // 1. User fills out brief
  saveScopingDraft({ projectTitle: 'Submitted Project', projectDescription: 'Ready to submit' }, storage)
  assert.ok(storage.getItem(DRAFT_STORAGE_KEY))

  // 2. Form submission succeeds -> clear draft
  const cleared = clearScopingDraft(storage)
  assert.equal(cleared.success, true)

  // 3. User reloads
  const afterReload = loadScopingDraft(storage)
  assert.equal(afterReload.exists, false)
})

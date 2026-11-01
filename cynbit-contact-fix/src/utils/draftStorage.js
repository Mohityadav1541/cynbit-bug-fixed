/**
 * Cynbit Architecture Discovery Engine — Draft Storage Utility
 *
 * Privacy & Security Guarantees:
 * - Scoping Fields Only: Only architectural specifications (stream, details, tech stack,
 *   budget, timeline) are persisted. Personal contact details (fullName, email, phone, company)
 *   are NEVER stored in browser storage for privacy and security.
 * - Versioned Schema: Enforces schema version validation (v2) to reject stale or tampered payloads.
 * - Untrusted Input Defense: Strict typing, schema whitelisting, and length limits defend
 *   against prototype pollution, XSS injection, or corrupt storage.
 * - Resilience: Gracefully handles QuotaExceededError, disabled storage, and Private Browsing locks.
 */

export const DRAFT_STORAGE_KEY = 'cynbit_architecture_discovery_draft_v2'
export const DRAFT_SCHEMA_VERSION = 2

// Permitted engagement stream identifiers
const VALID_STREAMS = ['ai-agents', 'fullstack-architecture', 'cloud-infra', 'bitelevate']

// Permitted timeline identifiers
const VALID_TIMELINES = ['under-1-month', '1-3-months', '3-6-months', 'over-6-months', 'not-decided']

/**
 * Checks if Web Storage is available and functional in the current runtime environment.
 * Handles disabled cookies, Safari Private Browsing locks, and quota edge cases.
 *
 * @param {Storage} [storage] - Optional storage instance to test (defaults to window.localStorage)
 * @returns {boolean}
 */
export function isStorageAvailable(storage) {
  try {
    const s = storage || (typeof window !== 'undefined' ? window.localStorage : null)
    if (!s) return false
    const testKey = '__cynbit_storage_probe__'
    s.setItem(testKey, '1')
    s.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Extracts and sanitizes ONLY project scoping fields from the form state.
 * Explicitly excludes personal contact identifiers (name, email, phone, company, honeypots).
 *
 * @param {object} formData
 * @returns {object} Whitelisted scoping subset
 */
export function extractScopingFields(formData) {
  if (!formData || typeof formData !== 'object') {
    return {}
  }

  // Whitelisted Scoping Fields
  return {
    serviceStream: VALID_STREAMS.includes(formData.serviceStream)
      ? formData.serviceStream
      : 'ai-agents',
    projectTitle: typeof formData.projectTitle === 'string'
      ? formData.projectTitle.slice(0, 250)
      : '',
    projectDescription: typeof formData.projectDescription === 'string'
      ? formData.projectDescription.slice(0, 5000)
      : '',
    businessObjective: typeof formData.businessObjective === 'string'
      ? formData.businessObjective.slice(0, 2500)
      : '',
    mainChallenges: typeof formData.mainChallenges === 'string'
      ? formData.mainChallenges.slice(0, 2500)
      : '',
    expectedFunctionality: typeof formData.expectedFunctionality === 'string'
      ? formData.expectedFunctionality.slice(0, 2500)
      : '',
    techFocus: Array.isArray(formData.techFocus)
      ? formData.techFocus.filter((t) => typeof t === 'string' && t.length <= 50).slice(0, 30)
      : [],
    customTech: typeof formData.customTech === 'string'
      ? formData.customTech.slice(0, 150)
      : '',
    timeline: VALID_TIMELINES.includes(formData.timeline)
      ? formData.timeline
      : '1-3-months',
    budgetIndex: typeof formData.budgetIndex === 'number' && Number.isInteger(formData.budgetIndex) && formData.budgetIndex >= 0 && formData.budgetIndex <= 4
      ? formData.budgetIndex
      : 2,
    isBudgetUndecided: Boolean(formData.isBudgetUndecided),
  }
}

/**
 * Saves project scoping data to LocalStorage with versioning and timestamp metadata.
 *
 * @param {object} formData - Current form state
 * @param {Storage} [storage] - Storage provider
 * @returns {{ success: boolean, timestamp?: string, error?: string }}
 */
export function saveScopingDraft(formData, storage) {
  const s = storage || (typeof window !== 'undefined' ? window.localStorage : null)
  if (!isStorageAvailable(s)) {
    return { success: false, error: 'LocalStorage is unavailable or disabled in this environment.' }
  }

  const scopingData = extractScopingFields(formData)

  // Do not save completely blank drafts
  const hasContent = Boolean(
    scopingData.projectTitle?.trim() ||
    scopingData.projectDescription?.trim() ||
    scopingData.businessObjective?.trim() ||
    scopingData.mainChallenges?.trim() ||
    scopingData.expectedFunctionality?.trim() ||
    scopingData.customTech?.trim()
  )

  if (!hasContent) {
    return { success: false, error: 'Draft contains no active scoping content to persist.' }
  }

  const timestamp = new Date().toISOString()
  const payload = {
    version: DRAFT_SCHEMA_VERSION,
    schema: 'cynbit.discovery.scoping.v2',
    updatedAt: timestamp,
    privacyNotice: 'Scoping specifications only. Personal contact details are not retained in browser storage.',
    scoping: scopingData,
  }

  try {
    s.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
    return { success: true, timestamp }
  } catch (err) {
    // Handle QuotaExceededError or security exceptions safely
    console.warn('Cynbit Draft Storage: Failed to write to LocalStorage:', err)
    return { success: false, error: err.name || 'StorageWriteError' }
  }
}

/**
 * Reads, verifies, and sanitizes saved scoping draft from LocalStorage.
 * Treats LocalStorage as untrusted input: validates schema version and field structure.
 *
 * @param {Storage} [storage] - Storage provider
 * @returns {{ exists: boolean, valid: boolean, scoping?: object, updatedAt?: string, error?: string }}
 */
export function loadScopingDraft(storage) {
  const s = storage || (typeof window !== 'undefined' ? window.localStorage : null)
  if (!isStorageAvailable(s)) {
    return { exists: false, valid: false, error: 'LocalStorage is unavailable.' }
  }

  let raw
  try {
    raw = s.getItem(DRAFT_STORAGE_KEY)
  } catch (err) {
    return { exists: false, valid: false, error: err.message }
  }

  if (!raw) {
    return { exists: false, valid: false }
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Corrupted JSON in storage — treat as invalid
    return { exists: true, valid: false, error: 'Corrupted JSON payload in storage.' }
  }

  // Validate object shape
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { exists: true, valid: false, error: 'Invalid draft payload structure.' }
  }

  // Schema Version Check: reject outdated or incompatible schemas
  if (parsed.version !== DRAFT_SCHEMA_VERSION) {
    return {
      exists: true,
      valid: false,
      error: `Draft schema mismatch: found version ${parsed.version}, expected version ${DRAFT_SCHEMA_VERSION}.`,
    }
  }

  if (!parsed.scoping || typeof parsed.scoping !== 'object') {
    return { exists: true, valid: false, error: 'Missing scoping payload in draft structure.' }
  }

  // Run through extraction and sanitization to enforce types and length bounds
  const sanitizedScoping = extractScopingFields(parsed.scoping)

  return {
    exists: true,
    valid: true,
    scoping: sanitizedScoping,
    updatedAt: parsed.updatedAt || null,
  }
}

/**
 * Clears the saved discovery draft from LocalStorage.
 *
 * @param {Storage} [storage] - Storage provider
 * @returns {{ success: boolean }}
 */
export function clearScopingDraft(storage) {
  const s = storage || (typeof window !== 'undefined' ? window.localStorage : null)
  if (!isStorageAvailable(s)) {
    return { success: false }
  }

  try {
    s.removeItem(DRAFT_STORAGE_KEY)
    return { success: true }
  } catch {
    return { success: false }
  }
}


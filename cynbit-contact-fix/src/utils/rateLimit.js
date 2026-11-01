/**
 * Rate Limiting and Anti-Spam Protections
 *
 * ARCHITECTURAL NOTICE:
 * Client-side rate limiting and timing checks are defense-in-depth UX controls.
 * They prevent accidental multiple submissions and filter unsophisticated automated bots.
 * For production environments, authoritative rate limiting must be enforced at the
 * server/edge level (e.g., Redis Token Bucket, Cloudflare Turnstile, Express rate-limiter).
 */

const RATE_LIMIT_KEY = 'cynbit_form_submissions'
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour rolling window
export const MAX_SUBMISSIONS_PER_WINDOW = 3
export const MIN_COMPLETION_TIME_MS = 3000 // 3 seconds realistic minimum

/**
 * Checks client-side submission frequency against the 3-per-hour limit.
 *
 * @param {Storage} [storage=localStorage]
 * @returns {{ allowed: boolean, remainingAttempts: number, message: string | null, minutesLeft?: number, resetTime?: Date }}
 */
export function checkRateLimit(storage) {
  const s = storage || (typeof window !== 'undefined' ? window.localStorage : null)
  if (!s) {
    return { allowed: true, message: null, remainingAttempts: MAX_SUBMISSIONS_PER_WINDOW }
  }

  try {
    const stored = s.getItem(RATE_LIMIT_KEY)
    const submissions = stored ? JSON.parse(stored) : []

    const now = Date.now()
    const recent = Array.isArray(submissions)
      ? submissions.filter((ts) => typeof ts === 'number' && now - ts < RATE_LIMIT_WINDOW_MS)
      : []

    if (recent.length >= MAX_SUBMISSIONS_PER_WINDOW) {
      const oldestInWindow = Math.min(...recent)
      const resetTime = new Date(oldestInWindow + RATE_LIMIT_WINDOW_MS)
      const minutesLeft = Math.max(1, Math.ceil((resetTime.getTime() - now) / 60000))

      return {
        allowed: false,
        remainingAttempts: 0,
        minutesLeft,
        resetTime,
        message: `Rate Limit Exceeded: You've submitted ${MAX_SUBMISSIONS_PER_WINDOW} project inquiries in the past hour. To protect engineering availability, please wait ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} before submitting another inquiry.`,
      }
    }

    return {
      allowed: true,
      message: null,
      remainingAttempts: MAX_SUBMISSIONS_PER_WINDOW - recent.length,
    }
  } catch {
    return { allowed: true, message: null, remainingAttempts: MAX_SUBMISSIONS_PER_WINDOW }
  }
}

/**
 * Records a successful submission timestamp to enforce throttling.
 *
 * @param {Storage} [storage=localStorage]
 */
export function recordSubmission(storage) {
  const s = storage || (typeof window !== 'undefined' ? window.localStorage : null)
  if (!s) return

  try {
    const stored = s.getItem(RATE_LIMIT_KEY)
    const submissions = stored ? JSON.parse(stored) : []
    const now = Date.now()

    const recent = Array.isArray(submissions)
      ? submissions.filter((ts) => typeof ts === 'number' && now - ts < RATE_LIMIT_WINDOW_MS)
      : []

    recent.push(now)
    s.setItem(RATE_LIMIT_KEY, JSON.stringify(recent))
  } catch {
    // Fail silently if storage is unavailable
  }
}

/**
 * Resets the demo rate limit storage (useful for QA testing and reviewers).
 *
 * @param {Storage} [storage=localStorage]
 */
export function resetDemoRateLimit(storage) {
  const s = storage || (typeof window !== 'undefined' ? window.localStorage : null)
  if (!s) return
  try {
    s.removeItem(RATE_LIMIT_KEY)
  } catch {
    // ignore
  }
}

/**
 * Creates current timestamp for tracking submission speed.
 *
 * @returns {number}
 */
export function createTimestamp() {
  return Date.now()
}

/**
 * Verifies submission timing to flag suspiciously rapid automated bots.
 * To avoid permanently rejecting genuine fast typists or users using autofill,
 * this flags the attempt with a temporary challenge instead of a permanent lockout.
 *
 * @param {number} startTimestamp - Time when the form or step was loaded
 * @param {number} [thresholdMs=MIN_COMPLETION_TIME_MS] - Minimum expected time in ms
 * @returns {{ suspicious: boolean, elapsedMs: number, message?: string }}
 */
export function verifySubmissionTiming(startTimestamp, thresholdMs = MIN_COMPLETION_TIME_MS) {
  const now = Date.now()
  const elapsed = now - (startTimestamp || now)

  if (elapsed < thresholdMs) {
    return {
      suspicious: true,
      elapsedMs: elapsed,
      message: 'Submission completed unusually fast. For security verification, please review your architectural blueprint and confirm submission again.',
    }
  }

  return {
    suspicious: false,
    elapsedMs: elapsed,
  }
}

/**
 * Validates the honeypot field.
 * Returns true if the submission is genuine (honeypot empty).
 * Returns false if a bot populated the hidden trap.
 *
 * @param {string | undefined} value - Honeypot field value
 * @returns {boolean} True if clean, false if bot detected
 */
export function validateHoneypot(value) {
  return !value || value.trim().length === 0
}

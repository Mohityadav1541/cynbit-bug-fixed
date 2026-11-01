/**
 * Simulated Cynbit Server Action / Backend API Pipeline
 * Provides a standardized enterprise API contract with comprehensive fault-injection testing:
 * - 200 OK Success
 * - Network Drop (TypeError)
 * - HTTP 400 Validation Error
 * - HTTP 429 Rate Limit
 * - HTTP 500 Internal Server Error
 * - Request Timeout (via AbortController / AbortSignal)
 * - Malformed / Invalid JSON Response
 */

export const SIMULATION_MODES = {
  SUCCESS: 'SUCCESS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_400: 'VALIDATION_400',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_500: 'SERVER_500',
  TIMEOUT: 'TIMEOUT',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  SLOW_3G: 'SLOW_3G',
}

let activeSimulationMode = SIMULATION_MODES.SUCCESS

export function setSimulationMode(mode) {
  activeSimulationMode = mode
}

export function getSimulationMode() {
  return activeSimulationMode
}

/**
 * Standardized Cynbit API Response Contract
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the request was processed successfully
 * @property {number} statusCode - HTTP status code
 * @property {string} [inquiryId] - Unique reference ID
 * @property {string} [timestamp] - ISO timestamp
 * @property {string} [assignedArchitect] - Assigned tech lead
 * @property {number} [slaResponseHours] - Guaranteed SLA in hours
 * @property {string} [error] - Error message
 * @property {string} [errorType] - Normalized error category
 * @property {any} [receivedData] - Echoed payload
 */

/**
 * Submits discovery inquiry with AbortSignal support and simulated edge conditions
 */
export async function submitInquiryMock(payload, overrideMode, options = {}) {
  const currentMode = overrideMode || activeSimulationMode
  const signal = options.signal

  // Determine simulated latency
  const delay = currentMode === SIMULATION_MODES.TIMEOUT
    ? 10000 // Exceeds standard 6000ms client timeout
    : currentMode === SIMULATION_MODES.SLOW_3G
    ? 3500
    : 800

  // Abortable latency delay
  await new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const err = new Error('The operation was aborted.')
      err.name = 'AbortError'
      return reject(err)
    }

    const timer = setTimeout(() => {
      resolve()
    }, delay)

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        const err = new Error('The operation was aborted.')
        err.name = 'AbortError'
        reject(err)
      })
    }
  })

  // 1. Authoritative Server-Side Honeypot Verification Simulation
  // In production, bots that fill hidden honeypots are dropped by edge gateway
  if (payload?.website_url_hp && typeof payload.website_url_hp === 'string' && payload.website_url_hp.trim().length > 0) {
    return {
      success: false,
      statusCode: 400,
      errorType: 'SECURITY_GATEWAY',
      error: 'Security verification failed: Your submission could not be verified by the Cynbit security gateway.',
    }
  }

  // 2. Authoritative Server-Side Schema & Required Field Validation
  if (!payload?.projectTitle?.trim() || !payload?.projectDescription?.trim() || !payload?.email?.trim() || !payload?.fullName?.trim()) {
    return {
      success: false,
      statusCode: 400,
      errorType: 'VALIDATION',
      error: 'Bad Request: Required architectural specification parameters are invalid or missing.',
    }
  }

  // 3. Authoritative Server-Side Email Syntax Verification
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(payload.email.trim())) {
    return {
      success: false,
      statusCode: 400,
      errorType: 'VALIDATION',
      error: 'Bad Request: A valid corporate or business email address is required.',
    }
  }

  // 4. Simulate network offline / connection drop (Replicates Next.js production crash)
  if (currentMode === SIMULATION_MODES.NETWORK_ERROR) {
    throw new TypeError('Failed to fetch: NetworkError when attempting to fetch resource. The server could not be reached.')
  }

  // 5. Simulate HTTP 400 Bad Request
  if (currentMode === SIMULATION_MODES.VALIDATION_400) {
    return {
      success: false,
      statusCode: 400,
      errorType: 'VALIDATION',
      error: 'Bad Request: Required architectural specification parameters are invalid or missing.',
    }
  }

  // 6. Simulate HTTP 429 Rate Limit
  if (currentMode === SIMULATION_MODES.RATE_LIMIT) {
    return {
      success: false,
      statusCode: 429,
      errorType: 'RATE_LIMIT',
      retryAfterSeconds: 30,
      error: 'HTTP 429 (Too Many Requests): Your IP has exceeded the 3 inquiries/hour threshold. Cooldown is active for 30 seconds.',
    }
  }

  // 7. Simulate HTTP 500 Internal Server Error
  if (currentMode === SIMULATION_MODES.SERVER_500) {
    return {
      success: false,
      statusCode: 500,
      errorType: 'SERVER_ERROR',
      error: 'HTTP 500 (Internal Server Error): Cynbit dispatch gateway encountered an unhandled server exception (SMTP/Resend error #5031).',
    }
  }

  // 8. Simulate Invalid / Malformed Response (e.g. gateway HTML error page instead of JSON)
  if (currentMode === SIMULATION_MODES.INVALID_RESPONSE) {
    return {
      malformed: true,
      unexpectedHtml: '<html><body>502 Bad Gateway nginx</body></html>',
    }
  }

  // 9. Successful 200 OK Submission
  return {
    success: true,
    statusCode: 200,
    inquiryId: `CYN-${Math.floor(100000 + Math.random() * 900000)}`,
    timestamp: new Date().toISOString(),
    assignedArchitect: 'Mohak Saini (Founding Digital Architect)',
    slaResponseHours: 4,
    receivedData: payload,
  }
}

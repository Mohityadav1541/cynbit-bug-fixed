/**
 * Cynbit Frontend API Client
 * Environment-configured HTTP client for communicating with the real Express backend.
 *
 * Strict Separation Contract:
 * - Developer Simulator modes explicitly invoke mockApi.js.
 * - Live Submission mode invokes this real Express API client via VITE_API_URL.
 * - Responses clearly indicate storage mode ('postgresql' | 'local-fallback' | 'simulated-mock').
 */

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) ||
  'http://localhost:5001/api'

/**
 * Check connectivity and diagnostic status of the real Express backend.
 *
 * @param {number} [timeoutMs=3000] - Request abort timeout in milliseconds
 * @returns {Promise<{ online: boolean, statusCode: number | null, data: object | null, error: string | null }>}
 */
export async function checkBackendHealth(timeoutMs = 3000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    const contentType = res.headers.get('content-type') || ''
    let data = null
    if (contentType.includes('application/json')) {
      try {
        data = await res.json()
      } catch {
        data = null
      }
    }

    if (res.ok) {
      return {
        online: true,
        statusCode: res.status,
        data,
        error: null,
      }
    }

    // Unsuccessful HTTP response (e.g. 503 Service Unavailable or 500 Server Error)
    return {
      online: false,
      statusCode: res.status,
      data,
      error:
        (data && data.error) ||
        `HTTP ${res.status}: Backend service reported unhealthy status.`,
    }
  } catch (err) {
    const isTimeout = err.name === 'AbortError'
    return {
      online: false,
      statusCode: null,
      data: null,
      error: isTimeout
        ? `Backend health check timed out after ${timeoutMs}ms.`
        : err.message || 'Network error during backend health check.',
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Submit an inquiry to the real Express API endpoint.
 *
 * @param {Object} payload - Inquiry form data
 * @param {Object} [options] - Options including AbortSignal
 * @returns {Promise<Object>} Standardized API response
 */
export async function submitInquiryLive(payload, options = {}) {
  const signal = options.signal

  try {
    const res = await fetch(`${API_BASE_URL}/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    })

    const contentType = res.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    let responseData = {}
    if (isJson) {
      try {
        responseData = await res.json()
      } catch {
        responseData = {}
      }
    }

    if (res.ok && res.status === 201) {
      return {
        success: true,
        statusCode: res.status,
        inquiryId: responseData.referenceId,
        assignedArchitect: responseData.assignedArchitect,
        slaResponseHours: responseData.slaResponseHours,
        storageMode: responseData.storageMode, // 'postgresql' | 'local-fallback'
        timestamp: responseData.timestamp,
        isLiveBackend: true,
      }
    }

    // Handle structured HTTP errors returned by server (e.g. 400, 429, 500, 503)
    const isServerFailure = res.status >= 500
    const defaultErrorType = res.status === 503
      ? 'SERVICE_UNAVAILABLE'
      : isServerFailure
        ? 'SERVER_ERROR'
        : 'CLIENT_ERROR'

    return {
      success: false,
      statusCode: res.status,
      errorType: responseData.errorType || defaultErrorType,
      error:
        responseData.error ||
        `HTTP ${res.status}: Failed to submit inquiry to the Cynbit API gateway.`,
      fieldErrors: responseData.fieldErrors || null,
      retryAfterSeconds: responseData.retryAfterSeconds || null,
      isLiveBackend: true,
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      const abortErr = new Error('Request was aborted by the client timeout controller.')
      abortErr.name = 'AbortError'
      throw abortErr
    }

    // Distinct Network failure: Express backend unreachable
    return {
      success: false,
      statusCode: 0,
      errorType: 'NETWORK_ERROR',
      error:
        'Could not reach the Cynbit Express backend at ' +
        API_BASE_URL +
        '. Please ensure the backend server is running (`npm run server`).',
      isLiveBackend: true,
      details: err.message,
    }
  }
}

/**
 * SECURITY NOTE:
 * `lookupInquiryByReference()` has been removed.
 * Public GET /api/inquiries/:referenceId is decommissioned to prevent unauthorized
 * exposure of project metadata, technology stacks, timelines, and staff assignments.
 * Reference IDs serve exclusively as client confirmation receipts.
 *
 * Future Architecture Requirement:
 * If a self-service inquiry status portal is introduced in the future, it must
 * employ an independent, authenticated verification mechanism (such as email OTP
 * magic link verification or session-authenticated client portal) rather than
 * public unauthenticated reference ID lookup.
 */


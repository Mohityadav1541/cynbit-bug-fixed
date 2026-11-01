import { ZodError } from 'zod'

/**
 * 404 Route Not Found Middleware
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    statusCode: 404,
    errorType: 'NOT_FOUND',
    error: `Resource not found: ${req.method} ${req.originalUrl}`,
  })
}

/**
 * Centralized Enterprise Error Handling Middleware.
 * Strictly guarantees that internal server stack traces, database credentials,
 * or host paths are NEVER leaked to the client.
 */
export function errorHandler(err, req, res, _next) {
  // 1. Handle Request Size Exceeded (HTTP 413)
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      statusCode: 413,
      errorType: 'PAYLOAD_TOO_LARGE',
      error: 'Payload Too Large: The submitted brief exceeds the maximum allowed request size (50KB).',
    })
  }

  // 2. Handle CORS Origin Violations (HTTP 403)
  if (err.message && err.message.includes('CORS blocked')) {
    return res.status(403).json({
      success: false,
      statusCode: 403,
      errorType: 'CORS_FORBIDDEN',
      error: 'Cross-Origin Request Blocked: The requesting origin is not authorized by Cynbit CORS policy.',
    })
  }

  // 3. Handle Malformed JSON Payloads (HTTP 400)
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      errorType: 'MALFORMED_JSON',
      error: 'Malformed JSON payload: Unable to parse request body.',
    })
  }

  // 4. Handle Zod Validation Errors (HTTP 400)
  if (err instanceof ZodError || err?.name === 'ZodError') {
    const issues = err.issues || err.errors || []
    const formattedErrors = issues.map((e) => ({
      field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
      message: e.message,
    }))

    return res.status(400).json({
      success: false,
      statusCode: 400,
      errorType: 'VALIDATION_ERROR',
      error: 'Request validation failed: One or more fields are invalid.',
      fieldErrors: formattedErrors,
    })
  }

  // 5. Handle Database Unavailability / Service Unavailable (HTTP 503)
  if (
    err.statusCode === 503 ||
    err.errorType === 'DATABASE_UNAVAILABLE' ||
    err.errorType === 'DATABASE_WRITE_FAILED' ||
    err.errorType === 'SERVICE_UNAVAILABLE'
  ) {
    console.error('[Cynbit Storage Service Unavailable]:', {
      timestamp: new Date().toISOString(),
      errorType: err.errorType || 'SERVICE_UNAVAILABLE',
      message: err.message,
    })

    return res.status(503).json({
      success: false,
      statusCode: 503,
      errorType: 'SERVICE_UNAVAILABLE',
      error:
        'The Cynbit inquiry storage service is temporarily unavailable. Please retry in a few moments or contact opportunities@cynbit.in.',
    })
  }

  // 6. Log internal error securely on server side
  console.error('[Cynbit Server Error]:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    errorName: err.name,
    errorMessage: err.message,
    // Stack trace is only logged to server console, NEVER returned to HTTP client
    stack: err.stack,
  })

  // 6. Return sanitized generic 500 error to client
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500

  return res.status(statusCode).json({
    success: false,
    statusCode,
    errorType: 'INTERNAL_SERVER_ERROR',
    error: 'An internal server error occurred while processing your discovery inquiry. Please retry or contact opportunities@cynbit.in.',
  })
}

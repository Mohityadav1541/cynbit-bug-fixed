import dotenv from 'dotenv'

dotenv.config()

/**
 * Parses the TRUST_PROXY environment setting into a format supported by Express.
 * Supports booleans ('true', 'false'), hop counts (integers), subnet lists, or preset strings ('loopback').
 */
export function parseTrustProxy(val) {
  if (val === undefined || val === null || val === '') return false
  if (val === 'true' || val === true) return true
  if (val === 'false' || val === false) return false
  const num = Number(val)
  if (!Number.isNaN(num) && Number.isInteger(num)) return num
  if (typeof val === 'string' && val.includes(',')) {
    return val.split(',').map((s) => s.trim())
  }
  return val
}

export const config = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || null,
  REDIS_URL: process.env.REDIS_URL || null,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || null,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || null,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10), // 5 requests per window
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY ?? false),
  STORAGE_MODE: process.env.DATABASE_URL
    ? 'postgresql'
    : (process.env.NODE_ENV === 'production' ? 'postgresql-required' : 'local-development'),
}

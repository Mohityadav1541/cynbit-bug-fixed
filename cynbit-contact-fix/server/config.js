import dotenv from 'dotenv'

dotenv.config()

export const config = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || null,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10), // 5 requests per window
  STORAGE_MODE: process.env.DATABASE_URL ? 'postgresql' : 'local-fallback',
}


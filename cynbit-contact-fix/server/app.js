import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config.js'
import { healthRouter } from './routes/health.js'
import { inquiriesRouter } from './routes/inquiries.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'

export const app = express()

// 0. Explicit Environment-Based Trust Proxy Configuration
// Never blindly trust arbitrary forwarded headers. Express evaluates proxy trust
// according to the environment TRUST_PROXY setting (e.g. 'loopback', 1, specific CIDR, or false)
app.set('trust proxy', config.TRUST_PROXY)

// 1. Core Security Headers with Helmet
// Disables x-powered-by, sets nosniff, frameguard (clickjacking), HSTS, and Referrer Policy
app.disable('x-powered-by')

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        connectSrc: [
          "'self'",
          config.CORS_ORIGIN,
          'http://localhost:*',
          'http://127.0.0.1:*',
          'https://*.neon.tech',
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
)

// 2. Strict CORS Configuration
const allowedOrigins = [
  config.CORS_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile native apps, curl, server-to-server)
      if (!origin) return callback(null, true)

      const isAllowedConfigOrigin = allowedOrigins.includes(origin)
      const isLocalhostDev =
        config.NODE_ENV !== 'production' &&
        (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))

      if (isAllowedConfigOrigin || isLocalhostDev) {
        return callback(null, true)
      }

      return callback(new Error(`CORS blocked for unauthorized origin: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // Preflight cache 24h
  })
)

// 3. Strict Request Size Limits (50KB max to prevent denial-of-service / memory exhaustion)
app.use(express.json({ limit: '50kb' }))
app.use(express.urlencoded({ extended: false, limit: '50kb' }))

// 4. Mount API routes under /api
app.use('/api', healthRouter)
app.use('/api', inquiriesRouter)

// 5. 404 Route Handler
app.use(notFoundHandler)

// 6. Centralized Error Handler (Never leaks internal stack traces)
app.use(errorHandler)

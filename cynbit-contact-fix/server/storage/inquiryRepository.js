import pg from 'pg'
import crypto from 'crypto'
import { config } from '../config.js'
import { localDevStore, LOCAL_STORE_LIMITATIONS } from './localStore.js'

let pgPool = null
let isDbConnected = false
let dbDiagnosticsInfo = null
let connectionError = null
let isVerifyingConnection = false

/**
 * Strips sensitive credentials (passwords) from connection strings before logging.
 */
export function sanitizeConnectionUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return 'none'
  try {
    const parsed = new URL(rawUrl)
    const auth = parsed.username ? `${parsed.username}:****@` : ''
    return `${parsed.protocol}//${auth}${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}${parsed.pathname}`
  } catch {
    return '[REDACTED_INVALID_URL]'
  }
}

/**
 * Initializes the PostgreSQL connection pool with defensive timeouts and SSL options.
 */
export function createPgPool(databaseUrl = config.DATABASE_URL) {
  if (!databaseUrl) return null

  const poolConfig = {
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  }

  // Cloud PostgreSQL providers (Neon, AWS, Azure, Supabase) require TLS/SSL
  try {
    const parsed = new URL(databaseUrl)
    const host = parsed.hostname.toLowerCase()
    const sslParam = parsed.searchParams.get('ssl')
    const sslMode = parsed.searchParams.get('sslmode')

    if (
      host.includes('neon.tech') ||
      host.includes('aws') ||
      host.includes('azure') ||
      host.includes('supabase') ||
      sslParam === 'true' ||
      sslMode === 'require' ||
      sslMode === 'verify-full' ||
      process.env.DATABASE_SSL === 'true'
    ) {
      poolConfig.ssl = { rejectUnauthorized: false }
    }
  } catch {
    // Ignore URL parse failure here, will be caught during connection test
  }

  const pool = new pg.Pool(poolConfig)

  // Attach error handler to idle clients to prevent unhandled node process termination
  pool.on('error', (err) => {
    console.error('[Storage Error]: Unexpected background error on idle PostgreSQL client:', err.message)
    isDbConnected = false
    connectionError = err.message
  })

  return pool
}

/**
 * Verifies active database connectivity before declaring database readiness.
 */
export async function verifyConnection(pool = pgPool) {
  if (!pool) {
    isDbConnected = false
    dbDiagnosticsInfo = null
    return false
  }

  isVerifyingConnection = true
  let client
  try {
    client = await pool.connect()
    const result = await client.query('SELECT current_database(), version();')
    isDbConnected = true
    connectionError = null

    const row = result.rows[0] || {}
    const rawUrl = pool.options?.connectionString || config.DATABASE_URL
    let host = 'localhost'
    let database = 'postgresql'
    try {
      if (rawUrl) {
        const u = new URL(rawUrl)
        host = u.hostname
        database = u.pathname.replace(/^\//, '') || row.current_database
      }
    } catch {
      database = row.current_database || 'postgresql'
    }

    dbDiagnosticsInfo = {
      database,
      host,
      version: row.version ? row.version.split(' ')[0] + ' ' + (row.version.split(' ')[1] || '') : 'PostgreSQL',
    }

    console.log(
      `[Storage]: Successfully verified connection to PostgreSQL database (${database} on ${host}) via pg.Pool.`
    )
    return true
  } catch (err) {
    isDbConnected = false
    connectionError = err.message
    const sanitizedTarget = pool.options?.connectionString
      ? sanitizeConnectionUrl(pool.options.connectionString)
      : 'unconfigured'

    if (config.NODE_ENV === 'production') {
      console.error(
        `[Storage Alert]: PostgreSQL connection failed to ${sanitizedTarget}. Production database is OFFLINE:`,
        err.message
      )
    } else {
      console.warn(
        `[Storage Development Warning]: PostgreSQL connection to ${sanitizedTarget} failed. Development fallback store will be used. Error:`,
        err.message
      )
    }
    return false
  } finally {
    if (client) {
      try {
        client.release()
      } catch {
        // ignore
      }
    }
    isVerifyingConnection = false
  }
}

// Initial connection initialization if DATABASE_URL is present
if (config.DATABASE_URL) {
  try {
    pgPool = createPgPool(config.DATABASE_URL)
    verifyConnection(pgPool).catch(() => {
      // Async failure handled and logged in verifyConnection
    })
  } catch (err) {
    console.error(
      '[Storage Error]: Failed to initialize PostgreSQL pool with provided DATABASE_URL:',
      err.message
    )
    isDbConnected = false
  }
} else {
  if (config.NODE_ENV === 'production') {
    console.error(
      '[Storage Critical]: NODE_ENV is "production" but no DATABASE_URL is configured! Submissions will return HTTP 503.'
    )
  } else {
    console.info(
      '[Storage Notice]: No DATABASE_URL configured. Local development JSON store is active (server/data/inquiries.json).'
    )
  }
}

/**
 * Storage Repository Interface
 */
export const inquiryRepository = {
  /**
   * Save an inquiry to the active storage engine with strict production isolation.
   */
  async saveInquiry(inquiryData) {
    const isProduction = config.NODE_ENV === 'production'
    const id = inquiryData.id || `inq_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`
    const createdAt = inquiryData.createdAt || new Date().toISOString()
    const updatedAt = new Date().toISOString()

    /* --------------------------------------------------------------------------
       1. PRODUCTION MODE ENFORCEMENT
       --------------------------------------------------------------------------
       - Strictly requires verified PostgreSQL database persistence.
       - NEVER silently falls back to local JSON file storage.
       - If database is unavailable, returns a controlled HTTP 503 response.
       - Does NOT perform blind retries that could generate duplicate records.
       -------------------------------------------------------------------------- */
    if (isProduction) {
      if (!isDbConnected || !pgPool) {
        console.error(
          '[Storage Production Guardrail]: Inquiry rejected: PostgreSQL is disconnected in PRODUCTION mode. Local file fallback is forbidden.'
        )
        const unavailableError = new Error(
          'Database service is temporarily unavailable. Production mandates verified persistent PostgreSQL storage.'
        )
        unavailableError.statusCode = 503
        unavailableError.errorType = 'DATABASE_UNAVAILABLE'
        throw unavailableError
      }

      try {
        const queryText = `
          INSERT INTO inquiries (
            id,
            reference_id,
            engagement_stream,
            project_title,
            project_description,
            business_objective,
            main_challenges,
            expected_functionality,
            tech_stack,
            timeline,
            budget_range,
            full_name,
            email,
            phone,
            company,
            status,
            assigned_architect,
            sla_response_hours,
            ip_address,
            user_agent,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22
          ) RETURNING *;
        `
        const values = [
          id,
          inquiryData.referenceId,
          inquiryData.engagementStream,
          inquiryData.projectTitle,
          inquiryData.projectDescription,
          inquiryData.businessObjective || null,
          inquiryData.mainChallenges || null,
          inquiryData.expectedFunctionality || null,
          inquiryData.techStack || [],
          inquiryData.timeline || null,
          inquiryData.budgetRange || null,
          inquiryData.fullName,
          inquiryData.email,
          inquiryData.phone || null,
          inquiryData.company || null,
          inquiryData.status || 'PENDING_REVIEW',
          inquiryData.assignedArchitect || 'Principal Cloud & AI Architect',
          inquiryData.slaResponseHours || 24,
          inquiryData.ipAddress || null,
          inquiryData.userAgent || null,
          createdAt,
          updatedAt,
        ]

        const result = await pgPool.query(queryText, values)
        const row = result.rows[0]

        return {
          id: row.id,
          referenceId: row.reference_id,
          engagementStream: row.engagement_stream,
          projectTitle: row.project_title,
          projectDescription: row.project_description,
          businessObjective: row.business_objective,
          mainChallenges: row.main_challenges,
          expectedFunctionality: row.expected_functionality,
          techStack: row.tech_stack,
          timeline: row.timeline,
          budgetRange: row.budget_range,
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          company: row.company,
          status: row.status,
          assignedArchitect: row.assigned_architect,
          slaResponseHours: row.sla_response_hours,
          createdAt: row.created_at,
          storageMode: 'postgresql',
          databaseEngine: 'PostgreSQL Client Pool (pg)',
        }
      } catch (dbError) {
        // Safe logging without credentials or internal secrets
        console.error('[Storage Error]: PostgreSQL insert failed in production:', {
          code: dbError.code,
          message: dbError.message,
          timestamp: new Date().toISOString(),
        })

        // Flag connection degradation on network/connectivity drops
        if (
          ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '57P01', '08006', '08001'].includes(dbError.code)
        ) {
          isDbConnected = false
          connectionError = dbError.message
        }

        // Under no circumstances silently save to JSON in production.
        // Return 503 so client preserves draft form data and shows retry option.
        const writeError = new Error('Database write operation failed. Your inquiry could not be persisted.')
        writeError.statusCode = 503
        writeError.errorType = 'DATABASE_WRITE_FAILED'
        throw writeError
      }
    }

    /* --------------------------------------------------------------------------
       2. DEVELOPMENT & TEST MODE
       --------------------------------------------------------------------------
       - Attempt PostgreSQL if connected.
       - If PostgreSQL is unavailable or fails, fall back to local JSON store.
       - Clearly indicate when local storage is active.
       -------------------------------------------------------------------------- */
    if (isDbConnected && pgPool) {
      try {
        const queryText = `
          INSERT INTO inquiries (
            id,
            reference_id,
            engagement_stream,
            project_title,
            project_description,
            business_objective,
            main_challenges,
            expected_functionality,
            tech_stack,
            timeline,
            budget_range,
            full_name,
            email,
            phone,
            company,
            status,
            assigned_architect,
            sla_response_hours,
            ip_address,
            user_agent,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22
          ) RETURNING *;
        `
        const values = [
          id,
          inquiryData.referenceId,
          inquiryData.engagementStream,
          inquiryData.projectTitle,
          inquiryData.projectDescription,
          inquiryData.businessObjective || null,
          inquiryData.mainChallenges || null,
          inquiryData.expectedFunctionality || null,
          inquiryData.techStack || [],
          inquiryData.timeline || null,
          inquiryData.budgetRange || null,
          inquiryData.fullName,
          inquiryData.email,
          inquiryData.phone || null,
          inquiryData.company || null,
          inquiryData.status || 'PENDING_REVIEW',
          inquiryData.assignedArchitect || 'Principal Cloud & AI Architect',
          inquiryData.slaResponseHours || 24,
          inquiryData.ipAddress || null,
          inquiryData.userAgent || null,
          createdAt,
          updatedAt,
        ]

        const result = await pgPool.query(queryText, values)
        const row = result.rows[0]

        return {
          id: row.id,
          referenceId: row.reference_id,
          engagementStream: row.engagement_stream,
          projectTitle: row.project_title,
          projectDescription: row.project_description,
          businessObjective: row.business_objective,
          mainChallenges: row.main_challenges,
          expectedFunctionality: row.expected_functionality,
          techStack: row.tech_stack,
          timeline: row.timeline,
          budgetRange: row.budget_range,
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          company: row.company,
          status: row.status,
          assignedArchitect: row.assigned_architect,
          slaResponseHours: row.sla_response_hours,
          createdAt: row.created_at,
          storageMode: 'postgresql',
          databaseEngine: 'PostgreSQL Client Pool (pg)',
        }
      } catch (dbError) {
        console.warn(
          '[Storage Warning]: PostgreSQL query failed in development, saving to local development JSON store:',
          dbError.message
        )
        const fallbackSaved = localDevStore.save(inquiryData)
        return {
          ...fallbackSaved,
          storageMode: 'local-development',
          fallbackReason: dbError.message,
        }
      }
    }

    // Default development path when PostgreSQL is offline or unconfigured
    console.info(
      '[Storage Development Notice]: Storing inquiry in local development store (server/data/inquiries.json).'
    )
    const saved = localDevStore.save(inquiryData)
    return {
      ...saved,
      storageMode: 'local-development',
    }
  },

  /**
   * Find an inquiry by reference ID (Internal repository method).
   */
  async findByReferenceId(referenceId) {
    if (isDbConnected && pgPool) {
      try {
        const queryText = 'SELECT * FROM inquiries WHERE reference_id = $1 LIMIT 1;'
        const result = await pgPool.query(queryText, [referenceId])

        if (result.rows.length > 0) {
          const row = result.rows[0]
          return {
            id: row.id,
            referenceId: row.reference_id,
            engagementStream: row.engagement_stream,
            projectTitle: row.project_title,
            projectDescription: row.project_description,
            businessObjective: row.business_objective,
            mainChallenges: row.main_challenges,
            expectedFunctionality: row.expected_functionality,
            techStack: row.tech_stack,
            timeline: row.timeline,
            budgetRange: row.budget_range,
            fullName: row.full_name,
            email: row.email,
            phone: row.phone,
            company: row.company,
            status: row.status,
            assignedArchitect: row.assigned_architect,
            slaResponseHours: row.sla_response_hours,
            createdAt: row.created_at,
            storageMode: 'postgresql',
          }
        }
      } catch (err) {
        console.warn('[Storage Warning]: Database lookup error, checking local store:', err.message)
      }
    }

    // Only search local store if not in production
    if (config.NODE_ENV !== 'production') {
      const localFound = localDevStore.findByReferenceId(referenceId)
      return localFound ? { ...localFound, storageMode: 'local-development' } : null
    }

    return null
  },

  /**
   * Return active storage configuration and diagnostics.
   */
  getStorageDiagnostics() {
    const isProduction = config.NODE_ENV === 'production'

    if (isDbConnected && pgPool) {
      return {
        mode: 'postgresql',
        driver: 'PostgreSQL Client Pool (pg)',
        connected: true,
        databaseConfigured: true,
        databaseHost: dbDiagnosticsInfo?.host || 'Neon PostgreSQL',
        databaseName: dbDiagnosticsInfo?.database || 'neondb',
        localFallbackAllowed: !isProduction,
        environment: config.NODE_ENV,
        limitations: null,
      }
    }

    if (isProduction) {
      return {
        mode: 'unavailable',
        driver: 'PostgreSQL Client Pool (pg) - Disconnected',
        connected: false,
        databaseConfigured: Boolean(config.DATABASE_URL),
        localFallbackAllowed: false,
        environment: config.NODE_ENV,
        error: connectionError
          ? `PostgreSQL database connection is unavailable: ${connectionError}`
          : 'PostgreSQL database connection is unavailable. Inquiries will return HTTP 503.',
      }
    }

    return {
      mode: 'local-development',
      driver: 'LocalDevelopmentStore (JSON File)',
      connected: true,
      databaseConfigured: Boolean(config.DATABASE_URL),
      localFallbackAllowed: true,
      environment: config.NODE_ENV,
      disclaimer: LOCAL_STORE_LIMITATIONS.disclaimer,
      limitations: LOCAL_STORE_LIMITATIONS.limitations,
    }
  },

  /**
   * Check whether the storage layer is ready to accept and persist inquiries.
   * In production, requires verified PostgreSQL connectivity.
   * In development/test, allows clearly identified local development store.
   * Never leaks passwords, internal network details, or hostnames.
   */
  async checkReadiness() {
    const isProduction = config.NODE_ENV === 'production'

    if (pgPool && isDbConnected) {
      try {
        if (typeof pgPool.query === 'function') {
          await pgPool.query('SELECT 1;')
          return {
            ready: true,
            storage: 'postgresql',
            environment: config.NODE_ENV,
          }
        }
      } catch (err) {
        isDbConnected = false
        connectionError = err.message
      }
    }

    if (isProduction) {
      return {
        ready: false,
        storage: 'unavailable',
        environment: config.NODE_ENV,
        error: 'Primary database storage is unavailable.',
      }
    }

    // Development & test modes allow local JSON storage
    return {
      ready: true,
      storage: 'local-development',
      environment: config.NODE_ENV,
    }
  },

  /**
   * Cleanly close database connections (for graceful shutdown and test teardown).
   */
  async close() {
    if (pgPool) {
      try {
        await pgPool.end()
      } catch (err) {
        console.warn('[Storage Warning]: Error ending PostgreSQL pool:', err.message)
      } finally {
        pgPool = null
        isDbConnected = false
        dbDiagnosticsInfo = null
      }
    }
  },

  /* --------------------------------------------------------------------------
     TESTING & CONNECTION CONTROL METHODS
     -------------------------------------------------------------------------- */
  setIsDbConnected(val) {
    isDbConnected = Boolean(val)
  },

  isDbConnected() {
    return isDbConnected
  },

  setPgPool(pool) {
    pgPool = pool
  },

  getPgPool() {
    return pgPool
  },

  setConnectionError(err) {
    connectionError = err
  },

  async verifyConnection() {
    return verifyConnection(pgPool)
  },

  async initialize() {
    if (config.DATABASE_URL && !pgPool) {
      pgPool = createPgPool(config.DATABASE_URL)
    }
    return verifyConnection(pgPool)
  },
}

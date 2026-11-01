import pg from 'pg'
import crypto from 'crypto'
import { config } from '../config.js'
import { localDevStore, LOCAL_STORE_LIMITATIONS } from './localStore.js'

let pgPool = null
let isDbConnected = false
let dbDiagnosticsInfo = null

// Initialize PostgreSQL Connection Pool if DATABASE_URL is configured
if (config.DATABASE_URL) {
  try {
    const url = new URL(config.DATABASE_URL)
    const host = url.hostname
    const database = url.pathname.replace(/^\//, '')

    pgPool = new pg.Pool({
      connectionString: config.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

    // Verify initial connection
    pgPool.query('SELECT current_database(), version();', (err, result) => {
      if (err) {
        console.warn(
          '[Storage Warning]: DATABASE_URL is configured but connection to PostgreSQL failed. Activating Local Development Fallback Store.\nError:',
          err.message
        )
        isDbConnected = false
      } else {
        isDbConnected = true
        dbDiagnosticsInfo = {
          database,
          host,
          version: result.rows[0]?.version?.split(' ')[0] || 'PostgreSQL',
        }
        console.log(
          `[Storage]: Successfully connected to PostgreSQL database (${database} on ${host}) via connection pool.`
        )
      }
    })
  } catch (err) {
    console.warn(
      '[Storage Warning]: Failed to parse DATABASE_URL. Falling back to local store.\nError:',
      err.message
    )
    isDbConnected = false
  }
} else {
  console.info('[Storage Notice]: No DATABASE_URL configured. Using clearly labeled Local Development Fallback Store.')
}

/**
 * Storage Repository Interface
 */
export const inquiryRepository = {
  /**
   * Save an inquiry to the active storage engine
   */
  async saveInquiry(inquiryData) {
    const id = inquiryData.id || `inq_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`
    const createdAt = inquiryData.createdAt || new Date().toISOString()
    const updatedAt = new Date().toISOString()

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
          databaseEngine: 'PostgreSQL (Neon Cloud)',
        }
      } catch (dbError) {
        console.error('[Storage Error]: PostgreSQL query failed, saving to local development fallback store:', dbError.message)
        const fallbackSaved = localDevStore.save(inquiryData)
        return {
          ...fallbackSaved,
          storageMode: 'local-fallback',
          fallbackReason: dbError.message,
        }
      }
    }

    // Default: Local Development Fallback Store
    const saved = localDevStore.save(inquiryData)
    return {
      ...saved,
      storageMode: 'local-fallback',
    }
  },

  /**
   * Find an inquiry by reference ID
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

    const localFound = localDevStore.findByReferenceId(referenceId)
    return localFound ? { ...localFound, storageMode: 'local-fallback' } : null
  },

  /**
   * Return active storage configuration and diagnostics
   */
  getStorageDiagnostics() {
    if (isDbConnected && pgPool) {
      return {
        mode: 'postgresql',
        driver: 'PostgreSQL Client Pool (Neon Cloud)',
        connected: true,
        databaseConfigured: true,
        databaseHost: dbDiagnosticsInfo?.host || 'Neon PostgreSQL',
        databaseName: dbDiagnosticsInfo?.database || 'neondb',
        limitations: null,
      }
    }

    return {
      mode: 'local-fallback',
      driver: 'LocalDevelopmentStore (JSON File)',
      connected: true,
      databaseConfigured: Boolean(config.DATABASE_URL),
      disclaimer: LOCAL_STORE_LIMITATIONS.disclaimer,
      limitations: LOCAL_STORE_LIMITATIONS.limitations,
    }
  },

  /**
   * Cleanly close database connections (for test teardown)
   */
  async close() {
    if (pgPool) {
      await pgPool.end()
    }
  },
}

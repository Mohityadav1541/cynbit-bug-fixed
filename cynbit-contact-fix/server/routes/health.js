import express from 'express'
import { config } from '../config.js'
import { inquiryRepository } from '../storage/inquiryRepository.js'

export const healthRouter = express.Router()

/**
 * 1. GET /api/health/live (Liveness Probe)
 * Purpose: Fast, lightweight check verifying that the Express process is alive.
 * Does not perform external I/O or database queries.
 */
healthRouter.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'live',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  })
})

/**
 * 2. GET /api/health/ready (Readiness Probe)
 * Purpose: Verifies whether the service can accept and persist inquiries.
 * - In production: strictly requires verified PostgreSQL connectivity.
 * - In development/test: allows clearly identified local development storage.
 * - Returns HTTP 503 when the database is unavailable in production.
 * - Strictly NEVER exposes database passwords, connection strings, internal network details,
 *   or hostnames.
 */
healthRouter.get('/health/ready', async (req, res) => {
  try {
    const readiness = await inquiryRepository.checkReadiness()

    if (!readiness.ready) {
      return res.status(503).json({
        status: 'not_ready',
        storage: readiness.storage,
        environment: readiness.environment,
        error: readiness.error || 'Primary database storage is unavailable.',
        timestamp: new Date().toISOString(),
      })
    }

    return res.status(200).json({
      status: 'ready',
      storage: readiness.storage,
      environment: readiness.environment,
      timestamp: new Date().toISOString(),
    })
  } catch {
    return res.status(503).json({
      status: 'not_ready',
      storage: 'unavailable',
      environment: config.NODE_ENV,
      error: 'Primary database storage is unavailable.',
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * 3. GET /api/health (General Diagnostics)
 * Backward-compatible endpoint providing high-level diagnostics without leaking credentials.
 */
healthRouter.get('/health', (req, res) => {
  const diagnostics = inquiryRepository.getStorageDiagnostics()

  res.status(200).json({
    status: 'healthy',
    service: 'Cynbit Architecture Discovery API',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    storage: diagnostics,
  })
})

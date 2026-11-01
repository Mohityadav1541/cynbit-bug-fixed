import express from 'express'
import { config } from '../config.js'
import { inquiryRepository } from '../storage/inquiryRepository.js'

export const healthRouter = express.Router()

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


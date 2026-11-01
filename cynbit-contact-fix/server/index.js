import { app } from './app.js'
import { config } from './config.js'
import { inquiryRepository } from './storage/inquiryRepository.js'

// Initialize & verify database pool connection on server startup
if (config.DATABASE_URL) {
  try {
    await inquiryRepository.initialize()
  } catch (err) {
    console.warn('[Server Startup Warning]: Database connection verification yielded:', err.message)
  }
}

const server = app.listen(config.PORT, () => {
  console.log(`
=====================================================
  Cynbit Architecture Discovery API Server
=====================================================
  Status:  Running
  Port:    ${config.PORT}
  Mode:    ${config.NODE_ENV}
  Storage: ${config.STORAGE_MODE}
  Health:  http://localhost:${config.PORT}/api/health
  Submit:  POST http://localhost:${config.PORT}/api/inquiries
=====================================================
`)
})

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`\n[Server]: Received ${signal}. Shutting down gracefully...`)
  server.close(async () => {
    console.log('[Server]: HTTP server closed.')
    try {
      await inquiryRepository.close()
      console.log('[Server]: PostgreSQL connection pool closed.')
    } catch (err) {
      console.error('[Server]: Error closing database pool:', err.message)
    }
    process.exit(0)
  })

  setTimeout(() => {
    console.error('[Server]: Forceful termination after timeout.')
    process.exit(1)
  }, 5000).unref()
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'))
process.on('SIGINT', () => handleShutdown('SIGINT'))


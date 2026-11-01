import { app } from './app.js'
import { config } from './config.js'

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
  server.close(() => {
    console.log('[Server]: HTTP server closed.')
    process.exit(0)
  })

  setTimeout(() => {
    console.error('[Server]: Forceful termination after timeout.')
    process.exit(1)
  }, 5000).unref()
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'))
process.on('SIGINT', () => handleShutdown('SIGINT'))


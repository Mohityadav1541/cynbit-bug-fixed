import { config } from '../config.js'

/**
 * Sliding window rate limiter for Express.
 * Tracks requests per IP address in a memory map with sliding timestamps.
 */
class SlidingWindowRateLimiter {
  constructor(windowMs = config.RATE_LIMIT_WINDOW_MS, maxRequests = config.RATE_LIMIT_MAX_REQUESTS) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
    this.ipHits = new Map()

    // Periodic sweep to prevent unbounded memory growth
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, Math.max(windowMs, 60000))

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  cleanup() {
    const now = Date.now()
    for (const [ip, timestamps] of this.ipHits.entries()) {
      const valid = timestamps.filter((t) => now - t < this.windowMs)
      if (valid.length === 0) {
        this.ipHits.delete(ip)
      } else {
        this.ipHits.set(ip, valid)
      }
    }
  }

  reset() {
    this.ipHits.clear()
  }

  middleware() {
    return (req, res, next) => {
      const clientIp =
        req.headers['cf-connecting-ip'] ||
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1'

      const now = Date.now()
      const timestamps = this.ipHits.get(clientIp) || []
      const windowStart = now - this.windowMs

      // Filter timestamps inside current sliding window
      const recentHits = timestamps.filter((t) => t > windowStart)

      if (recentHits.length >= this.maxRequests) {
        const oldestHit = recentHits[0]
        const resetTime = oldestHit + this.windowMs
        const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000))

        res.set({
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(this.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
        })

        return res.status(429).json({
          success: false,
          statusCode: 429,
          errorType: 'RATE_LIMIT_EXCEEDED',
          error: `HTTP 429: Too many inquiries submitted from this network. Cooldown active for ${retryAfterSeconds} seconds.`,
          retryAfterSeconds,
        })
      }

      // Record hit
      recentHits.push(now)
      this.ipHits.set(clientIp, recentHits)

      const remaining = Math.max(0, this.maxRequests - recentHits.length)
      res.set({
        'X-RateLimit-Limit': String(this.maxRequests),
        'X-RateLimit-Remaining': String(remaining),
      })

      next()
    }
  }
}

export const inquiryRateLimiter = new SlidingWindowRateLimiter()


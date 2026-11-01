import net from 'node:net'
import { Redis as UpstashRedis } from '@upstash/redis'
import { config } from '../config.js'

/**
 * Safely extracts and validates the client IP address from the Express request.
 *
 * CRITICAL SECURITY PRINCIPLE:
 * Never blindly trust arbitrary forwarded headers like `X-Forwarded-For` or `CF-Connecting-IP`.
 * Express evaluates `req.ip` strictly according to the configured `trust proxy` setting.
 * When `trust proxy` is false or the immediate upstream socket is untrusted,
 * Express ignores forwarded headers and returns the verified socket remoteAddress.
 *
 * This function further validates that the extracted IP is a well-formed IPv4 or IPv6 address.
 * If malformed data is detected, it safely falls back to socket address or loopback.
 *
 * @param {import('express').Request} req
 * @returns {string} Sanitized, valid IP address
 */
export function getClientIp(req) {
  // Use Express req.ip, which respects the environment-configured trust proxy setting
  let rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1'

  // Normalize IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
  if (typeof rawIp === 'string' && rawIp.startsWith('::ffff:')) {
    rawIp = rawIp.slice(7)
  }

  // Validate that the IP string is a syntactically valid IPv4 or IPv6 address
  if (typeof rawIp === 'string' && net.isIP(rawIp) !== 0) {
    return rawIp
  }

  // Fallback to socket remoteAddress if req.ip was malformed
  const socketIp = req.socket?.remoteAddress
  if (socketIp) {
    const normalizedSocket = socketIp.startsWith('::ffff:') ? socketIp.slice(7) : socketIp
    if (net.isIP(normalizedSocket) !== 0) {
      return normalizedSocket
    }
  }

  return '127.0.0.1'
}

/**
 * In-memory sliding-window rate limit store.
 * Suitable strictly for single-instance / local development environments.
 *
 * Single-Instance Limitation:
 * State is stored in memory and is NOT shared across multiple server processes or clusters.
 */
export class InMemoryRateLimitStore {
  constructor(windowMs, maxRequests, maxEntries = 10000) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
    this.maxEntries = maxEntries
    this.hits = new Map()

    // Periodic sweep to evict expired timestamps and prevent unbounded memory growth
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, Math.max(windowMs, 60000))

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  cleanup() {
    const now = Date.now()
    const windowStart = now - this.windowMs

    for (const [ip, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter((t) => t > windowStart)
      if (valid.length === 0) {
        this.hits.delete(ip)
      } else {
        this.hits.set(ip, valid)
      }
    }

    // Guard against memory exhaustion under high unique-IP volume (e.g. scanning attacks)
    if (this.hits.size > this.maxEntries) {
      const excess = this.hits.size - this.maxEntries
      const keys = Array.from(this.hits.keys()).slice(0, excess)
      for (const k of keys) {
        this.hits.delete(k)
      }
    }
  }

  async increment(clientIp, now = Date.now()) {
    const windowStart = now - this.windowMs
    const timestamps = this.hits.get(clientIp) || []
    const recent = timestamps.filter((t) => t > windowStart)

    if (recent.length >= this.maxRequests) {
      const oldestHit = recent[0]
      const resetTime = oldestHit + this.windowMs
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000))
      return {
        allowed: false,
        currentHits: recent.length,
        remaining: 0,
        resetTime,
        retryAfterSeconds,
      }
    }

    recent.push(now)
    this.hits.set(clientIp, recent)

    const remaining = Math.max(0, this.maxRequests - recent.length)
    const resetTime = now + this.windowMs

    return {
      allowed: true,
      currentHits: recent.length,
      remaining,
      resetTime,
      retryAfterSeconds: 0,
    }
  }

  reset() {
    this.hits.clear()
  }

  close() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.reset()
  }
}

/**
 * Optional Redis-backed rate limit store for distributed / multi-instance deployments.
 * Synchronizes request counters across multiple backend server replicas.
 */
export class RedisRateLimitStore {
  constructor(client, windowMs, maxRequests, keyPrefix = 'cynbit:ratelimit:') {
    this.client = client
    this.windowMs = windowMs
    this.maxRequests = maxRequests
    this.keyPrefix = keyPrefix
    this.fallbackStore = new InMemoryRateLimitStore(windowMs, maxRequests)
  }

  async increment(clientIp, now = Date.now()) {
    if (!this.client) {
      return this.fallbackStore.increment(clientIp, now)
    }

    try {
      const key = `${this.keyPrefix}${clientIp}`
      const windowStart = now - this.windowMs
      const windowSeconds = Math.ceil(this.windowMs / 1000)

      let results
      // Support Upstash Redis REST client (pipeline with { score, member })
      if (typeof this.client.pipeline === 'function') {
        const pipeline = this.client.pipeline()
        pipeline.zremrangebyscore(key, 0, windowStart)
        pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` })
        pipeline.zcard(key)
        pipeline.expire(key, windowSeconds + 5)
        results = await pipeline.exec()
      } else if (typeof this.client.multi === 'function') {
        // Support standard TCP Redis client (ioredis, node-redis)
        results = await this.client
          .multi()
          .zremrangebyscore(key, 0, windowStart)
          .zadd(key, now, `${now}-${Math.random()}`)
          .zcard(key)
          .expire(key, windowSeconds + 5)
          .exec()
      } else {
        return this.fallbackStore.increment(clientIp, now)
      }

      // zcard result is at index 2
      const currentHits = results && results[2] !== undefined
        ? Number(Array.isArray(results[2]) ? (results[2][1] ?? results[2][0]) : results[2])
        : 1

      if (currentHits > this.maxRequests) {
        const resetTime = now + this.windowMs
        const retryAfterSeconds = Math.max(1, windowSeconds)
        return {
          allowed: false,
          currentHits,
          remaining: 0,
          resetTime,
          retryAfterSeconds,
        }
      }

      return {
        allowed: true,
        currentHits,
        remaining: Math.max(0, this.maxRequests - currentHits),
        resetTime: now + this.windowMs,
        retryAfterSeconds: 0,
      }
    } catch (err) {
      console.warn('[RateLimiter Warning]: Redis operation failed, falling back to in-memory store:', err.message)
      return this.fallbackStore.increment(clientIp, now)
    }
  }

  reset() {
    this.fallbackStore.reset()
  }

  close() {
    this.fallbackStore.close()
  }
}

/**
 * Enterprise Rate Limiter supporting environment-based proxy detection,
 * safe client IP extraction, and optional distributed multi-instance synchronization.
 */
export class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || config.RATE_LIMIT_WINDOW_MS
    this.maxRequests = options.maxRequests || config.RATE_LIMIT_MAX_REQUESTS
    this.redisClient = options.redisClient || null
    this.redisUrl = options.redisUrl || config.REDIS_URL

    const isTestEnvironment =
      options.isTest ??
      (process.env.NODE_ENV === 'test' ||
        process.env.npm_lifecycle_event === 'test' ||
        process.argv.some((arg) => typeof arg === 'string' && arg.includes('test')))

    if (this.redisClient) {
      this.store = new RedisRateLimitStore(this.redisClient, this.windowMs, this.maxRequests)
      this.isDistributed = true
      this.limitationNotice = null
    } else if (
      !isTestEnvironment &&
      config.UPSTASH_REDIS_REST_URL &&
      config.UPSTASH_REDIS_REST_TOKEN
    ) {
      try {
        const upstashClient = new UpstashRedis({
          url: config.UPSTASH_REDIS_REST_URL,
          token: config.UPSTASH_REDIS_REST_TOKEN,
        })
        this.store = new RedisRateLimitStore(upstashClient, this.windowMs, this.maxRequests)
        this.isDistributed = true
        this.limitationNotice = null
      } catch (err) {
        console.warn('[RateLimiter Warning]: Failed to initialize Upstash Redis, falling back to in-memory store:', err.message)
        this.store = new InMemoryRateLimitStore(this.windowMs, this.maxRequests)
        this.isDistributed = false
        this.limitationNotice =
          'SINGLE_INSTANCE_LIMITATION: In-memory rate limiting does not synchronize state across multiple backend instances. In multi-instance or horizontal cluster environments, configure REDIS_URL or enforce rate limiting at the reverse proxy / edge layer (e.g. Cloudflare WAF, NGINX limit_req, or AWS ALB).'
      }
    } else {
      this.store = new InMemoryRateLimitStore(this.windowMs, this.maxRequests)
      this.isDistributed = false
      this.limitationNotice =
        'SINGLE_INSTANCE_LIMITATION: In-memory rate limiting does not synchronize state across multiple backend instances. In multi-instance or horizontal cluster environments, configure REDIS_URL or enforce rate limiting at the reverse proxy / edge layer (e.g. Cloudflare WAF, NGINX limit_req, or AWS ALB).'
    }
  }

  getDiagnostics() {
    return {
      engine: this.isDistributed ? 'redis-distributed' : 'in-memory-single-instance',
      isDistributed: this.isDistributed,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
      activeTrackedIps: this.store.hits ? this.store.hits.size : 'distributed',
      limitationNotice: this.limitationNotice,
    }
  }

  reset() {
    this.store.reset()
  }

  close() {
    if (this.store && typeof this.store.close === 'function') {
      this.store.close()
    }
  }

  middleware() {
    return async (req, res, next) => {
      // 1. Safely obtain client IP via Express req.ip (strictly governed by app.set('trust proxy'))
      const clientIp = getClientIp(req)

      // 2. Increment and check rate limit against store
      const result = await this.store.increment(clientIp)

      // 3. Set standard RFC rate-limit headers
      res.set({
        'X-RateLimit-Limit': String(this.maxRequests),
        'X-RateLimit-Remaining': String(result.remaining),
      })

      // 4. Handle rate limit exceeded
      if (!result.allowed) {
        res.set({
          'Retry-After': String(result.retryAfterSeconds),
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
        })

        return res.status(429).json({
          success: false,
          statusCode: 429,
          errorType: 'RATE_LIMIT_EXCEEDED',
          error: `HTTP 429: Too many inquiries submitted from this network. Cooldown active for ${result.retryAfterSeconds} seconds.`,
          retryAfterSeconds: result.retryAfterSeconds,
        })
      }

      next()
    }
  }
}

export const inquiryRateLimiter = new RateLimiter()

import express from 'express'
import crypto from 'crypto'
import { inquirySubmissionSchema } from '../validators/inquirySchema.js'
import { inquiryRateLimiter } from '../middleware/rateLimiter.js'
import { inquiryRepository } from '../storage/inquiryRepository.js'

export const inquiriesRouter = express.Router()

/**
 * Generate a cryptographically secure reference ID for customer acknowledgement.
 * Uses at least 16 cryptographically random bytes (128 bits of entropy) = 32 hex characters.
 * Example: CYN-20261101-A9E24F8812BC4D6E8901FA2357CB90ED
 *
 * NOTE: Reference IDs serve solely as client receipt and acknowledgement identifiers.
 * They are NEVER treated as authorization credentials or authentication tokens.
 */
function generateReferenceId() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomHex = crypto.randomBytes(16).toString('hex').toUpperCase()
  return `CYN-${dateStr}-${randomHex}`
}

/**
 * Assign a technical architect based on the selected engagement stream
 */
function assignArchitect(stream) {
  switch (stream) {
    case 'Autonomous AI Agents':
      return 'Lead AI & LLM Systems Architect'
    case 'Full-Stack Architecture':
      return 'Principal Enterprise Systems Architect'
    case 'Cloud & Infrastructure':
      return 'Senior Cloud & Kubernetes Infrastructure Architect'
    case 'BitElevate Corporate':
      return 'Director of Enterprise Digital Acceleration'
    default:
      return 'Principal Cloud & AI Architect'
  }
}

/**
 * POST /api/inquiries
 * Submits an architectural discovery inquiry to the live backend.
 */
inquiriesRouter.post('/inquiries', inquiryRateLimiter.middleware(), async (req, res, next) => {
  try {
    // 1. Authoritative Server-Side Honeypot Check
    // If the hidden decoy field contains any value, silently reject with a security gateway code
    if (req.body?.website_url_hp && typeof req.body.website_url_hp === 'string' && req.body.website_url_hp.trim().length > 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        errorType: 'SECURITY_GATEWAY',
        error: 'Security verification failed: Submission could not be verified by the Cynbit security gateway.',
      })
    }

    // 2. Validate and Normalize Payload with Zod
    const validatedData = inquirySubmissionSchema.parse(req.body)

    // 3. Generate Reference ID and Technical Metadata
    // Uses 16 cryptographically random bytes for high entropy acknowledgement identifier
    const referenceId = generateReferenceId()
    const assignedArchitect = assignArchitect(validatedData.engagementStream)
    const slaResponseHours = 24
    const clientIp =
      req.headers['cf-connecting-ip'] ||
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    const userAgent = req.headers['user-agent'] || 'Unknown'

    // 4. Persist to Database or Local Fallback Store
    const savedInquiry = await inquiryRepository.saveInquiry({
      ...validatedData,
      referenceId,
      assignedArchitect,
      slaResponseHours,
      ipAddress: clientIp,
      userAgent,
      status: 'PENDING_REVIEW',
    })

    // 5. Return Structured Response (Customer acknowledgement receipt)
    // Does NOT expose internal database credentials or sensitive details
    return res.status(201).json({
      success: true,
      statusCode: 201,
      referenceId: savedInquiry.referenceId,
      message: 'Architectural discovery enquiry received and registered successfully.',
      assignedArchitect: savedInquiry.assignedArchitect,
      slaResponseHours: savedInquiry.slaResponseHours,
      timestamp: savedInquiry.createdAt || new Date().toISOString(),
      storageMode: savedInquiry.storageMode,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * SECURITY ARCHITECTURE NOTE:
 * Public inquiry lookup by reference ID (GET /api/inquiries/:referenceId) has been REMOVED.
 *
 * Vulnerability Remediation:
 * Previously, GET /api/inquiries/:referenceId returned project titles, engagement streams,
 * technology stacks, timelines, application status, and assigned architect names.
 * Because reference IDs were relatively short and publicly accessible without authentication,
 * this posed a metadata reconnaissance and enumeration risk.
 *
 * Security Requirements:
 * 1. Reference IDs are issued solely for client acknowledgement and offline receipt tracking.
 * 2. Reference IDs are NEVER treated as authentication credentials or bearer tokens.
 * 3. No confidential project descriptions, customer details, or internal assignment
 *    information are exposed through any public endpoint.
 * 4. Future Requirement: If an application-status tracking capability is needed in the future,
 *    it MUST employ an independent secure verification mechanism (e.g. session-authenticated
 *    client portal, time-limited cryptographic magic link verified against the registered email,
 *    or HMAC-signed one-time access tokens).
 */

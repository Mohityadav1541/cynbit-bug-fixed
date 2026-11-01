import express from 'express'
import crypto from 'crypto'
import { inquirySubmissionSchema, referenceIdSchema } from '../validators/inquirySchema.js'
import { inquiryRateLimiter } from '../middleware/rateLimiter.js'
import { inquiryRepository } from '../storage/inquiryRepository.js'

export const inquiriesRouter = express.Router()

/**
 * Generate a cryptographically secure, enterprise-format reference ID.
 * Example: CYN-20261101-A9E24F
 */
function generateReferenceId() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase()
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

    // 5. Return Structured Response (No internal server traces)
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
 * GET /api/inquiries/:referenceId
 * Secure public reference lookup.
 * Returns only non-sensitive scoping metadata.
 * Explicitly redacts personal contact information (email, phone, name) to prevent PII harvesting.
 */
inquiriesRouter.get('/inquiries/:referenceId', inquiryRateLimiter.middleware(), async (req, res, next) => {
  try {
    const { referenceId } = req.params

    // 1. Format validation
    const parsedId = referenceIdSchema.safeParse(referenceId)
    if (!parsedId.success) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        errorType: 'INVALID_REFERENCE_ID',
        error: 'Invalid reference ID format. Format must match CYN-YYYYMMDD-XXXXXX.',
      })
    }

    // 2. Lookup in storage
    const inquiry = await inquiryRepository.findByReferenceId(parsedId.data)
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        errorType: 'INQUIRY_NOT_FOUND',
        error: `No architectural discovery enquiry found with reference ID: ${referenceId}`,
      })
    }

    // 3. Redact all PII / sensitive data for public lookup
    const sanitizedRecord = {
      referenceId: inquiry.referenceId,
      engagementStream: inquiry.engagementStream,
      projectTitle: inquiry.projectTitle,
      techStack: inquiry.techStack || [],
      timeline: inquiry.timeline || 'Not specified',
      status: inquiry.status || 'PENDING_REVIEW',
      assignedArchitect: inquiry.assignedArchitect,
      slaResponseHours: inquiry.slaResponseHours,
      createdAt: inquiry.createdAt,
      storageMode: inquiry.storageMode,
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      inquiry: sanitizedRecord,
    })
  } catch (error) {
    next(error)
  }
})


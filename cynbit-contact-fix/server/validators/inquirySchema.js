import { z } from 'zod'

/**
 * Server-side Zod validation schema for Cynbit discovery inquiries.
 * Enforces strict enterprise validation, type checks, string trimming,
 * and email normalization.
 */
export const inquirySubmissionSchema = z.object({
  engagementStream: z
    .string({ required_error: 'Engagement stream is required.' })
    .min(1, 'Engagement stream cannot be empty.')
    .max(100, 'Engagement stream is invalid.'),

  projectTitle: z
    .string({ required_error: 'Project title is required.' })
    .trim()
    .min(3, 'Project title must be at least 3 characters.')
    .max(150, 'Project title cannot exceed 150 characters.'),

  projectDescription: z
    .string({ required_error: 'Project description is required.' })
    .trim()
    .min(20, 'Project description must be at least 20 characters to allow architectural scoping.')
    .max(5000, 'Project description cannot exceed 5000 characters.'),

  businessObjective: z
    .string()
    .trim()
    .max(2000, 'Business objective cannot exceed 2000 characters.')
    .optional()
    .default(''),

  mainChallenges: z
    .string()
    .trim()
    .max(2000, 'Main challenges cannot exceed 2000 characters.')
    .optional()
    .default(''),

  expectedFunctionality: z
    .string()
    .trim()
    .max(2000, 'Expected functionality cannot exceed 2000 characters.')
    .optional()
    .default(''),

  techStack: z
    .array(z.string().trim().min(1))
    .max(25, 'Maximum 25 technologies can be selected.')
    .default([]),

  timeline: z
    .string()
    .trim()
    .max(100, 'Timeline string is too long.')
    .optional()
    .default(''),

  budgetRange: z
    .string()
    .trim()
    .max(100, 'Budget range string is too long.')
    .optional()
    .default(''),

  fullName: z
    .string({ required_error: 'Full name is required.' })
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(100, 'Full name cannot exceed 100 characters.'),

  email: z
    .string({ required_error: 'Email address is required.' })
    .trim()
    .email('Please provide a valid, well-formed email address.')
    .transform((val) => val.toLowerCase()),

  phone: z
    .string()
    .trim()
    .max(30, 'Phone number cannot exceed 30 characters.')
    .optional()
    .default(''),

  company: z
    .string()
    .trim()
    .max(100, 'Company name cannot exceed 100 characters.')
    .optional()
    .default(''),

  website_url_hp: z
    .string()
    .optional()
    .default(''),
})

/**
 * Validates referenceId format with at least 16 cryptographically random bytes (32 hex characters)
 * e.g. CYN-YYYYMMDD-<32-hex-characters>
 */
export const referenceIdSchema = z
  .string()
  .regex(/^CYN-\d{8}-[A-F0-9]{32}$/, 'Reference ID format must match CYN-YYYYMMDD-<32-hex-characters>')


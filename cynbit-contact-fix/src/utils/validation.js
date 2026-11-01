/**
 * Form validation utilities for Cynbit contact & architecture discovery engine
 * Addresses: Input sanitization, XSS mitigation, RFC email, disposable email detection, spam filters
 */

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'grr.la', 'trashmail.com',
  'temp-mail.org', '10minutemail.com', 'fakeinbox.com',
]

const PROFANITY_PATTERNS = [
  /\b(viagra|cialis|casino|lottery|winner|congratulations)\b/i,
  /(http[s]?:\/\/){3,}/i,
  /(.)\1{10,}/i,
]

export function validateFullName(value) {
  const trimmed = (value || '').trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Full name is required' }
  }
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' }
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Name must be under 100 characters' }
  }
  
  if (!/[a-zA-Z\u00C0-\u024F\u0900-\u097F]/.test(trimmed)) {
    return { valid: false, error: 'Name must contain at least one letter' }
  }
  
  if (/[^a-zA-Z\s\-'.À-ÿ\u0900-\u097F]/.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid characters' }
  }
  
  return { valid: true, error: null }
}

export function validateEmail(value) {
  const trimmed = (value || '').trim().toLowerCase()
  
  if (!trimmed) {
    return { valid: false, error: 'Business email is required' }
  }
  
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' }
  }
  
  const domain = trimmed.split('@')[1]
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, error: 'Please use a non-disposable corporate email' }
  }
  
  if (/^(test|asdf|qwerty|abc|123)@/.test(trimmed)) {
    return { valid: false, error: 'Please enter your real business email' }
  }
  
  return { valid: true, error: null }
}

export function validatePhone(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    return { valid: true, error: null } // Optional
  }
  // Allow international formatting like +91 89479 62667 or (555) 123-4567
  const cleaned = trimmed.replace(/[\s\-.()+]/g, '')
  if (cleaned.length < 7 || cleaned.length > 15 || !/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'Please enter a valid phone number (or leave blank)' }
  }
  return { valid: true, error: null }
}

export function validateCompany(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    return { valid: true, error: null }
  }
  if (trimmed.length > 150) {
    return { valid: false, error: 'Company name must be under 150 characters' }
  }
  return { valid: true, error: null }
}

export function validateIndustry(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    return { valid: true, error: null }
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Industry must be under 100 characters' }
  }
  return { valid: true, error: null }
}

export function validateProjectTitle(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    return { valid: false, error: 'Project title is required' }
  }
  if (trimmed.length < 3) {
    return { valid: false, error: 'Project title must be at least 3 characters' }
  }
  if (trimmed.length > 120) {
    return { valid: false, error: 'Project title must be under 120 characters' }
  }
  return { valid: true, error: null }
}

export function validateProjectDescription(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    return { valid: false, error: 'Project description is required' }
  }
  if (trimmed.length < 15) {
    return { valid: false, error: 'Please provide at least 15 characters describing your project' }
  }
  if (trimmed.length > 3000) {
    return { valid: false, error: `Description is too long (${trimmed.length}/3000 characters)` }
  }
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: 'Description contains prohibited spam indicators' }
    }
  }
  return { valid: true, error: null }
}

export function validateMessage(value) {
  return validateProjectDescription(value)
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(value) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

/**
 * Validate all form fields at once
 */
export function validateForm(formData) {
  const results = {
    fullName: validateFullName(formData.fullName),
    email: validateEmail(formData.email),
    phone: validatePhone(formData.phone),
    company: validateCompany(formData.company),
    projectTitle: validateProjectTitle(formData.projectTitle),
    projectDescription: validateProjectDescription(formData.projectDescription || formData.message),
  }
  
  const isValid = Object.values(results).every((r) => r.valid)
  return { isValid, fields: results }
}

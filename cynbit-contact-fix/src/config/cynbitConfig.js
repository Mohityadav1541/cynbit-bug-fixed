/**
 * Cynbit Official Contact & Corporate Configuration
 * Verified from cynbit.in production metadata and Schema.org JSON-LD
 *
 * Telephone: +91-89479-62667 (Official Cynbit Business Line)
 * WhatsApp: 918947962667 (E.164 without plus prefix for wa.me URL)
 * Corporate Inquiries: opportunities@cynbit.in (Verified on /contact)
 * Technical Support: support@cynbit.in (Verified on /contact)
 * Physical Address: 32/115 Pratap Nagar, Jaipur, RJ 302033, India
 */

export const CYNBIT_CONFIG = {
  companyName: 'Cynbit Technologies',
  tagline: 'AI Automation & High-Performance Architecture',
  websiteUrl: 'https://cynbit.in',
  contactPageUrl: 'https://cynbit.in/contact',

  // Verified Business Email Addresses
  verifiedEmail: 'opportunities@cynbit.in',
  supportEmail: 'support@cynbit.in',

  // Verified Business Telephone & WhatsApp
  verifiedPhoneDisplay: '+91-89479-62667',
  whatsappE164: '918947962667',

  // Headquarters
  headquarters: {
    street: '32/115 Pratap Nagar',
    city: 'Jaipur',
    state: 'Rajasthan',
    postalCode: '302033',
    country: 'India',
  },

  // Service Level Agreements
  slaResponseHours: 24,
  architectTeam: 'Cynbit Senior Architecture Group',
}

/**
 * Standard Synthetic Demo Identity Information
 * Replaces realistic personal data with clearly identified test identities
 */
export const SYNTHETIC_DEMO_DATA = {
  fullName: 'Alex Demo',
  email: 'alex@example.com',
  phone: '+91-9876543210',
  company: 'Example Demonstration Inc.',
  serviceStream: 'ai-agents',
  projectTitle: 'Enterprise Autonomous Agent Orchestrator',
  projectDescription: 'Building a fault-tolerant multi-agent workflow architecture to automate deployment and monitoring across multi-region cloud clusters.',
  businessObjective: 'Eliminate 80% of repetitive engineering triage tasks.',
  mainChallenges: 'State synchronization between long-running agent threads and external API rate limits.',
  expectedFunctionality: 'Real-time agent visualization, human-in-the-loop approvals, and automated telemetry ingestion.',
  techFocus: ['React', 'Next.js', 'Python', 'AI/LLM Integration', 'PostgreSQL', 'AWS'],
  customTech: 'LangGraph & Vector RAG',
  timeline: '1-3-months',
  budgetIndex: 3,
  isBudgetUndecided: false,
  website_url_hp: '',
}

export const REVIEWER_STORAGE_KEY = 'cynbit_reviewer_mode'

/**
 * Determines whether the dedicated reviewer mode is active.
 * Checked via URL parameter (?reviewer=1 or ?reviewer=true) or LocalStorage.
 */
export function isReviewerModeActive() {
  if (typeof window === 'undefined') {
    return false
  }

  // 1. Explicit URL parameter has highest priority
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const reviewerParam = urlParams.get('reviewer')
    if (reviewerParam === '1' || reviewerParam === 'true') {
      try {
        window.localStorage.setItem(REVIEWER_STORAGE_KEY, 'true')
      } catch {
        // ignore storage errors
      }
      return true
    }
    if (reviewerParam === '0' || reviewerParam === 'false') {
      try {
        window.localStorage.setItem(REVIEWER_STORAGE_KEY, 'false')
      } catch {
        // ignore storage errors
      }
      return false
    }
  } catch {
    // ignore URL parsing errors
  }

  // 2. Fall back to persisted reviewer preference in localStorage
  try {
    const stored = window.localStorage.getItem(REVIEWER_STORAGE_KEY)
    if (stored === 'true') {
      return true
    }
  } catch {
    // ignore storage errors
  }

  // Default: Customer mode (no developer simulation tools exposed)
  return false
}

/**
 * Persists reviewer mode preference
 */
export function setReviewerMode(enabled) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(REVIEWER_STORAGE_KEY, enabled ? 'true' : 'false')
  } catch {
    // ignore
  }
}



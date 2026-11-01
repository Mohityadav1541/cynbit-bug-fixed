import { CYNBIT_CONFIG } from '../config/cynbitConfig.js'
import { STREAM_OPTIONS, TIMELINE_OPTIONS, BUDGET_BRACKETS } from '../components/discovery/discoveryConstants.js'

/**
 * Resolves human-readable labels for form values
 */
export function getReadableBriefDetails(formData) {
  const stream = STREAM_OPTIONS.find((s) => s.id === formData.serviceStream)
  const streamTitle = stream ? stream.title : formData.serviceStream || 'Not specified'

  const timeline = TIMELINE_OPTIONS.find((t) => t.id === formData.timeline)
  const timelineLabel = timeline ? timeline.label : formData.timeline || 'Not decided'

  let budgetLabel = 'Undecided / Flexible Discovery'
  if (!formData.isBudgetUndecided && typeof formData.budgetIndex === 'number') {
    const budget = BUDGET_BRACKETS.find((b) => b.value === formData.budgetIndex)
    if (budget) {
      budgetLabel = `${budget.label} (${budget.range})`
    }
  }

  const techList = [...(formData.techFocus || [])]
  if (techList.includes('Other') && formData.customTech?.trim()) {
    const idx = techList.indexOf('Other')
    techList[idx] = `Other: ${formData.customTech.trim()}`
  }
  const techSummary = techList.length > 0 ? techList.join(', ') : 'None specified'

  return {
    streamTitle,
    timelineLabel,
    budgetLabel,
    techSummary,
    projectTitle: formData.projectTitle?.trim() || 'Untitled Architecture Discovery',
    projectDescription: formData.projectDescription?.trim() || 'No description provided.',
    businessObjective: formData.businessObjective?.trim() || '',
    mainChallenges: formData.mainChallenges?.trim() || '',
    expectedFunctionality: formData.expectedFunctionality?.trim() || '',
    fullName: formData.fullName?.trim() || 'Anonymous Client',
    email: formData.email?.trim() || 'Not specified',
    phone: formData.phone?.trim() || 'Not provided',
    company: formData.company?.trim() || 'Independent / Not specified',
  }
}

/**
 * Generates plain text brief suitable for clipboard copy and email body
 */
export function generatePlainBrief(formData) {
  const d = getReadableBriefDetails(formData)
  const timestamp = new Date().toLocaleString('en-US', { timeZoneName: 'short' })

  let brief = `CYNBIT ARCHITECTURE DISCOVERY BRIEF
Generated: ${timestamp}
Platform: ${CYNBIT_CONFIG.companyName} (${CYNBIT_CONFIG.websiteUrl})
----------------------------------------------------------------------

1. ENGAGEMENT STREAM
   ${d.streamTitle}

2. PROJECT OVERVIEW
   Title: ${d.projectTitle}
   Description:
   ${d.projectDescription}
`

  if (d.businessObjective) {
    brief += `\n   Business Objective:\n   ${d.businessObjective}\n`
  }
  if (d.mainChallenges) {
    brief += `\n   Key Challenges:\n   ${d.mainChallenges}\n`
  }
  if (d.expectedFunctionality) {
    brief += `\n   Core Functional Requirements:\n   ${d.expectedFunctionality}\n`
  }

  brief += `
3. TECHNICAL REQUIREMENTS
   Selected Technologies: ${d.techSummary}

4. TIMELINE & INVESTMENT
   Target Timeline: ${d.timelineLabel}
   Investment Bracket: ${d.budgetLabel}

5. CLIENT CONTACT INFORMATION
   Name: ${d.fullName}
   Email: ${d.email}
   Phone: ${d.phone}
   Organization: ${d.company}

----------------------------------------------------------------------
Transmitted via Cynbit Architecture Discovery Fallback Channel
Confidential & Proprietary to ${CYNBIT_CONFIG.companyName} & Inquiring Party.
`
  return brief.trim()
}

/**
 * Generates compact WhatsApp message formatted with WhatsApp markdown
 */
export function generateWhatsAppMessage(formData) {
  const d = getReadableBriefDetails(formData)

  return (
    `*CYNBIT ARCHITECTURE DISCOVERY INQUIRY*\n` +
    `_Transmitted via Discovery Fallback Channel_\n\n` +
    `*Client:* ${d.fullName} (${d.company})\n` +
    `*Email:* ${d.email}\n` +
    `*Phone:* ${d.phone}\n\n` +
    `*Stream:* ${d.streamTitle}\n` +
    `*Project:* ${d.projectTitle}\n\n` +
    `*Description:* ${d.projectDescription.slice(0, 300)}${d.projectDescription.length > 300 ? '...' : ''}\n\n` +
    `*Tech Stack:* ${d.techSummary}\n` +
    `*Timeline:* ${d.timelineLabel}\n` +
    `*Investment:* ${d.budgetLabel}\n\n` +
    `_Please review and confirm architectural discovery availability._`
  )
}

/**
 * Generates verified WhatsApp link with URL-encoded parameters
 */
export function generateWhatsAppUrl(formData) {
  const phone = CYNBIT_CONFIG.whatsappE164
  const message = generateWhatsAppMessage(formData)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/**
 * Generates verified mailto link with URL-encoded parameters
 */
export function generateMailtoUrl(formData) {
  const email = CYNBIT_CONFIG.verifiedEmail
  const d = getReadableBriefDetails(formData)
  const subject = `[Discovery Inquiry] ${d.projectTitle} - ${d.fullName}`
  const body = generatePlainBrief(formData)
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}


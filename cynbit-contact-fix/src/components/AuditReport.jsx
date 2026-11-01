import React, { useState, useMemo } from 'react'
import {
  FileCode,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal,
  Lock,
  Smartphone,
  Sparkles,
  Layers,
  RefreshCw,
  FileText,
} from 'lucide-react'

// Comprehensive Technical Audit Data across the 8 Required Sections
const AUDIT_FINDINGS = [
  {
    id: 'async-error-handling',
    sectionNumber: 1,
    sectionName: 'Contact form asynchronous error handling',
    title: 'Unhandled Promise Rejection on Server Action (Bare Await Crash)',
    severity: 'critical',
    verificationStatus: 'VERIFIED',
    prototypeStatus: 'IMPLEMENTED',
    categoryIcon: Terminal,
    location: '/_next/static/chunks/app/(marketing)/contact/page-a581c8d7462124d9.js',
    evidenceType: 'Decompiled Production Next.js 15 Client Chunk',
    originalObservation:
      'The contact form submit handler invokes `let r = await x(a);` without an enclosing `try...catch...finally` block. When the Server Action rejects (e.g. transient cellular network drop, 500 internal server error, or network timeout), unhandled rejection halts execution immediately before `t(!1)` can reset the loading state or `n(...)` can render user-facing guidance.',
    evidenceSnippet: `// Captured directly from Cynbit production chunk page-a581c8d7462124d9.js
d = async (e) => {
  e.preventDefault(), t(!0), n(null);
  let a = new FormData(e.currentTarget),
    r = await x(a); // ⚠️ Uncaught promise rejection if Server Action rejects!
  t(!1), r.success ? i(!0) : n("Something went wrong...");
};`,
    whyItMatters:
      'Server Actions operate over standard HTTP POST requests that are subject to unpredictable mobile connection drops, server cold starts, and infrastructure blips. Without promise boundary catching, client execution aborts mid-function. The submit button is left permanently frozen in a disabled "Submitting..." state with an indefinite spinner.',
    technicalImpact:
      'Permanent client-side UI freeze. High-value enterprise prospective client inquiries are silently abandoned during network fluctuations, with zero feedback, no retry option, and total loss of entered scoping brief.',
    recommendedFix:
      'Wrap all asynchronous Server Action calls in try/catch/finally. Always reset loading state (`setIsSubmitting(false)`) inside the finally block. Differentiate HTTP 400, 429, and 500 status codes to provide actionable recovery options. Implement a strict request timeout with AbortController.',
    prototypeStatusDetail:
      'Implemented in `ImprovedDiscoveryEngine.jsx` with full try/catch/finally, 10s AbortController timeout, differentiated HTTP error states, and isolated laboratory demonstration in `OriginalForm.jsx`.',
    canOpenDiff: true,
  },
  {
    id: 'accessibility-semantics',
    sectionNumber: 2,
    sectionName: 'Accessibility and form semantics',
    title: 'Missing Input IDs and Orphaned Labels (WCAG 2.1 AA Violations)',
    severity: 'high',
    verificationStatus: 'VERIFIED',
    prototypeStatus: 'IMPLEMENTED',
    categoryIcon: Sparkles,
    location: 'HTML DOM at https://cynbit.in/contact',
    evidenceType: 'Live DOM & Accessibility Tree Inspection',
    originalObservation:
      'Direct inspection of the live production DOM on cynbit.in/contact reveals that all five form fields use `<label>` tags with no `for` (or `htmlFor` in React) attributes, and corresponding `<input>` and `<textarea>` elements have no `id` attributes. Field errors are not linked via `aria-describedby`, invalid fields lack `aria-invalid`, and status changes lack ARIA live regions.',
    evidenceSnippet: `<!-- Captured directly from Cynbit production DOM -->
<div class="space-y-2">
  <label class="block text-sm font-medium text-neutral-300">Full Name</label>
  <input name="fullName" type="text" class="w-full rounded-lg bg-neutral-900 border ..." />
</div>
<!-- ⚠️ No 'id' attribute on input, no 'htmlFor' on label, no aria-describedby -->`,
    whyItMatters:
      'Screen readers (Apple VoiceOver, NVDA, JAWS) rely on explicit programmatic associations (`id` + `htmlFor`) to announce field labels when users tab into controls. Without them, screen readers announce only "Edit text, blank" without conveying the field title. Furthermore, clicking on the label does not focus the input, failing basic usability standards.',
    technicalImpact:
      'Non-compliance with WCAG 2.1 Level AA (Success Criteria 1.3.1 Info & Relationships, 2.1.1 Keyboard Navigation, 3.3.1 Error Identification, and 4.1.2 Name, Role, Value). Fails standard enterprise procurement and accessibility audits required by institutional and corporate clients.',
    recommendedFix:
      'Assign unique deterministic IDs to all inputs, selects, and textareas, and associate them with matching `<label htmlFor="...">`. Connect error messages with `aria-describedby`, add `aria-invalid={!!error}`, implement high-contrast visible focus indicators (`:focus-visible`), and announce status changes with `aria-live="polite"`.',
    prototypeStatusDetail:
      'Fully implemented across all steps of `ImprovedDiscoveryEngine.jsx`: all inputs have deterministic IDs, matching `htmlFor`, accessible descriptions, `aria-invalid`, high-contrast focus rings, and an ARIA live region.',
  },
  {
    id: 'spam-throttling',
    sectionNumber: 3,
    sectionName: 'Spam prevention and request throttling',
    title: 'Zero Submission Throttling, Timing Checks, or Honeypot Bot Traps',
    severity: 'high',
    verificationStatus: 'VERIFIED',
    prototypeStatus: 'IMPLEMENTED',
    categoryIcon: Lock,
    location: 'Client Submission Handler & Server Action Gateway',
    evidenceType: 'Production Bundle Analysis & Network Stream Inspection',
    originalObservation:
      'The production inquiry handler sends raw FormData directly to the Server Action with zero client-side or edge rate-limiting headers, zero hidden honeypot decoy fields, and zero submission timing verification. Automated scripts can submit forms in under 150ms repeatedly.',
    evidenceSnippet: `// Production bundle: naked FormData dispatch to Server Action
let a = new FormData(e.currentTarget);
let r = await x(a); // No honeypot decoy, no timing challenge, no throttle headers`,
    whyItMatters:
      'Public contact forms without bot mitigation are targets for automated web crawlers. Uncontrolled spam floods sales inboxes, pollutes CRM pipelines, depletes transactional email quotas (Resend/SES), and risks blacklisting Cynbit’s corporate sending domain due to high spam report rates.',
    technicalImpact:
      'High administrative overhead triaging spam leads, potential denial-of-wallet through third-party API exhaustion, and vulnerability to automated request flooding.',
    recommendedFix:
      'Deploy layered defense-in-depth: (1) Invisible honeypot field (`website_url_hp`) with `aria-hidden="true"` and `tabIndex={-1}` to trap dumb scrapers; (2) Progressive submission velocity check (flagging dispatches < 3s); (3) Authoritative distributed Redis Token Bucket rate limiting on the backend (3 inquiries/hr per IP); (4) Non-interactive Cloudflare Turnstile bot verification.',
    prototypeStatusDetail:
      'Implemented in prototype: hidden honeypot input, progressive speed trap, and 3 submissions/hour sliding window limiter with UI countdown in `rateLimit.js`. Authoritative server-side Redis and HMAC token architecture fully specified in `SECURITY_ARCHITECTURE.md`.',
  },
  {
    id: 'draft-persistence',
    sectionNumber: 4,
    sectionName: 'Draft persistence and data loss',
    title: 'Transient React State Without In-Flight Auto-Save (Accidental Data Loss)',
    severity: 'medium',
    verificationStatus: 'VERIFIED',
    prototypeStatus: 'IMPLEMENTED',
    categoryIcon: Layers,
    location: 'Client Form State Management',
    evidenceType: 'Production JavaScript Component Analysis',
    originalObservation:
      'The production contact form manages inputs purely inside transient React `useState` hooks. No synchronization with `localStorage` or `sessionStorage` exists. An accidental browser reload, navigation swipe, or mobile tab purge completely erases all user progress.',
    evidenceSnippet: `// Production form state in page-a581c8d7462124d9.js
const [t, setT] = useState(!1);
// ⚠️ No storage event listeners, no LocalStorage sync, no draft recovery`,
    whyItMatters:
      'Enterprise architecture scoping requires drafting detailed system requirements, current bottlenecks, and target milestones. Forcing an enterprise decision-maker who spent 10 minutes drafting a project brief to re-enter everything from scratch after an accidental reload guarantees lead abandonment.',
    technicalImpact:
      'Severe conversion funnel drop-off and friction among high-intent enterprise prospects drafting architectural briefs.',
    recommendedFix:
      'Implement debounced LocalStorage draft persistence with versioned schema (`v2`). Strictly whitelist project scoping parameters (title, description, tech stack, budget) while excluding sensitive personal information (PII) to honor privacy principles. Add visible "Draft saved" status indicators and user-confirmed draft reset.',
    prototypeStatusDetail:
      'Implemented via `src/utils/draftStorage.js` with 700ms debounce, privacy whitelisting (excluding name/email/phone), versioned schema validation, corrupted JSON recovery, and verified by 10 unit tests.',
  },
  {
    id: 'lead-qualification',
    sectionNumber: 5,
    sectionName: 'Enterprise enquiry qualification',
    title: 'Unstructured B2B Lead Intake (Generic Form vs Discovery Engine)',
    severity: 'medium',
    verificationStatus: 'VERIFIED',
    prototypeStatus: 'IMPLEMENTED',
    categoryIcon: FileText,
    location: 'Lead Intake Funnel at https://cynbit.in/contact',
    evidenceType: 'Production Marketing Site Functional Review',
    originalObservation:
      'The production contact form consists of only 5 generic fields: Full Name, Email, Company, Industry, and an unstructured Message textarea. It fails to query engagement stream, system architectural scope, technology interest, implementation timeline, or investment budget.',
    evidenceSnippet: `<!-- Production generic contact form inputs -->
<input name="fullName" placeholder="Full Name" />
<input name="email" placeholder="Email" />
<input name="company" placeholder="Company" />
<input name="industry" placeholder="Industry" />
<textarea name="message" placeholder="Message"></textarea>`,
    whyItMatters:
      'Cynbit is an enterprise AI & software engineering consultancy specializing in Autonomous AI Agents, Full-Stack Architecture, Cloud & Infrastructure, and BitElevate Corporate acceleration. A generic "leave a message" form fails to capture essential architectural parameters, requiring multiple manual discovery calls just to establish basic technical feasibility.',
    technicalImpact:
      'Extended B2B sales cycles, higher pre-sales overhead, unstructured inquiries, and missed opportunities to showcase technical authority.',
    recommendedFix:
      'Upgrade the contact page to an interactive Architecture Discovery Engine featuring: (1) Engagement Stream Selection; (2) Architectural Scoping; (3) Technology Stack Interest; (4) Timeline & Investment Horizons; (5) Enterprise Verification & Stakeholder Details.',
    prototypeStatusDetail:
      'Implemented as a 6-step interactive enterprise discovery wizard with real-time budget range estimation, 12 selectable technology tags, and structured JSON payload generation in `ImprovedDiscoveryEngine.jsx`.',
  },
  {
    id: 'seo-social-meta',
    sectionNumber: 6,
    sectionName: 'SEO title and social preview metadata',
    title: 'Title Tag SERP Truncation (83 Chars) & Broken Social Share Previews (SVG Image)',
    severity: 'medium',
    verificationStatus: 'VERIFIED',
    prototypeStatus: 'NOT IMPLEMENTED',
    categoryIcon: ExternalLink,
    location: 'HTML <head> at https://cynbit.in/',
    evidenceType: 'Live HTTP GET Response & HTML Source Extraction',
    originalObservation:
      'Live HTML inspection reveals: (1) Title tag is 83 characters with duplicate brand suffix: "<title>Cynbit Technologies | AI Automation & Software Solutions Jaipur | Cynbit Technologies</title>"; (2) OpenGraph image specifies SVG: `<meta property="og:image" content="https://cynbit.in/logo.svg">`.',
    evidenceSnippet: `<!-- Captured directly from live cynbit.in HTML source -->
<title>Cynbit Technologies | AI Automation &amp; Software Solutions Jaipur | Cynbit Technologies</title>
<!-- ⚠️ 83 characters: exceeds Google's ~60-character SERP truncation limit -->

<meta property="og:image" content="https://cynbit.in/logo.svg" />
<meta name="twitter:image" content="https://cynbit.in/logo.svg" />
<!-- ⚠️ SVG image format is unsupported by WhatsApp, LinkedIn, Twitter/X, iMessage -->`,
    whyItMatters:
      'Google SERPs truncate title tags exceeding ~60 characters with ellipses (`...`), cutting off high-value regional and domain keywords. More critically, major social platforms (WhatsApp, LinkedIn, Twitter/X, Facebook, Slack, iMessage) do NOT render SVG formats in OpenGraph unfurling. Sharing Cynbit links across WhatsApp or LinkedIn results in an empty gray box with no preview card.',
    technicalImpact:
      'Diminished click-through rate (CTR) in organic Google Search and unprofessional broken preview cards during B2B client sharing on WhatsApp and LinkedIn.',
    recommendedFix:
      'Streamline SEO title to ~56 characters: `"Cynbit Technologies | AI & Enterprise Software Jaipur"`. Replace SVG social tags with a high-resolution 1200×630px PNG or WebP card (`https://cynbit.in/og-card.png`) featuring company branding and crisp typography.',
    prototypeStatusDetail:
      'Documented as a verified production engineering recommendation. (Not implemented in this client-side Vite prototype because Next.js root metadata belongs in the production server layout).',
  },
  {
    id: 'http-security-headers',
    sectionNumber: 7,
    sectionName: 'HTTP security headers',
    title: 'Missing Core Defensive Security Headers (CSP, Frame-Options, Content-Type)',
    severity: 'high',
    verificationStatus: 'VERIFIED',
    prototypeStatus: 'NOT IMPLEMENTED',
    categoryIcon: ShieldAlert,
    location: 'HTTP Response Headers on https://cynbit.in/',
    evidenceType: 'Live curl -I HTTP Response Header Inspection',
    originalObservation:
      'Inspecting live HTTP response headers from `curl -I https://cynbit.in/` confirms that critical defensive headers are omitted: Content-Security-Policy (CSP), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy are all missing. Only Strict-Transport-Security is present.',
    evidenceSnippet: `// Captured from live curl -I https://cynbit.in/
HTTP/2 200
server: Vercel
strict-transport-security: max-age=63072000; includeSubDomains; preload
// ⚠️ MISSING: Content-Security-Policy
// ⚠️ MISSING: X-Frame-Options / frame-ancestors
// ⚠️ MISSING: X-Content-Type-Options
// ⚠️ MISSING: Referrer-Policy
// ⚠️ MISSING: Permissions-Policy`,
    whyItMatters:
      'Without CSP, an application is vulnerable to Cross-Site Scripting (XSS) and unauthorized data exfiltration. Without `X-Frame-Options` or CSP `frame-ancestors \'none\'`, third-party origins can embed the contact form inside an invisible iframe to execute Clickjacking attacks. Without `X-Content-Type-Options: nosniff`, browsers may execute untrusted files through MIME sniffing.',
    technicalImpact:
      'Heightened vulnerability to client-side injection, clickjacking overlays, credential harvesting, and automatic failure in enterprise vendor security risk assessments (SOC 2, ISO 27001).',
    recommendedFix:
      'Configure comprehensive security headers in Next.js `next.config.js` or edge middleware. Enforce `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.',
    prototypeStatusDetail:
      'Production configuration blueprint provided in this report and `SECURITY_ARCHITECTURE.md`. (Deliberately not applied globally to the Vite prototype to prevent restricting local Vite HMR and debugging tools).',
    hasConfigSnippet: true,
  },
  {
    id: 'mobile-recovery',
    sectionNumber: 8,
    sectionName: 'Mobile usability and error recovery',
    title: 'Zero Network Failure Recovery, Offline Detection, or Direct Escalation Fallbacks',
    severity: 'critical',
    verificationStatus: 'VERIFIED',
    prototypeStatus: 'IMPLEMENTED',
    categoryIcon: Smartphone,
    location: 'Mobile Viewport & Network Offline Lifecycle',
    evidenceType: 'Mobile Viewport & Network Throttle Simulation',
    originalObservation:
      'When an inquiry submission fails due to cellular disconnect (e.g., in transit, weak 4G/5G, or server timeout), the production page provides no retry mechanism, no option to copy the composed brief, no offline banner, and no pre-filled WhatsApp/email escalation buttons.',
    evidenceSnippet: `// Production code behavior on mobile network drop:
let r = await x(a); // Rejects on network drop -> jumps out of execution
// User is left with a spinning, frozen submit button and no recovery options`,
    whyItMatters:
      'Mobile traffic represents over 55% of enterprise web visits in India. Mobile network connections frequently drop or switch towers. When an inquiry fails silently or irrecoverably, the user feels abandoned and will not re-type their message.',
    technicalImpact:
      'Permanent loss of inbound mobile opportunities. Negative brand perception for a technology consultancy advertising modern digital transformation.',
    recommendedFix:
      'Listen to `navigator.onLine` and `window.addEventListener("online"/"offline")` to display a sticky offline banner. When submission fails, preserve 100% of form inputs and display a dedicated Submission Recovery Banner offering 4 instant recovery paths: (1) One-click "Retry Submission"; (2) "Copy Project Brief" to clipboard; (3) "Open in Email"; (4) "WhatsApp Direct" with verified business contact.',
    prototypeStatusDetail:
      'Fully implemented in `ImprovedDiscoveryEngine.jsx`, `OfflineBanner.jsx`, and `SubmissionRecoveryBanner.jsx`. Features 1-click retry, clipboard copy with fallback, direct email to `opportunities@cynbit.in`, and verified WhatsApp escalation (`+91-89479-62667`).',
  },
]

// Verification Status Metadata according to exact specification
const VERIFICATION_STATUS_META = {
  VERIFIED: {
    label: 'VERIFIED',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
    description: 'Supported by actual inspected source code or captured evidence.',
    icon: CheckCircle2,
  },
  REPRODUCED: {
    label: 'REPRODUCED',
    badgeClass: 'bg-primary/10 text-primary border-primary/30',
    description: 'Successfully demonstrated in our isolated prototype.',
    icon: RefreshCw,
  },
  'NEEDS VERIFICATION': {
    label: 'NEEDS VERIFICATION',
    badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300',
    description: 'Requires production browser testing, HTTP inspection or source access.',
    icon: AlertTriangle,
  },
  'NOT IMPLEMENTED': {
    label: 'NOT IMPLEMENTED',
    badgeClass: 'bg-surface-container text-on-surface-variant border-outline-variant/30',
    description: 'Identified but not yet fixed in the prototype.',
    icon: ShieldAlert,
  },
}

export default function AuditReport({ onOpenCodeDiff }) {
  const [activeSection, setActiveSection] = useState('all')
  const [activeStatusFilter, setActiveStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [expandedSections, setExpandedSections] = useState({})

  // Toggle individual card expansion
  const toggleSection = (id) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Copy code snippet to clipboard with safety fallback
  const handleCopy = async (id, text) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
      }
    } catch (err) {
      console.warn('Clipboard write prevented:', err)
    }
  }

  // Filtered Findings based on Section, Status, and Search Query
  const filteredFindings = useMemo(() => {
    return AUDIT_FINDINGS.filter((finding) => {
      // Filter by section
      if (activeSection !== 'all' && finding.id !== activeSection) {
        return false
      }

      // Filter by verification status or prototype status
      if (activeStatusFilter !== 'all') {
        if (
          finding.verificationStatus !== activeStatusFilter &&
          finding.prototypeStatus !== activeStatusFilter
        ) {
          return false
        }
      }

      // Search query across title, description, impact, remediation, location
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase()
        const matchTitle = finding.title.toLowerCase().includes(query)
        const matchIssue = finding.issueTitle?.toLowerCase().includes(query)
        const matchObs = finding.originalObservation.toLowerCase().includes(query)
        const matchImpact = finding.technicalImpact.toLowerCase().includes(query)
        const matchFix = finding.recommendedFix.toLowerCase().includes(query)
        const matchLocation = finding.location.toLowerCase().includes(query)

        if (!matchTitle && !matchIssue && !matchObs && !matchImpact && !matchFix && !matchLocation) {
          return false
        }
      }

      return true
    })
  }, [activeSection, activeStatusFilter, searchQuery])

  // Statistics
  const stats = useMemo(() => {
    const total = AUDIT_FINDINGS.length
    const verified = AUDIT_FINDINGS.filter((f) => f.verificationStatus === 'VERIFIED').length
    const implemented = AUDIT_FINDINGS.filter((f) => f.prototypeStatus === 'IMPLEMENTED').length
    const advisory = AUDIT_FINDINGS.filter((f) => f.prototypeStatus === 'NOT IMPLEMENTED').length

    return { total, verified, implemented, advisory }
  }, [])

  return (
    <div className="space-y-8 text-left font-body">
      {/* Top Banner & Header */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-5 sm:p-8 md:p-10 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-headline font-bold text-[11px] uppercase tracking-widest border border-tertiary/20 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-on-tertiary-fixed animate-pulse" />
              Senior Engineering Technical Assessment
            </div>
            <h1 className="text-3xl sm:text-4xl font-headline font-black text-on-surface tracking-tight">
              Production Website Audit &amp; Architectural Review
            </h1>
            <p className="text-sm text-on-surface-variant font-medium leading-relaxed opacity-90">
              Rigorous technical evaluation of Cynbit Technologies&apos; production deployment at{' '}
              <a
                href="https://cynbit.in/contact"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-bold hover:underline inline-flex items-center gap-1"
              >
                cynbit.in/contact
                <ExternalLink className="w-3 h-3" />
              </a>
              . All findings are categorized into 8 core architectural domains with captured evidence, technical impact,
              and verifiable remediation.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenCodeDiff}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-6 py-3 rounded-full text-xs font-headline font-bold bg-primary text-white hover:bg-primary-container transition-all shrink-0 shadow-md active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <FileCode className="w-4 h-4" />
            <span>Inspect Decompiled Bug</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Engineering Review Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-outline-variant/15">
          <div className="bg-surface-container-low/60 rounded-2xl p-4 border border-outline-variant/10">
            <div className="text-2xl font-headline font-black text-on-surface">{stats.total}</div>
            <div className="text-xs text-on-surface-variant font-medium mt-1">Core Audit Sections</div>
          </div>
          <div className="bg-surface-container-low/60 rounded-2xl p-4 border border-outline-variant/10">
            <div className="text-2xl font-headline font-black text-emerald-600 dark:text-emerald-400">
              {stats.verified} / {stats.total}
            </div>
            <div className="text-xs text-on-surface-variant font-medium mt-1">Verified with Evidence</div>
          </div>
          <div className="bg-surface-container-low/60 rounded-2xl p-4 border border-outline-variant/10">
            <div className="text-2xl font-headline font-black text-primary">
              {stats.implemented}
            </div>
            <div className="text-xs text-on-surface-variant font-medium mt-1">Fixed in Prototype</div>
          </div>
          <div className="bg-surface-container-low/60 rounded-2xl p-4 border border-outline-variant/10">
            <div className="text-2xl font-headline font-black text-on-surface-variant">
              {stats.advisory}
            </div>
            <div className="text-xs text-on-surface-variant font-medium mt-1">Production Advisories</div>
          </div>
        </div>
      </div>

      {/* Interactive Controls Bar: Search & Status Filters */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search findings by keyword, file, or impact..."
              aria-label="Search audit findings"
              className="w-full pl-11 pr-4 py-2.5 rounded-full text-xs bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-body"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant hover:text-on-surface"
              >
                Clear
              </button>
            )}
          </div>

          {/* Verification Status Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs text-on-surface-variant font-bold flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {['all', 'VERIFIED', 'IMPLEMENTED', 'NOT IMPLEMENTED'].map((statusKey) => (
              <button
                key={statusKey}
                type="button"
                onClick={() => setActiveStatusFilter(statusKey)}
                className={`px-3 py-1.5 rounded-full text-xs font-headline font-bold transition-all shrink-0 active:scale-95 cursor-pointer ${
                  activeStatusFilter === statusKey
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/15'
                }`}
              >
                {statusKey === 'all' ? 'All Statuses' : statusKey}
              </button>
            ))}
          </div>
        </div>

        {/* Section Navigation Tabs (All 8 Required Sections) */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-outline-variant/10 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`px-4 py-2 rounded-full text-xs font-headline font-bold transition-all shrink-0 active:scale-95 cursor-pointer ${
              activeSection === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface-container-low text-on-surface border border-outline-variant/15 hover:border-primary/40'
            }`}
          >
            All 8 Sections ({AUDIT_FINDINGS.length})
          </button>
          {AUDIT_FINDINGS.map((finding) => (
            <button
              key={finding.id}
              type="button"
              onClick={() => setActiveSection(finding.id)}
              className={`px-4 py-2 rounded-full text-xs font-headline font-bold transition-all shrink-0 active:scale-95 cursor-pointer ${
                activeSection === finding.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container-low text-on-surface border border-outline-variant/15 hover:border-primary/40'
              }`}
            >
              {finding.sectionNumber}. {finding.sectionName.split(' ')[0]}...
            </button>
          ))}
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-6">
        {filteredFindings.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-12 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="font-headline font-bold text-lg text-on-surface">No findings match your filter</h3>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto">
              Try clearing your search query or setting the status filter back to &quot;All Statuses&quot;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setActiveSection('all')
                setActiveStatusFilter('all')
              }}
              className="px-4 py-2 rounded-full text-xs font-headline font-bold bg-primary text-white hover:bg-primary-container transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isExpanded = expandedSections[finding.id] ?? true
            const statusConfig = VERIFICATION_STATUS_META[finding.verificationStatus] || VERIFICATION_STATUS_META.VERIFIED
            const StatusIcon = statusConfig.icon
            const CategoryIcon = finding.categoryIcon || FileText

            return (
              <article
                key={finding.id}
                className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-md space-y-6"
              >
                {/* Header Row: Section #, Badges, Expand Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/10">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-headline font-black text-xs">
                      {finding.sectionNumber}
                    </span>
                    <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                      <CategoryIcon className="w-3.5 h-3.5 text-primary" />
                      Section {finding.sectionNumber}: {finding.sectionName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Severity Badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-headline font-black uppercase tracking-wider ${
                        finding.severity === 'critical'
                          ? 'bg-error-container text-on-error-container border border-error/20'
                          : finding.severity === 'high'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-200'
                          : 'bg-surface-container text-on-surface border border-outline-variant/20'
                      }`}
                    >
                      {finding.severity} Severity
                    </span>

                    {/* Verification Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-headline font-black uppercase tracking-wider border ${statusConfig.badgeClass}`}
                      title={statusConfig.description}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>

                    {/* Prototype Implementation Status Badge */}
                    {finding.prototypeStatus === 'IMPLEMENTED' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-headline font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Fixed in Prototype
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-headline font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant border border-outline-variant/20">
                        <ShieldCheck className="w-3 h-3" />
                        Production Advisory
                      </span>
                    )}

                    {/* Expand/Collapse Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleSection(finding.id)}
                      className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
                      aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Title & Location */}
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-headline font-bold text-on-surface leading-snug">
                    {finding.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-primary bg-surface-container-low px-3 py-1.5 rounded-xl border border-outline-variant/10 break-all">
                    <span className="font-bold text-on-surface-variant">Location:</span>
                    <span>{finding.location}</span>
                    <span className="text-on-surface-variant">({finding.evidenceType})</span>
                  </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="space-y-6 pt-2">
                    {/* Original Observation & Evidence */}
                    <div className="space-y-3">
                      <div className="text-xs font-headline font-bold text-on-surface uppercase tracking-wider">
                        1. Original Behavior &amp; Captured Evidence:
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {finding.originalObservation}
                      </p>

                      {/* Code Snippet Box */}
                      {finding.evidenceSnippet && (
                        <div className="relative rounded-2xl bg-surface-container-lowest border border-outline-variant/20 overflow-hidden font-mono text-xs">
                          <div className="flex items-center justify-between px-4 py-2 bg-surface-container-low border-b border-outline-variant/10 text-[11px] text-on-surface-variant">
                            <span className="font-bold">Captured Code / HTTP Evidence</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(finding.id, finding.evidenceSnippet)}
                              className="inline-flex items-center gap-1 text-[10px] font-headline font-bold text-primary hover:underline cursor-pointer"
                            >
                              {copiedId === finding.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Snippet</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="p-4 text-[11px] text-on-surface leading-relaxed overflow-x-auto scrollbar-none">
                            <code>{finding.evidenceSnippet}</code>
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Why It Matters & Technical Impact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-surface-container-low/50 rounded-2xl p-4 border border-outline-variant/10 space-y-1.5">
                        <strong className="text-on-surface font-headline font-bold block text-[11px] uppercase tracking-wider">
                          2. Why It Matters:
                        </strong>
                        <p className="text-on-surface-variant leading-relaxed">
                          {finding.whyItMatters}
                        </p>
                      </div>

                      <div className="bg-surface-container-low/50 rounded-2xl p-4 border border-outline-variant/10 space-y-1.5">
                        <strong className="text-on-surface font-headline font-bold block text-[11px] uppercase tracking-wider">
                          3. Technical Impact:
                        </strong>
                        <p className="text-on-surface-variant leading-relaxed">
                          {finding.technicalImpact}
                        </p>
                      </div>
                    </div>

                    {/* Recommended Fix */}
                    <div className="bg-surface-container-low/80 rounded-2xl p-4 sm:p-5 border border-outline-variant/15 space-y-2 text-xs">
                      <strong className="text-on-surface font-headline font-bold block text-[11px] uppercase tracking-wider text-primary">
                        4. Recommended Production Fix:
                      </strong>
                      <p className="text-on-surface-variant leading-relaxed">
                        {finding.recommendedFix}
                      </p>
                    </div>

                    {/* Special Deep-Dive: HTTP Security Headers Production Config Block */}
                    {finding.hasConfigSnippet && (
                      <div className="space-y-3 pt-2">
                        <div className="text-xs font-headline font-bold text-on-surface uppercase tracking-wider flex items-center justify-between">
                          <span>Production Next.js (`next.config.js`) Defensive Headers:</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                'headers-snippet',
                                `// next.config.js - Enterprise Security Headers
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; connect-src 'self' https://api.cynbit.in; frame-ancestors 'none'; img-src 'self' data: https:;",
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};`
                              )
                            }
                            className="inline-flex items-center gap-1 text-[10px] font-headline font-bold text-primary hover:underline cursor-pointer"
                          >
                            {copiedId === 'headers-snippet' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Config</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4 font-mono text-[11px] text-on-surface overflow-x-auto">
                          <pre>
                            <code>{`// next.config.js - Enterprise Security Headers
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; connect-src 'self' https://api.cynbit.in; frame-ancestors 'none'; img-src 'self' data: https:;",
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};`}</code>
                          </pre>
                        </div>
                        <p className="text-[11px] text-on-surface-variant italic">
                          Note: This defensive policy is supplied as a production specification. It is not injected into the local Vite developer harness to prevent blocking Vite hot module replacement (HMR) and development tools.
                        </p>
                      </div>
                    )}

                    {/* Prototype Implementation Status Footer */}
                    <div className="pt-4 border-t border-outline-variant/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                      <div>
                        <strong className="text-on-surface font-headline font-bold">5. Prototype Implementation Status: </strong>
                        <span className="text-on-surface-variant">{finding.prototypeStatusDetail}</span>
                      </div>

                      {finding.canOpenDiff && (
                        <button
                          type="button"
                          onClick={onOpenCodeDiff}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-headline font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all shrink-0 cursor-pointer"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          <span>View Code Diff</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}

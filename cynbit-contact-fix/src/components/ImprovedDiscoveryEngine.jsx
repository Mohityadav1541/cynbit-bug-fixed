import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Save,
  Check,
  WifiOff,
  Sparkles,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import ProgressBar from './discovery/ProgressBar'
import Step1Stream from './discovery/Step1Stream'
import Step2Details from './discovery/Step2Details'
import Step3Tech from './discovery/Step3Tech'
import Step4TimelineBudget from './discovery/Step4TimelineBudget'
import Step5Contact from './discovery/Step5Contact'
import Step6Review from './discovery/Step6Review'
import SummarySidebar from './discovery/SummarySidebar'
import { SubmissionRecoveryBanner } from './discovery/SubmissionRecoveryBanner'
import { ClearDraftModal } from './discovery/ClearDraftModal'
import { useDraftPersistence } from '../hooks/useDraftPersistence'
import { loadScopingDraft } from '../utils/draftStorage'
import {
  validateFullName,
  validateEmail,
  validatePhone,
  validateProjectTitle,
  validateProjectDescription,
  sanitizeInput,
} from '../utils/validation'
import {
  checkRateLimit,
  recordSubmission,
  createTimestamp,
  verifySubmissionTiming,
  MIN_COMPLETION_TIME_MS,
} from '../utils/rateLimit'
import { submitInquiryMock, SIMULATION_MODES } from '../utils/mockApi'
import { submitInquiryLive, checkBackendHealth } from '../utils/apiClient'
import { CYNBIT_CONFIG, SYNTHETIC_DEMO_DATA } from '../config/cynbitConfig'

const INITIAL_FORM_DATA = {
  serviceStream: 'ai-agents',
  projectTitle: '',
  projectDescription: '',
  businessObjective: '',
  mainChallenges: '',
  expectedFunctionality: '',
  techFocus: ['React', 'Next.js', 'Python', 'AI/LLM Integration'],
  customTech: '',
  timeline: '1-3-months',
  budgetIndex: 2,
  isBudgetUndecided: false,
  fullName: '',
  email: '',
  phone: '',
  company: '',
  website_url_hp: '',
}

const SUBMISSION_TIMEOUT_MS = 6000

export default function ImprovedDiscoveryEngine({ simulationMode, isReviewerMode = false }) {
  const effectiveSimulationMode = isReviewerMode ? simulationMode : SIMULATION_MODES.SUCCESS
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState([])

  // Form State initialized with untrusted LocalStorage validation (scoping fields only)
  const [formData, setFormData] = useState(() => {
    try {
      const restored = loadScopingDraft()
      if (restored.exists && restored.valid && restored.scoping) {
        return { ...INITIAL_FORM_DATA, ...restored.scoping }
      }
    } catch {
      // ignore
    }
    return INITIAL_FORM_DATA
  })

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [stepErrorAnnouncement, setStepErrorAnnouncement] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)
  const [rateLimitInfo, setRateLimitInfo] = useState(() => checkRateLimit())
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [backendStatus, setBackendStatus] = useState({ checked: false, online: false, storage: null })

  // Check live Express backend health on mount
  useEffect(() => {
    let mounted = true
    checkBackendHealth().then((res) => {
      if (mounted) {
        setBackendStatus({
          checked: true,
          online: res.online,
          storage: res.data?.storage || null,
        })
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Reusable Draft Auto-Persistence Hook with Privacy & Versioning
  const handleDraftRestored = useCallback((restoredScoping) => {
    setFormData((prev) => ({ ...prev, ...restoredScoping }))
  }, [])

  const {
    storageSupported,
    hasSavedDraft,
    isSaving,
    lastSavedTime,
    isConfirmModalOpen,
    promptClearDraft,
    confirmClearDraft,
    cancelClearDraft,
    clearDraftOnSubmit,
  } = useDraftPersistence(formData, handleDraftRestored, 700)

  // Double-submission lock, successful submission guard, and anti-bot timing
  const isSubmittingRef = useRef(false)
  const hasSubmittedSuccessfullyRef = useRef(false)
  const formLoadTime = useRef(createTimestamp())

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Fast-track synthetic demo project population (Alex Demo / Example Demonstration Inc.)
  const handleFillSample = useCallback(() => {
    setFormData({
      ...SYNTHETIC_DEMO_DATA,
    })
    setCompletedSteps([1, 2, 3, 4, 5])
    setCurrentStep(6)
    setSubmitResult(null)
    window.scrollTo({ top: 140, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    window.addEventListener('cynbit:fill-sample', handleFillSample)
    return () => window.removeEventListener('cynbit:fill-sample', handleFillSample)
  }, [handleFillSample])

  // Execute confirmed draft discard
  const handleExecuteClearDraft = () => {
    confirmClearDraft(() => {
      setFormData(INITIAL_FORM_DATA)
      setErrors({})
      setTouched({})
      setCurrentStep(1)
    })
  }

  // Field change handler
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (touched[name]) {
      validateSingleField(name, value)
    }
    if (stepErrorAnnouncement) {
      setStepErrorAnnouncement(null)
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    validateSingleField(name, value)
  }

  const validateSingleField = (name, value) => {
    let result = { valid: true, error: null }
    if (name === 'fullName') result = validateFullName(value)
    if (name === 'email') result = validateEmail(value)
    if (name === 'phone') result = validatePhone(value)
    if (name === 'projectTitle') result = validateProjectTitle(value)
    if (name === 'projectDescription') result = validateProjectDescription(value)

    setErrors((prev) => ({ ...prev, [name]: result.valid ? null : result.error }))
    return result.valid
  }

  // Toggle tech selection
  const handleToggleTech = (tech) => {
    setFormData((prev) => {
      const exists = prev.techFocus.includes(tech)
      const updated = exists ? prev.techFocus.filter((t) => t !== tech) : [...prev.techFocus, tech]
      return { ...prev, techFocus: updated }
    })
  }

  // Step validation gate
  const validateStep = (step) => {
    if (step === 1) {
      return !!formData.serviceStream
    }
    if (step === 2) {
      const titleValid = validateSingleField('projectTitle', formData.projectTitle)
      const descValid = validateSingleField('projectDescription', formData.projectDescription)
      setTouched((prev) => ({ ...prev, projectTitle: true, projectDescription: true }))

      if (!titleValid || !descValid) {
        const titleErr = validateProjectTitle(formData.projectTitle).error
        const descErr = validateProjectDescription(formData.projectDescription).error
        const messages = [titleErr, descErr].filter(Boolean)
        setStepErrorAnnouncement(`Please correct the following: ${messages.join('. ')}`)

        setTimeout(() => {
          if (!titleValid) {
            document.getElementById('field-projectTitle')?.focus()
          } else if (!descValid) {
            document.getElementById('field-projectDescription')?.focus()
          }
        }, 50)
        return false
      }
      return true
    }
    if (step === 3) {
      return true // Tech stack optional / multiple
    }
    if (step === 4) {
      return !!formData.timeline
    }
    if (step === 5) {
      const nameValid = validateSingleField('fullName', formData.fullName)
      const emailValid = validateSingleField('email', formData.email)
      const phoneValid = validatePhone(formData.phone)
      setTouched((prev) => ({ ...prev, fullName: true, email: true, phone: true }))

      if (!nameValid || !emailValid || !phoneValid) {
        const nameErr = validateFullName(formData.fullName).error
        const emailErr = validateEmail(formData.email).error
        const phoneErr = validatePhone(formData.phone).error
        const messages = [nameErr, emailErr, phoneErr].filter(Boolean)
        setStepErrorAnnouncement(`Please correct the following: ${messages.join('. ')}`)

        setTimeout(() => {
          if (!nameValid) {
            document.getElementById('field-fullName')?.focus()
          } else if (!emailValid) {
            document.getElementById('field-email')?.focus()
          } else if (!phoneValid) {
            document.getElementById('field-phone')?.focus()
          }
        }, 50)
        return false
      }
      return true
    }
    return true
  }

  // Navigation handlers
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setStepErrorAnnouncement(null)
      setCompletedSteps((prev) => (prev.includes(currentStep) ? prev : [...prev, currentStep]))
      setCurrentStep((prev) => Math.min(prev + 1, 6))
      window.scrollTo({ top: 120, behavior: 'smooth' })
    }
  }

  const handlePrevStep = () => {
    setStepErrorAnnouncement(null)
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    window.scrollTo({ top: 120, behavior: 'smooth' })
  }

  const handleJumpToStep = (step) => {
    setStepErrorAnnouncement(null)
    setCurrentStep(step)
    window.scrollTo({ top: 120, behavior: 'smooth' })
  }

  /**
   * Robust Asynchronous Submission Pipeline
   * Wrapped in try / catch / finally
   * Loading state is ALWAYS reset in finally.
   * Handles timeouts via AbortController, offline conditions, HTTP 400, 429, 500, network crashes.
   */
  const handleSubmit = async (e) => {
    if (e) e.preventDefault()

    // 1. Guard against duplicate / concurrent submission or already submitted
    if (submitting || isSubmittingRef.current || hasSubmittedSuccessfullyRef.current) {
      console.warn('Duplicate submission prevented by concurrency lock.')
      return
    }

    // 2. Offline check
    if (!navigator.onLine || isOffline) {
      setSubmitResult({
        success: false,
        error: 'Submission halted: No active internet connection. All specifications are safely stored on your device in LocalStorage. Please reconnect or use the alternative recovery channels below.',
        errorType: 'OFFLINE',
      })
      return
    }

    // 3. Client Rate limit check
    const limitCheck = checkRateLimit()
    if (!limitCheck.allowed) {
      setSubmitResult({
        success: false,
        error: limitCheck.message,
        errorType: 'RATE_LIMIT',
      })
      return
    }

    // 4. Form validation gate
    const step2Ok = validateStep(2)
    const step5Ok = validateStep(5)
    if (!step2Ok || !step5Ok) {
      handleJumpToStep(!step2Ok ? 2 : 5)
      return
    }

    // 5. Honeypot check: reject if website_url_hp is populated (do not expose honeypot logic to user)
    if (formData.website_url_hp && formData.website_url_hp.trim().length > 0) {
      setSubmitResult({
        success: false,
        error: 'Security verification failed: Your inquiry could not be verified by the Cynbit security gateway.',
        errorType: 'SECURITY_GATEWAY',
      })
      return
    }

    // 6. Submission timing check: flag suspicious submissions that are completed unrealistically quickly
    // Note: To avoid permanently rejecting genuine users, flag as a challenge and allow subsequent retry
    const timingCheck = verifySubmissionTiming(formLoadTime.current, MIN_COMPLETION_TIME_MS)
    if (timingCheck.suspicious) {
      // Advance formLoadTime so that reviewing and clicking retry passes the challenge
      formLoadTime.current = Date.now() - (MIN_COMPLETION_TIME_MS + 1000)
      setSubmitResult({
        success: false,
        error: 'Submission was completed unusually quickly. For automated security verification, please review your architectural blueprint and confirm submission again.',
        errorType: 'TIMING_CHALLENGE',
      })
      return
    }

    // Set locks & reset previous errors
    setSubmitting(true)
    isSubmittingRef.current = true
    setSubmitResult(null)

    // Set up AbortController with 6-second timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, SUBMISSION_TIMEOUT_MS)

    try {
      const streamTitles = {
        'ai-agents': 'Autonomous AI Agents',
        'full-stack': 'Full-Stack Architecture',
        'cloud-infra': 'Cloud & Infrastructure',
        'bitelevate': 'BitElevate Corporate',
      }
      const resolvedStream = streamTitles[formData.serviceStream] || formData.serviceStream || 'Full-Stack Architecture'

      const payload = {
        engagementStream: resolvedStream,
        serviceStream: formData.serviceStream,
        projectTitle: sanitizeInput(formData.projectTitle),
        projectDescription: sanitizeInput(formData.projectDescription),
        businessObjective: sanitizeInput(formData.businessObjective),
        mainChallenges: sanitizeInput(formData.mainChallenges),
        expectedFunctionality: sanitizeInput(formData.expectedFunctionality),
        techStack: formData.techFocus || [],
        techFocus: formData.techFocus,
        customTech: sanitizeInput(formData.customTech),
        timeline: formData.timeline,
        budgetRange: formData.isBudgetUndecided ? 'Undecided' : `Tier ${formData.budgetIndex}`,
        budgetBracket: formData.isBudgetUndecided ? 'Undecided' : formData.budgetIndex,
        fullName: sanitizeInput(formData.fullName),
        email: formData.email.trim().toLowerCase(),
        phone: sanitizeInput(formData.phone),
        company: sanitizeInput(formData.company),
        website_url_hp: sanitizeInput(formData.website_url_hp),
        timestamp: new Date().toISOString(),
      }

      // Execute submission based on active mode:
      // SIMULATION_MODES.SUCCESS -> Live Express API
      // Any other simulation mode -> Developer Simulator Mock
      let response
      if (effectiveSimulationMode === SIMULATION_MODES.SUCCESS) {
        response = await submitInquiryLive(payload, {
          signal: controller.signal,
        })
      } else {
        response = await submitInquiryMock(payload, effectiveSimulationMode, {
          signal: controller.signal,
        })
        if (response && response.success) {
          response.storageMode = 'simulated-mock'
        }
      }

      // Validate response shape
      if (!response || typeof response !== 'object' || typeof response.success !== 'boolean') {
        throw new Error('MalformedResponseError: Server gateway returned an unexpected response format.')
      }

      if (response.success) {
        // Success path: set lock, clear storage, record submission, celebrate
        hasSubmittedSuccessfullyRef.current = true
        recordSubmission()
        clearDraftOnSubmit()
        setSubmitResult({
          success: true,
          inquiryId: response.inquiryId,
          assignedArchitect: response.assignedArchitect,
          slaResponseHours: response.slaResponseHours,
          storageMode: response.storageMode || (effectiveSimulationMode === SIMULATION_MODES.SUCCESS ? 'local-fallback' : 'simulated-mock'),
          isLiveBackend: Boolean(response.isLiveBackend),
          data: payload,
        })

        try {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#006067', '#007b83', '#12629d', '#ffddb3'],
          })
        } catch {
          // ignore
        }
      } else {
        // Handle server-returned HTTP status codes
        let userMessage = response.error || 'The Cynbit gateway rejected the inquiry. Please try again or use the fallback channels.'
        if (response.statusCode === 400) {
          userMessage = 'HTTP 400 (Bad Request): The inquiry parameters were rejected by the validation server.'
        } else if (response.statusCode === 429) {
          userMessage = 'HTTP 429 (Rate Limited): Too many inquiries received from this network. Cooldown is active.'
        } else if (response.statusCode === 503) {
          userMessage = 'HTTP 503 (Service Unavailable): The database is temporarily unavailable. Your inquiry data has been preserved; please retry in a moment or use direct WhatsApp/Email dispatch.'
        } else if (response.statusCode === 500) {
          userMessage = 'HTTP 500 (Internal Server Error): The Cynbit dispatch gateway encountered an internal server exception.'
        }

        setSubmitResult({
          success: false,
          error: userMessage,
          errorType: response.errorType || 'SERVER_ERROR',
          statusCode: response.statusCode,
        })
      }
    } catch (err) {
      // Differentiate error types cleanly
      if (err.name === 'AbortError') {
        setSubmitResult({
          success: false,
          error: `Request timed out after ${SUBMISSION_TIMEOUT_MS / 1000} seconds. The Cynbit gateway took too long to respond. Your data is safely preserved.`,
          errorType: 'TIMEOUT',
        })
      } else if (err instanceof TypeError || (err.message && err.message.includes('fetch'))) {
        setSubmitResult({
          success: false,
          error: 'Network connection interrupted or Cynbit gateway was unreachable. Your draft has been safely saved in LocalStorage.',
          errorType: 'NETWORK_ERROR',
          details: err.message,
        })
      } else {
        setSubmitResult({
          success: false,
          error: err.message || 'An unexpected error occurred during submission. Your draft is safe.',
          errorType: 'UNEXPECTED_ERROR',
        })
      }
    } finally {
      // ALWAYS guaranteed to execute — prevents UI loading lockup
      clearTimeout(timeoutId)
      isSubmittingRef.current = false
      setSubmitting(false)
      setRateLimitInfo(checkRateLimit())
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Value Banner */}
      <section className="relative text-left">
        <div className="space-y-4 max-w-4xl">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-headline font-bold text-[10px] uppercase tracking-widest border border-tertiary/20 shadow-sm cursor-default">
            <div className="w-2 h-2 rounded-full bg-on-tertiary-fixed animate-pulse" />
            Inquiry Hub &bull; Enterprise Discovery Engine
          </div>

          <h1 className="text-4xl md:text-6xl font-headline font-black tracking-tighter leading-[1.1] text-on-surface italic">
            Architect Your Next <span className="text-gradient-primary">Chapter</span> With Us
          </h1>

          <p className="text-base md:text-lg text-on-surface-variant max-w-2xl font-body leading-relaxed font-medium opacity-80">
            Tell us what you’re building. Our senior engineering architects will analyze your specifications and prepare
            a tailored technical blueprint before we connect.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Synthetic Sample Data Trigger Button */}
            <button
              type="button"
              onClick={handleFillSample}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-headline font-bold border border-outline-variant/20 shadow-xs transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
              title="Populates all steps with synthetic demo specifications (Alex Demo, Example Demonstration Inc.)"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span>Fill Demo Sample Data</span>
            </button>

            {backendStatus.checked && (
              <div
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border shadow-xs transition-all ${
                  backendStatus.online
                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant/20'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    backendStatus.online ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span>
                  {backendStatus.online
                    ? `Express API: Connected (${backendStatus.storage?.mode === 'postgresql' ? 'PostgreSQL' : 'Local Fallback'})`
                    : 'Express API: Offline (Run: npm run server)'}
                </span>
              </div>
            )}
            {storageSupported && hasSavedDraft && (
              <div
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container text-on-surface text-xs font-semibold border border-outline-variant/20 shadow-xs transition-all"
              >
                {isSaving ? (
                  <Save className="w-3.5 h-3.5 text-primary animate-pulse" aria-hidden="true" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                )}
                <span>
                  {isSaving ? 'Saving Draft...' : `Draft Saved ${lastSavedTime ? `(${lastSavedTime})` : ''}`}
                </span>
                <span className="text-[10px] text-on-surface-variant/60 font-mono hidden sm:inline">&bull; Scoping Only</span>
              </div>
            )}
            {isOffline && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-on-error-container text-xs font-bold animate-pulse">
                <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Offline Detected</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Progress Track */}
      <ProgressBar
        currentStep={currentStep}
        onStepClick={handleJumpToStep}
        completedSteps={completedSteps}
      />

      {/* Accessible Step Validation Error Announcement */}
      {stepErrorAnnouncement && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-2xl bg-error-container text-on-error-container text-xs font-headline font-bold flex items-center gap-2.5 border border-error/20 text-left animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-error" aria-hidden="true" />
          <span>{stepErrorAnnouncement}</span>
        </div>
      )}

      {/* Main Form & Architecture Cards Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Dynamic Step Wizard */}
        <div className="lg:col-span-8 bg-surface-container-lowest p-5 sm:p-8 md:p-12 rounded-3xl md:rounded-[3rem] border border-outline-variant/15 shadow-sm hover:shadow-md transition-all duration-500">
          {submitResult && submitResult.success ? (
            /* Success State */
            <div className="py-12 px-4 flex flex-col items-center text-center space-y-6 animate-in fade-in duration-300">
              <div className="w-20 h-20 bg-primary-container text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/20">
                <CheckCircle2 className="w-10 h-10" aria-hidden="true" />
              </div>
              <div className="space-y-2 max-w-md">
                <span className="text-xs font-headline font-black uppercase tracking-[0.25em] text-primary">
                  Discovery Brief Confirmed
                </span>
                <h3 className="text-3xl font-headline font-black text-on-surface tracking-tight italic">
                  Inquiry Dispatched to Senior Architect
                </h3>
                <p className="text-on-surface-variant text-sm font-body leading-relaxed">
                  Your requirements have been structured and assigned to our digital architecture team in Jaipur.
                </p>
              </div>

              {/* Reference Card */}
              <div className="w-full max-w-md bg-surface-container-low border border-outline-variant/15 rounded-2xl p-5 text-left space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant">Inquiry Reference ID:</span>
                  <span className="text-primary font-bold">{submitResult.inquiryId}</span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant">Assigned Lead:</span>
                  <span className="text-on-surface font-semibold">{submitResult.assignedArchitect}</span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant">Estimated Response SLA:</span>
                  <span className="text-primary font-bold">Within {submitResult.slaResponseHours} Hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Storage Engine:</span>
                  {submitResult.storageMode === 'postgresql' ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">
                      PostgreSQL Database (pg Client Pool)
                    </span>
                  ) : submitResult.storageMode === 'local-development' || submitResult.storageMode === 'local-fallback' ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 border border-blue-500/30">
                      Local Development Store (JSON)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 border border-purple-500/30">
                      [SIMULATION MOCK] - Evaluator Fault Injection Test
                    </span>
                  )}
                </div>
              </div>

              {/* Persistence Disclaimers & Limitations Notice */}
              {(submitResult.storageMode === 'local-development' || submitResult.storageMode === 'local-fallback') && (
                <div className="w-full max-w-md p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-[11px] text-on-surface-variant text-left leading-relaxed space-y-1">
                  <div className="font-bold text-on-surface flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Verified Local Development Fallback Notice
                  </div>
                  <p>
                    Persisted to single-node local file storage (<code className="text-primary font-mono font-bold">server/data/inquiries.json</code>).
                    Production deployment requires configuring <code className="text-primary font-mono font-bold">DATABASE_URL</code> for PostgreSQL ACID persistence.
                  </p>
                </div>
              )}

              {submitResult.storageMode === 'postgresql' && (
                <div className="w-full max-w-md p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-950 text-left leading-relaxed space-y-1">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Live Production Database Persistence
                  </div>
                  <p>
                    Your enquiry has been successfully committed with ACID durability into the PostgreSQL cluster.
                  </p>
                </div>
              )}

              {submitResult.storageMode === 'simulated-mock' && (
                <div className="w-full max-w-md p-4 rounded-2xl bg-purple-500/10 border-2 border-purple-500/40 text-xs text-on-surface text-left leading-relaxed space-y-1.5">
                  <div className="font-headline font-black text-purple-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                    [SIMULATION MOCK] - Reviewer Evaluator Test Response
                  </div>
                  <p className="text-purple-950 font-body text-[11px]">
                    This inquiry was processed by the developer fault injection simulator for laboratory testing. It was <strong>NOT</strong> submitted to production servers or persisted in the live database.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => {
                    hasSubmittedSuccessfullyRef.current = false
                    setSubmitResult(null)
                    setCurrentStep(1)
                  }}
                  className="px-6 py-3.5 rounded-full text-xs font-headline font-bold bg-surface-container hover:bg-surface-container-high text-on-surface transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Submit Another Project Inquiry</span>
                </button>
                <a
                  href={`https://wa.me/${CYNBIT_CONFIG.whatsappE164}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-full text-xs font-headline font-black uppercase tracking-wider bg-primary text-white hover:bg-primary-container transition-all flex items-center gap-2 shadow-lg shadow-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Connect on WhatsApp</span>
                </a>
              </div>
            </div>
          ) : (
            /* Active Wizard Container */
            <form onSubmit={handleSubmit} noValidate className="space-y-8">
              {/* Resilient Error Recovery Protocol Banner */}
              {submitResult && !submitResult.success && (
                <SubmissionRecoveryBanner
                  submitResult={submitResult}
                  formData={formData}
                  onRetry={() => handleSubmit()}
                  isRetrying={submitting}
                />
              )}

              {/* Step Components */}
              {currentStep === 1 && (
                <Step1Stream
                  selectedStream={formData.serviceStream}
                  onSelectStream={(streamId) => setFormData((prev) => ({ ...prev, serviceStream: streamId }))}
                />
              )}

              {currentStep === 2 && (
                <Step2Details
                  formData={formData}
                  errors={errors}
                  touched={touched}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              )}

              {currentStep === 3 && (
                <Step3Tech
                  selectedTech={formData.techFocus}
                  onToggleTech={handleToggleTech}
                  customTech={formData.customTech}
                  onCustomTechChange={(val) => setFormData((prev) => ({ ...prev, customTech: val }))}
                />
              )}

              {currentStep === 4 && (
                <Step4TimelineBudget
                  timeline={formData.timeline}
                  onSelectTimeline={(val) => setFormData((prev) => ({ ...prev, timeline: val }))}
                  budgetIndex={formData.budgetIndex}
                  onBudgetChange={(idx) => setFormData((prev) => ({ ...prev, budgetIndex: idx }))}
                  isBudgetUndecided={formData.isBudgetUndecided}
                  onToggleBudgetUndecided={(val) => setFormData((prev) => ({ ...prev, isBudgetUndecided: val }))}
                />
              )}

              {currentStep === 5 && (
                <Step5Contact
                  formData={formData}
                  errors={errors}
                  touched={touched}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              )}

              {currentStep === 6 && (
                <Step6Review
                  formData={formData}
                  onJumpToStep={handleJumpToStep}
                  submitting={submitting}
                  rateLimitInfo={rateLimitInfo}
                />
              )}

              {/* Wizard Navigation Actions (Back / Continue) */}
              <div className="pt-6 border-t border-outline-variant/15 flex items-center justify-between gap-4">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    aria-label={`Go back to Step ${currentStep - 1}`}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-full text-xs font-headline font-bold bg-surface-container hover:bg-surface-container-high text-on-surface transition-all active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Back</span>
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 6 && (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    aria-label={`Continue to Step ${currentStep + 1}`}
                    className="flex items-center gap-2 px-8 py-4 rounded-full text-xs font-headline font-black uppercase tracking-wider bg-primary text-white hover:bg-primary-container transition-all shadow-md active:scale-95 cursor-pointer ml-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <span>Continue to Step {currentStep + 1}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Right: Live Blueprint & Engineering Standards Sidebar */}
        <div className="lg:col-span-4">
          <SummarySidebar
            formData={formData}
            currentStep={currentStep}
            onClearDraft={promptClearDraft}
            hasSavedDraft={hasSavedDraft}
            isSaving={isSaving}
            lastSavedTime={lastSavedTime}
            storageSupported={storageSupported}
          />
        </div>
      </div>

      {/* Draft Discard Confirmation Modal */}
      <ClearDraftModal
        isOpen={isConfirmModalOpen}
        onCancel={cancelClearDraft}
        onConfirm={handleExecuteClearDraft}
      />
    </div>
  )
}

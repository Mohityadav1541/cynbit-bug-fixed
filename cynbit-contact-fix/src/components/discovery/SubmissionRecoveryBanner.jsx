import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Clock,
} from 'lucide-react'
import { CYNBIT_CONFIG } from '../../config/cynbitConfig'
import { copyToClipboard } from '../../utils/clipboard'
import { generatePlainBrief, generateWhatsAppUrl, generateMailtoUrl } from '../../utils/briefFormatter'

export function SubmissionRecoveryBanner({ submitResult, formData, onRetry, isRetrying }) {
  const [copiedBrief, setCopiedBrief] = useState(false)
  const [copyFeedbackMessage, setCopyFeedbackMessage] = useState('')
  const [showBriefPreview, setShowBriefPreview] = useState(false)

  // Rate-limit cooldown enforcement
  const isRateLimited = submitResult?.statusCode === 429 || submitResult?.errorType === 'RATE_LIMIT'
  const [cooldownSeconds, setCooldownSeconds] = useState(() => (isRateLimited ? (submitResult?.retryAfterSeconds || 30) : 0))

  useEffect(() => {
    if (!isRateLimited || cooldownSeconds <= 0) return
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isRateLimited, cooldownSeconds])

  if (!submitResult || submitResult.success) {
    return null
  }

  const plainBrief = generatePlainBrief(formData)
  const whatsappUrl = generateWhatsAppUrl(formData)
  const mailtoUrl = generateMailtoUrl(formData)

  const handleCopyBrief = async () => {
    const res = await copyToClipboard(plainBrief)
    if (res.success) {
      setCopiedBrief(true)
      setCopyFeedbackMessage('Full project brief copied to clipboard!')
      setTimeout(() => {
        setCopiedBrief(false)
        setCopyFeedbackMessage('')
      }, 3500)
    } else {
      setCopyFeedbackMessage('Unable to auto-copy. You can select and copy the text below.')
      setShowBriefPreview(true)
    }
  }

  return (
    <section
      role="alert"
      aria-live="assertive"
      aria-labelledby="recovery-banner-title"
      className="p-6 md:p-8 rounded-[2rem] bg-error-container/90 text-on-error-container border-2 border-error/30 shadow-lg space-y-6 text-left transition-all animate-in fade-in slide-in-from-top-4"
    >
      {/* Header with High-Visibility Warning */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-error/15 text-error flex items-center justify-center shrink-0">
          <AlertTriangle className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-error text-white font-headline text-[10px] font-black uppercase tracking-widest shadow-sm">
              Not Delivered to Server
            </span>
            {submitResult.errorType && (
              <span className="px-2.5 py-0.5 rounded-full bg-surface/80 text-on-surface font-mono text-[11px] font-bold border border-outline-variant/30">
                {submitResult.errorType}
              </span>
            )}
            {submitResult.statusCode && (
              <span className="px-2.5 py-0.5 rounded-full bg-surface/80 text-on-surface font-mono text-[11px] font-bold border border-outline-variant/30">
                HTTP {submitResult.statusCode}
              </span>
            )}
          </div>

          <h2 id="recovery-banner-title" className="text-xl md:text-2xl font-headline font-black text-on-error-container tracking-tight">
            Submission Has NOT Reached the Cynbit Server
          </h2>

          <p className="text-xs md:text-sm text-on-error-container/90 font-body leading-relaxed font-medium">
            A network timeout or gateway failure prevented your request from being processed.
            <strong className="font-bold block mt-1">
              Your work is 100% preserved. None of your answers, tech choices, or contact details have been lost.
            </strong>
          </p>
        </div>
      </div>

      {/* Diagnostics Message */}
      {submitResult.error && (
        <div className="p-4 rounded-2xl bg-surface-container-lowest/80 border border-error/20 text-xs font-mono text-on-surface leading-relaxed break-words">
          <span className="font-bold text-error mr-2">&gt; Gateway Diagnostic:</span>
          {submitResult.error}
        </div>
      )}

      {/* Feedback Toast after Copy */}
      {copyFeedbackMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 rounded-xl bg-primary text-white text-xs font-headline font-bold flex items-center gap-2 shadow-sm animate-in fade-in"
        >
          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{copyFeedbackMessage}</span>
        </div>
      )}

      {/* Action Grid: 4 Fallback Paths */}
      <div className="space-y-3 pt-2">
        <p className="text-[11px] font-headline font-bold uppercase tracking-wider text-on-error-container/70">
          Available Recovery & Transmission Channels
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action 1: Retry Submission (Enforces Rate Limit Cooldown if Active) */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying || cooldownSeconds > 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-primary text-white font-headline text-xs font-bold shadow-md hover:bg-primary-container active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={cooldownSeconds > 0 ? `Retry locked for ${cooldownSeconds} seconds due to rate limit` : "Retry submitting the discovery inquiry"}
            >
              {cooldownSeconds > 0 ? (
                <>
                  <Clock className="w-4 h-4 shrink-0 animate-pulse text-amber-300" aria-hidden="true" />
                  <span>Retry Locked ({cooldownSeconds}s)</span>
                </>
              ) : (
                <>
                  <RotateCcw className={`w-4 h-4 shrink-0 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span>{isRetrying ? 'Retrying Gateway...' : '1. Retry Submission'}</span>
                </>
              )}
            </button>
            {cooldownSeconds > 0 && (
              <button
                type="button"
                onClick={() => setCooldownSeconds(0)}
                className="text-[10px] text-primary hover:underline cursor-pointer text-center font-bold"
              >
                Bypass Cooldown (Dev Test)
              </button>
            )}
          </div>

          {/* Action 2: Copy Project Brief */}
          <button
            type="button"
            onClick={handleCopyBrief}
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-surface-container-lowest text-on-surface font-headline text-xs font-bold border border-outline-variant/30 shadow-sm hover:bg-surface-container active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Copy entire structured project brief to clipboard"
          >
            {copiedBrief ? (
              <Check className="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <Copy className="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
            )}
            <span>{copiedBrief ? 'Brief Copied!' : '2. Copy Project Brief'}</span>
          </button>

          {/* Action 3: Prepare Email (Verified Cynbit Email) */}
          <a
            href={mailtoUrl}
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-surface-container-lowest text-on-surface font-headline text-xs font-bold border border-outline-variant/30 shadow-sm hover:bg-surface-container active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={`Prepare email to ${CYNBIT_CONFIG.verifiedEmail}`}
          >
            <Mail className="w-4 h-4 shrink-0 text-secondary" aria-hidden="true" />
            <span>3. Prepare Email</span>
          </a>

          {/* Action 4: WhatsApp Fast-Track (Verified Phone) */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#075E54] font-headline text-xs font-bold border border-[#25D366]/30 shadow-sm active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={`Send project brief to Cynbit on WhatsApp at ${CYNBIT_CONFIG.verifiedPhoneDisplay}`}
          >
            <MessageSquare className="w-4 h-4 shrink-0 text-[#25D366]" aria-hidden="true" />
            <span>4. Send via WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Verified Configuration Info Pill */}
      <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-on-error-container/80 gap-2 border-t border-error/20">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-error shrink-0" aria-hidden="true" />
          <span>
            Verified Cynbit Channels: <strong className="font-bold">{CYNBIT_CONFIG.verifiedEmail}</strong> &bull;{' '}
            <strong className="font-bold">{CYNBIT_CONFIG.verifiedPhoneDisplay}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowBriefPreview((prev) => !prev)}
          className="inline-flex items-center gap-1 text-[11px] font-headline font-bold text-primary hover:underline cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-expanded={showBriefPreview}
          aria-controls="brief-preview-container"
        >
          <span>{showBriefPreview ? 'Hide Raw Brief' : 'View Generated Brief'}</span>
          {showBriefPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Collapsible Raw Brief Viewer */}
      {showBriefPreview && (
        <div
          id="brief-preview-container"
          className="p-4 rounded-2xl bg-surface-container-lowest text-on-surface font-mono text-[11px] leading-relaxed max-h-64 overflow-y-auto border border-outline-variant/30 space-y-2 animate-in fade-in"
        >
          <div className="flex justify-between items-center pb-2 border-b border-outline-variant/15 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            <span>Raw Brief Data</span>
            <button
              type="button"
              onClick={handleCopyBrief}
              className="text-primary hover:underline cursor-pointer"
            >
              Copy Text
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[11px] select-all">{plainBrief}</pre>
        </div>
      )}
    </section>
  )
}


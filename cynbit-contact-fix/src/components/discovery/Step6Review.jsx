import React, { useState } from 'react'
import {
  Edit3,
  ShieldCheck,
  Clock,
  Send,
  RefreshCw,
  Copy,
  Check,
  Mail,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react'
import { STREAM_OPTIONS, TIMELINE_OPTIONS, BUDGET_BRACKETS } from './discoveryConstants'
import { copyToClipboard } from '../../utils/clipboard'
import { generatePlainBrief, generateWhatsAppUrl, generateMailtoUrl } from '../../utils/briefFormatter'
import { CYNBIT_CONFIG } from '../../config/cynbitConfig'

export default function Step6Review({
  formData,
  onJumpToStep,
  submitting,
  rateLimitInfo,
}) {
  const [copiedBrief, setCopiedBrief] = useState(false)
  const selectedStreamObj = STREAM_OPTIONS.find((s) => s.id === formData.serviceStream)
  const selectedTimelineObj = TIMELINE_OPTIONS.find((t) => t.id === formData.timeline)
  const selectedBudgetObj = BUDGET_BRACKETS[formData.isBudgetUndecided ? 0 : formData.budgetIndex]

  const handleCopy = async () => {
    const brief = generatePlainBrief(formData)
    const res = await copyToClipboard(brief)
    if (res.success) {
      setCopiedBrief(true)
      setTimeout(() => setCopiedBrief(false), 3000)
    }
  }

  const mailtoUrl = generateMailtoUrl(formData)
  const whatsappUrl = generateWhatsAppUrl(formData)

  return (
    <div
      role="group"
      aria-labelledby="step6-title"
      aria-describedby="step6-desc"
      className="space-y-6 text-left"
    >
      <div>
        <h2 id="step6-title" className="text-xl sm:text-2xl font-headline font-black text-on-surface tracking-tight">
          Review &amp; Transmit Discovery Blueprint
        </h2>
        <p id="step6-desc" className="text-sm text-on-surface-variant font-body mt-1">
          Review your architectural briefing specifications below before dispatching directly to our digital engineering team.
        </p>
      </div>

      <div className="space-y-4">
        {/* Section 1: Stream & Overview */}
        <section aria-labelledby="review-stream-title" className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/15 relative space-y-3">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
            <h3 id="review-stream-title" className="text-[10px] font-headline font-black uppercase tracking-widest text-primary">
              1. Engagement Discipline
            </h3>
            <button
              type="button"
              onClick={() => onJumpToStep(1)}
              aria-label="Edit Engagement Discipline in Step 1"
              className="inline-flex items-center gap-1.5 text-xs font-headline font-bold text-primary hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg px-2 py-1"
            >
              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Edit</span>
            </button>
          </div>
          <div>
            <div className="font-headline font-black text-base text-on-surface">
              {selectedStreamObj ? selectedStreamObj.title : formData.serviceStream}
            </div>
            <p className="text-xs text-on-surface-variant font-body mt-1 leading-relaxed">
              {selectedStreamObj ? selectedStreamObj.desc : ''}
            </p>
          </div>
        </section>

        {/* Section 2: Project Specifications */}
        <section aria-labelledby="review-details-title" className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/15 relative space-y-3">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
            <h3 id="review-details-title" className="text-[10px] font-headline font-black uppercase tracking-widest text-primary">
              2. Project Specifications
            </h3>
            <button
              type="button"
              onClick={() => onJumpToStep(2)}
              aria-label="Edit Project Specifications in Step 2"
              className="inline-flex items-center gap-1.5 text-xs font-headline font-bold text-primary hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg px-2 py-1"
            >
              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Edit</span>
            </button>
          </div>
          <dl className="space-y-3 text-xs font-body m-0 p-0">
            <div>
              <dt className="text-on-surface font-headline font-bold">Project Title:</dt>
              <dd className="text-on-surface-variant m-0 mt-0.5">{formData.projectTitle || '—'}</dd>
            </div>
            <div>
              <dt className="text-on-surface font-headline font-bold">Description:</dt>
              <dd className="text-on-surface-variant m-0 mt-1 whitespace-pre-wrap leading-relaxed bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
                {formData.projectDescription || '—'}
              </dd>
            </div>
            {formData.businessObjective && (
              <div>
                <dt className="text-on-surface font-headline font-bold">Business Objective:</dt>
                <dd className="text-on-surface-variant m-0 mt-0.5">{formData.businessObjective}</dd>
              </div>
            )}
            {formData.mainChallenges && (
              <div>
                <dt className="text-on-surface font-headline font-bold">Technical Challenges:</dt>
                <dd className="text-on-surface-variant m-0 mt-0.5">{formData.mainChallenges}</dd>
              </div>
            )}
            {formData.expectedFunctionality && (
              <div>
                <dt className="text-on-surface font-headline font-bold">Key Functionality:</dt>
                <dd className="text-on-surface-variant m-0 mt-0.5">{formData.expectedFunctionality}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Section 3: Tech Stack & Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tech Stack */}
          <section aria-labelledby="review-tech-title" className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/15 space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
              <h3 id="review-tech-title" className="text-[10px] font-headline font-black uppercase tracking-widest text-primary">
                3. Technical Elements
              </h3>
              <button
                type="button"
                onClick={() => onJumpToStep(3)}
                aria-label="Edit Technical Stack Elements in Step 3"
                className="inline-flex items-center gap-1.5 text-xs font-headline font-bold text-primary hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg px-2 py-1"
              >
                <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Edit</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5" aria-label="Selected technologies">
              {formData.techFocus.length > 0 ? (
                formData.techFocus.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-full text-[11px] font-headline font-bold bg-surface-container-lowest text-on-surface border border-outline-variant/20"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-xs text-on-surface-variant italic">No specific technologies specified</span>
              )}
              {formData.customTech && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-headline font-bold bg-primary/10 text-primary border border-primary/20">
                  Custom: {formData.customTech}
                </span>
              )}
            </div>
          </section>

          {/* Timeline & Budget */}
          <section aria-labelledby="review-timeline-title" className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/15 space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
              <h3 id="review-timeline-title" className="text-[10px] font-headline font-black uppercase tracking-widest text-primary">
                4. Horizon &amp; Budget
              </h3>
              <button
                type="button"
                onClick={() => onJumpToStep(4)}
                aria-label="Edit Timeline and Budget in Step 4"
                className="inline-flex items-center gap-1.5 text-xs font-headline font-bold text-primary hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg px-2 py-1"
              >
                <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Edit</span>
              </button>
            </div>
            <dl className="space-y-1.5 text-xs font-body m-0 p-0">
              <div>
                <dt className="text-on-surface font-headline font-bold inline">Target Horizon: </dt>
                <dd className="text-on-surface-variant inline m-0">{selectedTimelineObj?.label || formData.timeline}</dd>
              </div>
              <div>
                <dt className="text-on-surface font-headline font-bold inline">Investment Bracket: </dt>
                <dd className="text-primary font-bold inline m-0">{selectedBudgetObj?.label}</dd>
                <span className="text-on-surface-variant opacity-75 ml-1">({selectedBudgetObj?.range})</span>
              </div>
            </dl>
          </section>
        </div>

        {/* Section 4: Contact Credentials */}
        <section aria-labelledby="review-contact-title" className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/15 space-y-3">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
            <h3 id="review-contact-title" className="text-[10px] font-headline font-black uppercase tracking-widest text-primary">
              5. Point of Contact
            </h3>
            <button
              type="button"
              onClick={() => onJumpToStep(5)}
              aria-label="Edit Contact Details in Step 5"
              className="inline-flex items-center gap-1.5 text-xs font-headline font-bold text-primary hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg px-2 py-1"
            >
              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Edit</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-body">
            <div>
              <span className="text-on-surface-variant opacity-60 block text-[10px] uppercase font-bold">Full Name</span>
              <strong className="text-on-surface font-headline">{formData.fullName}</strong>
            </div>
            <div>
              <span className="text-on-surface-variant opacity-60 block text-[10px] uppercase font-bold">Business Email</span>
              <strong className="text-on-surface font-headline break-all">{formData.email}</strong>
            </div>
            <div>
              <span className="text-on-surface-variant opacity-60 block text-[10px] uppercase font-bold">Phone Number</span>
              <span className="text-on-surface font-medium">{formData.phone || 'Not provided'}</span>
            </div>
            <div>
              <span className="text-on-surface-variant opacity-60 block text-[10px] uppercase font-bold">Company</span>
              <span className="text-on-surface font-medium">{formData.company || 'Not provided'}</span>
            </div>
          </div>
        </section>

        {/* Manual Dispatch & Backup Brief Actions */}
        <div className="bg-surface-container-low/70 p-4 rounded-2xl border border-outline-variant/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-left">
            <span className="font-headline font-bold text-on-surface block">Project Brief Actions</span>
            <span className="text-[11px] text-on-surface-variant font-body">Save a local copy or dispatch directly to our verified contacts.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-lowest text-on-surface font-headline font-bold text-xs border border-outline-variant/30 hover:bg-surface-container transition-all cursor-pointer shadow-sm active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Copy brief to clipboard"
            >
              {copiedBrief ? <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5 text-primary" aria-hidden="true" />}
              <span>{copiedBrief ? 'Brief Copied!' : 'Copy Brief'}</span>
            </button>

            <a
              href={mailtoUrl}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-lowest text-on-surface font-headline font-bold text-xs border border-outline-variant/30 hover:bg-surface-container transition-all cursor-pointer shadow-sm active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Prepare email to ${CYNBIT_CONFIG.verifiedEmail}`}
            >
              <Mail className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
              <span>Email</span>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366]/10 text-[#075E54] font-headline font-bold text-xs border border-[#25D366]/30 hover:bg-[#25D366]/20 transition-all cursor-pointer shadow-sm active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Send brief on WhatsApp to ${CYNBIT_CONFIG.verifiedPhoneDisplay}`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" aria-hidden="true" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Active Rate Limit Alert */}
        {!rateLimitInfo.allowed && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-5 rounded-2xl bg-error-container text-on-error-container text-xs font-body space-y-2 border-2 border-error/20"
          >
            <div className="font-headline font-black uppercase tracking-wider text-[11px] flex items-center gap-2 text-error">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Inquiry Rate Limit Reached (3 Submissions / Hour)</span>
            </div>
            <p className="leading-relaxed font-medium">
              {rateLimitInfo.message}
            </p>
            <p className="text-[11px] text-on-error-container/80 pt-1 font-headline">
              Need immediate technical consultation? Reach our founding team directly via{' '}
              <a href={`mailto:${CYNBIT_CONFIG.verifiedEmail}`} className="underline font-bold text-primary">
                {CYNBIT_CONFIG.verifiedEmail}
              </a>{' '}
              or WhatsApp{' '}
              <a href={`https://wa.me/${CYNBIT_CONFIG.whatsappE164}`} target="_blank" rel="noopener noreferrer" className="underline font-bold text-primary">
                {CYNBIT_CONFIG.verifiedPhoneDisplay}
              </a>.
            </p>
          </div>
        )}

        {/* Final Submission CTA */}
        <div className="pt-4 space-y-4">
          <button
            type="submit"
            disabled={submitting || !rateLimitInfo.allowed}
            aria-busy={submitting}
            className="w-full bg-primary text-white py-5 rounded-full font-headline font-black text-xs uppercase tracking-widest hover:bg-primary-container hover:text-on-primary-container transition-all shadow-xl active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Transmitting Blueprint to Architects...</span>
              </div>
            ) : (
              <>
                <span>Confirm &amp; Transmit Architectural Blueprint</span>
                <Send className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-on-surface-variant opacity-75 gap-2 font-body">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>End-to-end encrypted &bull; Enterprise SLA Response within 4 Hours</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Headquartered in Jaipur, Rajasthan, India</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

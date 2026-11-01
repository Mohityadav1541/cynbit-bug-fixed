import React from 'react'
import { Sparkles, Layers, Clock, Sliders, Check, Trash2, Save, RefreshCw, ShieldCheck } from 'lucide-react'
import { STREAM_OPTIONS, TIMELINE_OPTIONS, BUDGET_BRACKETS } from './discoveryConstants'

export default function SummarySidebar({
  formData,
  currentStep,
  onClearDraft,
  hasSavedDraft,
  isSaving,
  lastSavedTime,
  storageSupported = true,
}) {
  const selectedStreamObj = STREAM_OPTIONS.find((s) => s.id === formData.serviceStream)
  const selectedTimelineObj = TIMELINE_OPTIONS.find((t) => t.id === formData.timeline)
  const selectedBudgetObj = BUDGET_BRACKETS[formData.isBudgetUndecided ? 0 : formData.budgetIndex]

  return (
    <aside aria-label="Live Architectural Blueprint" className="space-y-6 text-left">
      {/* Live Blueprint Summary Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-4 h-4" />
            <h3 className="font-headline font-black text-xs uppercase tracking-widest text-on-surface">
              Live Blueprint
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
            Step {currentStep} of 6
          </span>
        </div>

        {/* Dynamic Elements */}
        <div className="space-y-4 text-xs font-body">
          {/* Selected Discipline */}
          <div>
            <span className="text-[10px] font-headline font-black uppercase tracking-wider text-on-surface-variant opacity-70 block mb-1">
              Discipline
            </span>
            <div className="font-headline font-bold text-sm text-on-surface flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{selectedStreamObj?.title || 'Not selected'}</span>
            </div>
          </div>

          {/* Project Title if entered */}
          {formData.projectTitle && (
            <div>
              <span className="text-[10px] font-headline font-black uppercase tracking-wider text-on-surface-variant opacity-70 block mb-1">
                Project Title
              </span>
              <div className="font-headline font-bold text-xs text-on-surface truncate">
                {formData.projectTitle}
              </div>
            </div>
          )}

          {/* Tech count */}
          <div>
            <span className="text-[10px] font-headline font-black uppercase tracking-wider text-on-surface-variant opacity-70 block mb-1">
              Architecture Stack
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {formData.techFocus.length > 0 ? (
                formData.techFocus.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-full text-[10px] font-headline font-bold bg-surface-container text-on-surface"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-on-surface-variant italic opacity-60">None selected</span>
              )}
              {formData.techFocus.length > 4 && (
                <span className="text-[10px] font-bold text-primary self-center">
                  +{formData.techFocus.length - 4} more
                </span>
              )}
            </div>
          </div>

          {/* Timeline & Budget */}
          <div className="pt-2 border-t border-outline-variant/10 grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-headline font-black uppercase tracking-wider text-on-surface-variant opacity-70 flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-primary" />
                <span>Horizon</span>
              </span>
              <span className="font-headline font-bold text-xs text-on-surface">
                {selectedTimelineObj?.label || '1 – 3 months'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-headline font-black uppercase tracking-wider text-on-surface-variant opacity-70 flex items-center gap-1 mb-1">
                <Sliders className="w-3 h-3 text-primary" />
                <span>Investment</span>
              </span>
              <span className="font-headline font-bold text-xs text-primary">
                {selectedBudgetObj?.label}
              </span>
            </div>
          </div>
        </div>

        {/* Draft Persistence Status & Action */}
        <div className="pt-3 border-t border-outline-variant/10 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-body text-on-surface-variant">
            {storageSupported ? (
              <div className="flex items-center gap-1.5">
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-primary animate-spin" aria-hidden="true" />
                    <span>Auto-saving draft...</span>
                  </>
                ) : hasSavedDraft ? (
                  <>
                    <Save className="w-3 h-3 text-primary" aria-hidden="true" />
                    <span>
                      Draft saved {lastSavedTime ? `(${lastSavedTime})` : ''}
                    </span>
                  </>
                ) : (
                  <span className="opacity-60">Ready to save</span>
                )}
              </div>
            ) : (
              <span className="opacity-50 text-[10px]">Storage disabled</span>
            )}

            {hasSavedDraft && (
              <button
                type="button"
                onClick={onClearDraft}
                className="inline-flex items-center gap-1 text-[11px] font-headline font-bold text-on-surface-variant hover:text-error transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-error rounded"
                aria-label="Clear saved discovery draft"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Draft</span>
              </button>
            )}
          </div>

          <div className="flex items-start gap-1.5 text-[10px] text-on-surface-variant/70 font-body leading-tight pt-1">
            <ShieldCheck className="w-3 h-3 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>Privacy Guaranteed:</strong> Only project scoping specifications are stored locally. Personal contact credentials are never saved.
            </span>
          </div>
        </div>
      </div>

      {/* Engineering Standards Card */}
      <div className="bg-surface-container-low border border-outline-variant/15 rounded-3xl p-6 space-y-4">
        <h4 className="text-xs font-headline font-black uppercase tracking-widest text-on-surface">
          Cynbit Enterprise Standards
        </h4>
        <div className="space-y-3 text-xs font-body text-on-surface-variant">
          <div className="flex items-start gap-2.5">
            <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
            <div>
              <strong className="text-on-surface font-bold">Guaranteed SLA:</strong> Response and strategic overview from founding architects within 4 hours.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
            <div>
              <strong className="text-on-surface font-bold">Resilient Async:</strong> Fault-tolerant network pipeline guarantees zero lost leads or UI lockups.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
            <div>
              <strong className="text-on-surface font-bold">Confidentiality:</strong> Mutual NDA protection for all shared architecture blueprints.
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

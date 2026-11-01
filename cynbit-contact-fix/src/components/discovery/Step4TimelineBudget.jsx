import React from 'react'
import { Clock, Sliders, CheckCircle2, HelpCircle } from 'lucide-react'
import { TIMELINE_OPTIONS, BUDGET_BRACKETS } from './discoveryConstants'

export default function Step4TimelineBudget({
  timeline,
  onSelectTimeline,
  budgetIndex,
  onBudgetChange,
  isBudgetUndecided,
  onToggleBudgetUndecided,
}) {
  const currentBudget = BUDGET_BRACKETS[isBudgetUndecided ? 0 : budgetIndex]

  const handleTimelineKeyDown = (e, index) => {
    let nextIndex = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      nextIndex = (index + 1) % TIMELINE_OPTIONS.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      nextIndex = (index - 1 + TIMELINE_OPTIONS.length) % TIMELINE_OPTIONS.length
    }

    if (nextIndex !== null) {
      const nextTimeline = TIMELINE_OPTIONS[nextIndex]
      if (nextTimeline) {
        onSelectTimeline(nextTimeline.id)
        const el = document.getElementById(`timeline-option-${nextTimeline.id}`)
        if (el) el.focus()
      }
    }
  }

  return (
    <div
      role="group"
      aria-labelledby="step4-title"
      aria-describedby="step4-desc"
      className="space-y-8 text-left"
    >
      <div>
        <h2 id="step4-title" className="text-xl sm:text-2xl font-headline font-black text-on-surface tracking-tight">
          Timeline &amp; Investment Parameters
        </h2>
        <p id="step4-desc" className="text-sm text-on-surface-variant font-body mt-1">
          Specify target milestones and planned investment. Visitors are not forced to disclose budget if uncertain.
        </p>
      </div>

      {/* Timeline Selector */}
      <div
        role="radiogroup"
        aria-labelledby="timeline-label"
        className="space-y-3"
      >
        <span id="timeline-label" className="text-xs font-headline font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Target Delivery Horizon</span>
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TIMELINE_OPTIONS.map((item, index) => {
            const isSelected = timeline === item.id
            return (
              <button
                type="button"
                id={`timeline-option-${item.id}`}
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : 0}
                key={item.id}
                onClick={() => onSelectTimeline(item.id)}
                onKeyDown={(e) => handleTimelineKeyDown(e, index)}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-98 ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20'
                    : 'bg-surface-container-low border-outline-variant/15 text-on-surface hover:border-primary/40 hover:bg-surface-container-lowest'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-headline font-bold text-sm">{item.label}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-white" aria-hidden="true" />}
                </div>
                <p className={`text-xs leading-relaxed font-body ${isSelected ? 'text-white/80' : 'text-on-surface-variant opacity-75'}`}>
                  {item.desc}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Budget Range Slider */}
      <div className="space-y-5 bg-surface-container-low p-6 rounded-3xl border border-outline-variant/15">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" aria-hidden="true" />
            <span id="budget-heading" className="text-xs font-headline font-black uppercase tracking-wider text-on-surface">
              Investment Bracket
            </span>
          </div>

          <label
            htmlFor="field-budget-undecided"
            className="inline-flex items-center gap-2 text-xs font-headline font-bold text-on-surface cursor-pointer select-none"
          >
            <input
              type="checkbox"
              id="field-budget-undecided"
              checked={isBudgetUndecided}
              onChange={(e) => onToggleBudgetUndecided(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
            <span>Undecided / Prefer to discuss</span>
          </label>
        </div>

        {/* Selected Tier Callout */}
        <div
          className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
          aria-live="polite"
        >
          <div>
            <span className="text-[10px] font-headline font-black uppercase tracking-widest text-primary block">
              {currentBudget.tier}
            </span>
            <div className="text-2xl sm:text-3xl font-headline font-black text-on-surface tracking-tight mt-0.5">
              {currentBudget.label}
            </div>
          </div>
          <div className="text-xs font-body text-on-surface-variant opacity-80 sm:text-right">
            {currentBudget.range}
          </div>
        </div>

        {/* Range Slider */}
        {!isBudgetUndecided ? (
          <div className="space-y-4 pt-2">
            <label htmlFor="field-budget-slider" className="sr-only">
              Select Planned Investment Bracket (from $5k to $75k+)
            </label>
            <input
              type="range"
              id="field-budget-slider"
              min="1"
              max="4"
              step="1"
              value={budgetIndex}
              onChange={(e) => onBudgetChange(Number(e.target.value))}
              aria-labelledby="budget-heading"
              aria-valuemin="1"
              aria-valuemax="4"
              aria-valuenow={budgetIndex}
              aria-valuetext={`${currentBudget.label}, ${currentBudget.range}`}
              className="w-full accent-[#006067] h-2 bg-surface-container rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />

            {/* Range markers */}
            <div className="grid grid-cols-4 text-center text-[11px] font-headline font-bold text-on-surface-variant opacity-75" aria-hidden="true">
              <span>$5k – $15k</span>
              <span>$15k – $35k</span>
              <span>$35k – $75k</span>
              <span>$75k+</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-surface-container text-xs text-on-surface-variant flex items-center gap-2.5 font-body">
            <HelpCircle className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span>
              Itemized milestone estimates and ROI projections will be provided collaboratively during our technical discovery session.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

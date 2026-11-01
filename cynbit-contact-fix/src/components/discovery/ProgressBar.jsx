import React from 'react'
import { Check } from 'lucide-react'
import { STEPS } from './discoveryConstants'

export default function ProgressBar({ currentStep, onStepClick, completedSteps }) {
  const currentStepObj = STEPS[currentStep - 1]

  return (
    <nav aria-label="Architecture Discovery Steps" className="w-full bg-surface-container-lowest p-4 md:p-6 rounded-3xl border border-outline-variant/15 shadow-sm">
      {/* Screen Reader live step change announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Navigated to Step {currentStep} of {STEPS.length}: {currentStepObj?.label}
      </div>

      {/* Mobile step status */}
      <div className="flex md:hidden items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full bg-primary text-white text-xs font-headline font-black flex items-center justify-center"
            aria-hidden="true"
          >
            {currentStep}
          </span>
          <span className="text-xs font-headline font-bold text-on-surface">
            Step {currentStep} of {STEPS.length}: {currentStepObj?.label}
          </span>
        </div>
        <div className="text-[11px] font-mono text-primary font-bold" aria-label={`${Math.round((currentStep / STEPS.length) * 100)} percent complete`}>
          {Math.round((currentStep / STEPS.length) * 100)}%
        </div>
      </div>

      {/* Mobile progress bar track */}
      <div
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuetext={`Step ${currentStep} of ${STEPS.length}: ${currentStepObj?.label}`}
        className="md:hidden mt-2.5 w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden"
      >
        <div
          className="bg-primary h-full transition-all duration-300 rounded-full"
          style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Desktop step sequence */}
      <ol className="hidden md:grid grid-cols-6 gap-2 items-center list-none m-0 p-0">
        {STEPS.map((step) => {
          const isCurrent = currentStep === step.id
          const isDone = completedSteps.includes(step.id) || currentStep > step.id
          const canJump = isDone || isCurrent

          return (
            <li key={step.id} className="relative">
              <button
                type="button"
                disabled={!canJump}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Step ${step.id}: ${step.label}${isDone ? ' (Completed)' : isCurrent ? ' (Current Step)' : ' (Not yet reached)'}`}
                onClick={() => canJump && onStepClick(step.id)}
                className={`w-full text-left p-3 rounded-2xl transition-all duration-200 border flex flex-col gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  isCurrent
                    ? 'bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20'
                    : isDone
                    ? 'bg-surface-container-low text-on-surface border-outline-variant/15 hover:border-primary/40 cursor-pointer'
                    : 'bg-surface-container-low/50 text-on-surface-variant/40 border-transparent cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    aria-hidden="true"
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-headline font-black ${
                      isCurrent
                        ? 'bg-white text-primary'
                        : isDone
                        ? 'bg-primary text-white'
                        : 'bg-outline-variant/30 text-on-surface-variant'
                    }`}
                  >
                    {isDone && !isCurrent ? <Check className="w-3 h-3 stroke-[3]" /> : step.id}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`text-[9px] uppercase font-headline font-black tracking-widest ${
                      isCurrent ? 'text-white/80' : 'text-on-surface-variant opacity-60'
                    }`}
                  >
                    Step {step.id}
                  </span>
                </div>
                <div
                  className={`text-xs font-headline font-bold truncate ${
                    isCurrent ? 'text-white' : 'text-on-surface'
                  }`}
                >
                  {step.label}
                </div>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

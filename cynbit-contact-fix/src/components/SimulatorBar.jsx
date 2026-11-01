import React, { useState } from 'react'
import {
  CheckCircle2,
  WifiOff,
  ServerCrash,
  Clock,
  ShieldAlert,
  Terminal,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  Shield,
} from 'lucide-react'
import { SIMULATION_MODES, setSimulationMode } from '../utils/mockApi'
import { resetDemoRateLimit } from '../utils/rateLimit'

const PRIMARY_SIMULATION_MODES = [
  {
    id: SIMULATION_MODES.SUCCESS,
    num: '1',
    label: 'Normal Response (200 OK)',
    shortLabel: '200 OK',
    icon: CheckCircle2,
    badgeText: 'HTTP 200 SUCCESS',
    badgeColor: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30',
    btnActiveColor: 'bg-primary text-white border-primary shadow-sm',
    btnInactiveColor: 'bg-surface-container-lowest text-on-surface hover:border-primary/40 border-outline-variant/20',
    summary: 'Standard successful architectural inquiry submission with ~800ms roundtrip.',
    expectedBehaviors: [
      'Displays verified confirmation screen with reference ID (CYN-XXXXXX).',
      'Confirms assigned lead architect and 4-hour SLA guarantee.',
      'Clears the saved draft from LocalStorage.',
      'Triggers celebratory confetti animation.',
    ],
  },
  {
    id: SIMULATION_MODES.NETWORK_ERROR,
    num: '2',
    label: 'Network Drop / Offline',
    shortLabel: 'Network Drop',
    icon: WifiOff,
    badgeText: 'TYPEERROR: FAILED TO FETCH',
    badgeColor: 'bg-rose-500/10 text-rose-800 border-rose-500/30',
    btnActiveColor: 'bg-error text-white border-error shadow-sm',
    btnInactiveColor: 'bg-surface-container-lowest text-on-surface hover:border-error/40 border-outline-variant/20',
    summary: 'Simulates client network disconnection or dropped connection during transmission.',
    expectedBehaviors: [
      'Throws rejected network promise caught by try/catch/finally pipeline.',
      'Never freezes the submit button; loading state resets in finally block.',
      'Preserves 100% of entered project specifications in state and LocalStorage.',
      'Renders the Submission Recovery Center with Retry, Copy Brief, Email, and WhatsApp channels.',
    ],
  },
  {
    id: SIMULATION_MODES.SERVER_500,
    num: '3',
    label: 'Server Error (500)',
    shortLabel: 'Server 500',
    icon: ServerCrash,
    badgeText: 'HTTP 500 CRASH',
    badgeColor: 'bg-red-500/10 text-red-800 border-red-500/30',
    btnActiveColor: 'bg-red-700 text-white border-red-700 shadow-sm',
    btnInactiveColor: 'bg-surface-container-lowest text-on-surface hover:border-red-700/40 border-outline-variant/20',
    summary: 'Simulates Next.js Server Action crash or downstream transactional SMTP gateway timeout.',
    expectedBehaviors: [
      'Displays server diagnostic alert with clear internal error explanation.',
      'Preserves all user specifications without resetting or clearing inputs.',
      'Re-enables the Retry Submission button for immediate re-attempt.',
      'Provides direct verified contact links for urgent technical escalation.',
    ],
  },
  {
    id: SIMULATION_MODES.SLOW_3G,
    num: '4',
    label: 'Slow 3G / Delayed Response',
    shortLabel: 'Slow 3G (3.5s)',
    icon: Clock,
    badgeText: '3,500ms CELLULAR LATENCY',
    badgeColor: 'bg-sky-500/10 text-sky-800 border-sky-500/30',
    btnActiveColor: 'bg-secondary text-white border-secondary shadow-sm',
    btnInactiveColor: 'bg-surface-container-lowest text-on-surface hover:border-secondary/40 border-outline-variant/20',
    summary: 'Simulates high-latency cellular connectivity to test inflight UI indicators and concurrency locks.',
    expectedBehaviors: [
      'Submit button immediately shows spinning indicator and disabled state.',
      'Hardware ref lock drops rapid double-clicks to prevent duplicate server actions.',
      'Allows AbortController timeout behaviors to be tested under prolonged delay.',
      'Completes with 200 OK after simulated 3.5s roundtrip.',
    ],
  },
  {
    id: SIMULATION_MODES.RATE_LIMIT,
    num: '5',
    label: 'Rate Limited (429)',
    shortLabel: '429 Rate Limit',
    icon: ShieldAlert,
    badgeText: 'HTTP 429 TOO MANY REQUESTS',
    badgeColor: 'bg-amber-500/10 text-amber-900 border-amber-500/30',
    btnActiveColor: 'bg-[#774e00] text-white border-[#774e00] shadow-sm',
    btnInactiveColor: 'bg-surface-container-lowest text-on-surface hover:border-amber-700/40 border-outline-variant/20',
    summary: 'Simulates client exceeding the 3 inquiries/hour threshold.',
    expectedBehaviors: [
      'Returns HTTP 429 Too Many Requests response payload.',
      'Submission Recovery Banner locks the Retry button into a 30-second cooldown timer.',
      'Prevents immediate retry until the countdown interval reaches 0.',
      'Step 6 review shows persistent cooldown warning banner with direct contact links.',
    ],
  },
]

export default function SimulatorBar({ currentMode, onChangeMode }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showGuide, setShowGuide] = useState(false)

  const activeModeObj = PRIMARY_SIMULATION_MODES.find((m) => m.id === currentMode) || PRIMARY_SIMULATION_MODES[0]

  const handleSelectMode = (modeId) => {
    setSimulationMode(modeId)
    if (typeof onChangeMode === 'function') {
      onChangeMode(modeId)
    }
  }

  const handleTriggerSample = () => {
    window.dispatchEvent(new CustomEvent('cynbit:fill-sample'))
  }

  const handleResetLimit = () => {
    resetDemoRateLimit()
    window.location.reload()
  }

  return (
    <aside
      aria-label="Developer Anti-Crash Test Harness"
      className="bg-surface-container-low border-b border-outline-variant/20 text-on-surface transition-all select-none"
    >
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 lg:px-12 py-2.5 space-y-2.5">
        {/* Top Bar: Dev Tag, Current Mode, and Collapse Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          {/* Left: Branding & Developer Notice */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-headline font-bold text-[10px] uppercase tracking-wider border border-primary/20">
              <Terminal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Developer Test Harness</span>
            </div>

            <div className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-on-surface-variant font-medium">
              <Shield className="w-3.5 h-3.5 text-primary/70 shrink-0" aria-hidden="true" />
              <span>In-memory fault injection sandbox &bull; Production servers untouched</span>
            </div>
          </div>

          {/* Right: Quick Reviewer Actions & Collapse Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:ml-auto w-full sm:w-auto justify-between sm:justify-end">
            {/* Quick-fill sample button */}
            <button
              type="button"
              onClick={handleTriggerSample}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed font-headline font-bold text-[11px] hover:bg-primary-fixed/80 active:scale-95 transition-all shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Populates all 6 steps with valid data and jumps straight to Step 6 Review for rapid testing"
            >
              <Sparkles className="w-3 h-3 text-primary shrink-0" aria-hidden="true" />
              <span>Auto-Fill Sample Project &rarr; Review</span>
            </button>

            {/* Reset 3/hr rate limit */}
            <button
              type="button"
              onClick={handleResetLimit}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:text-primary font-headline font-bold text-[11px] border border-outline-variant/30 active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              title="Clears the 3/hour submission count in LocalStorage for testing"
            >
              <RotateCcw className="w-3 h-3 text-primary shrink-0" aria-hidden="true" />
              <span>Reset 3/hr Limit</span>
            </button>

            {/* Toggle collapse */}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse test harness panel' : 'Expand test harness panel'}
              className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Mode Selector & Verification Details */}
        {isExpanded && (
          <div className="space-y-3 pt-1 border-t border-outline-variant/10 animate-in fade-in duration-150">
            {/* The 5 Required Simulation Mode Buttons */}
            <div
              role="radiogroup"
              aria-label="API Fault Injection Scenarios"
              className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap scrollbar-none"
            >
              {PRIMARY_SIMULATION_MODES.map((mode) => {
                const Icon = mode.icon
                const isSelected = currentMode === mode.id
                return (
                  <button
                    key={mode.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectMode(mode.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-headline font-bold transition-all shrink-0 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                      isSelected ? mode.btnActiveColor : mode.btnInactiveColor
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{mode.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Active Mode Summary Box */}
            <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-left">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-headline font-black uppercase tracking-wider text-on-surface-variant">
                    Active Scenario:
                  </span>
                  <span className="font-headline font-black text-on-surface text-sm">
                    {activeModeObj.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${activeModeObj.badgeColor}`}>
                    {activeModeObj.badgeText}
                  </span>
                </div>
                <p className="text-on-surface-variant font-body text-[11px] leading-relaxed">
                  {activeModeObj.summary}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowGuide((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-headline font-bold text-primary hover:underline shrink-0 cursor-pointer self-start md:self-center"
              >
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{showGuide ? 'Hide Expected Behaviors' : 'View Expected Behaviors'}</span>
              </button>
            </div>

            {/* Expected Behaviors Collapsible Checklist */}
            {showGuide && (
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 space-y-2 text-left text-xs font-body animate-in fade-in">
                <div className="font-headline font-bold text-on-surface text-[11px] uppercase tracking-wider">
                  Expected Outcome Checklist for {activeModeObj.shortLabel}:
                </div>
                <ul className="space-y-1.5 text-on-surface-variant">
                  {activeModeObj.expectedBehaviors.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

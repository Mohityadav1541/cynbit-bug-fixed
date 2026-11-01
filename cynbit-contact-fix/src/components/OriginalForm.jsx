import React, { useState, useRef } from 'react'
import {
  Code2,
  ArrowRight,
  ShieldAlert,
  Terminal,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  Layers,
} from 'lucide-react'
import { SIMULATION_MODES } from '../utils/mockApi'

// Mock Promise simulating Cynbit Server Action without hitting production network
function createMockServerAction(shouldReject, latency = 900) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldReject) {
        const error = new TypeError('Failed to fetch: Connection terminated or server action rejected.')
        reject(error)
      } else {
        resolve({
          success: true,
          inquiryId: `CYN-${Math.floor(100000 + Math.random() * 900000)}`,
        })
      }
    }, latency)
  })
}

export default function OriginalForm({ simulationMode, onOpenCodeDiff }) {
  // Mode toggle: compare Original Flawed Pattern vs Improved Resilient Pattern
  const [activePattern, setActivePattern] = useState('original') // 'original' | 'improved'

  // Original Pattern States (faithful mirror of production decompiled code)
  const [originalLoading, setOriginalLoading] = useState(false)
  const [originalSubmitted, setOriginalSubmitted] = useState(false)
  const [originalError, setOriginalError] = useState(null)
  const [isPermanentlyFrozen, setIsPermanentlyFrozen] = useState(false)

  // Improved Pattern States
  const [improvedLoading, setImprovedLoading] = useState(false)
  const [improvedSubmitted, setImprovedSubmitted] = useState(false)
  const [improvedError, setImprovedError] = useState(null)
  const [canRetry, setCanRetry] = useState(false)

  // Runtime Event Stream Logs
  const [runtimeLogs, setRuntimeLogs] = useState([])
  const logCounterRef = useRef(1)

  const addRuntimeLog = (channel, message, level = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const ms = String(Date.now() % 1000).padStart(3, '0')
    const logItem = {
      id: logCounterRef.current++,
      timestamp: `${time}.${ms}`,
      channel,
      message,
      level,
    }
    setRuntimeLogs((prev) => [logItem, ...prev.slice(0, 49)])
  }

  // 1. ORIGINAL FLAWED SUBMISSION PATTERN
  // Decompiled from Next.js 15 chunk page-a581c8d7462124d9.js
  const runOriginalPattern = async (shouldFail) => {
    setOriginalSubmitted(false)
    setOriginalError(null)
    setIsPermanentlyFrozen(false)

    addRuntimeLog('EXEC', 'handleSubmit() triggered using original production code pattern.', 'info')
    addRuntimeLog('STATE', 'setLoading(true) applied -> Submit button disabled & spinner active.', 'info')
    setOriginalLoading(true)

    addRuntimeLog('ASYNC', 'Awaiting submitInquiry(formData) without try/catch or finally wrapper...', 'warn')

    try {
      // Bare await simulation:
      const result = await createMockServerAction(shouldFail, 900)

      // The lines below are ONLY reached if the promise resolves:
      setOriginalLoading(false)
      addRuntimeLog('STATE', 'setLoading(false) reached after promise resolution.', 'info')

      if (result.success) {
        setOriginalSubmitted(true)
        addRuntimeLog('SUCCESS', `Inquiry processed. Reference: ${result.inquiryId}`, 'success')
      } else {
        setOriginalError('Something went wrong.')
        addRuntimeLog('ERROR', 'setError("Something went wrong.") reached.', 'error')
      }
    } catch (unhandledRejection) {
      // NOTE: In the live production Next.js app, this error is UNCAUGHT, causing an
      // UnhandledPromiseRejection event that halts the call stack immediately.
      // We safely intercept it here ONLY to prevent breaking the overall React sandbox,
      // while faithfully preserving the frozen state that occurs on the live website.

      addRuntimeLog('CRASH', `Unhandled Promise Rejection: ${unhandledRejection.message}`, 'error')
      addRuntimeLog('HALT', 'CALL STACK ABORTED: Execution halted at "await submitInquiry(formData)".', 'error')
      addRuntimeLog('SKIPPED', 'LINE SKIPPED: "setLoading(false)" was NEVER REACHED.', 'error')
      addRuntimeLog('SKIPPED', 'LINE SKIPPED: "setError(...)" was NEVER REACHED.', 'error')
      addRuntimeLog('FROZEN', 'UI PERMANENTLY LOCKED: Button remains stuck in loading: true state.', 'error')

      // Intentionally DO NOT reset loading to false here, reproducing the exact live freeze:
      setIsPermanentlyFrozen(true)
    }
  }

  // 2. IMPROVED RESILIENT SUBMISSION PATTERN
  // Uses try...catch...finally with guaranteed loading state reset
  const runImprovedPattern = async (shouldFail) => {
    setImprovedSubmitted(false)
    setImprovedError(null)
    setCanRetry(false)

    addRuntimeLog('EXEC', 'handleSubmit() triggered using improved try/catch/finally pipeline.', 'info')
    addRuntimeLog('STATE', 'setLoading(true) applied -> Submit button disabled.', 'info')
    setImprovedLoading(true)

    try {
      addRuntimeLog('ASYNC', 'Awaiting submitInquiry(formData) inside try block...', 'info')
      const result = await createMockServerAction(shouldFail, 900)

      if (result.success) {
        setImprovedSubmitted(true)
        addRuntimeLog('SUCCESS', `Inquiry processed successfully. Reference: ${result.inquiryId}`, 'success')
      } else {
        setImprovedError('Server rejected the inquiry.')
        addRuntimeLog('WARN', 'Server error handled gracefully.', 'warn')
      }
    } catch (networkErr) {
      // Catch handler safely intercepts network exceptions
      setImprovedError(networkErr.message || 'Network connection failed.')
      setCanRetry(true)
      addRuntimeLog('CATCH', `Handled Exception: "${networkErr.message}". Form data preserved.`, 'warn')
    } finally {
      // Finally block GUARANTEES loading reset under all conditions
      setImprovedLoading(false)
      addRuntimeLog('FINALLY', 'finally block executed: setLoading(false) guaranteed. Button unlocked.', 'success')
    }
  }

  const handleExecute = (shouldFail) => {
    if (activePattern === 'original') {
      runOriginalPattern(shouldFail)
    } else {
      runImprovedPattern(shouldFail)
    }
  }

  const handleForceReset = () => {
    setOriginalLoading(false)
    setIsPermanentlyFrozen(false)
    setOriginalError(null)
    setOriginalSubmitted(false)
    addRuntimeLog('ADMIN', 'UI state manually reset by developer review tool.', 'info')
  }

  // Determine whether current simulator mode dictates failure
  const isSimulatedToFail =
    simulationMode === SIMULATION_MODES.NETWORK_ERROR ||
    simulationMode === SIMULATION_MODES.SERVER_500 ||
    simulationMode === SIMULATION_MODES.TIMEOUT

  return (
    <div className="space-y-8 text-left">
      {/* Top Disclaimer & Reproduction Label */}
      <section className="bg-surface-container-lowest border border-outline-variant/20 rounded-[2rem] p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 font-headline font-black text-[10px] uppercase tracking-wider border border-amber-500/30">
                Simulated reproduction of the reported production-code issue
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono text-[10px] font-bold border border-outline-variant/20">
                Source: chunk page-a581c8d7462124d9.js
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-headline font-black text-on-surface tracking-tight">
              Production Unhandled Rejection Inspector
            </h1>

            <p className="text-xs md:text-sm text-on-surface-variant max-w-3xl font-body leading-relaxed">
              This component provides an isolated laboratory reproduction of the critical asynchronous bug identified on
              Cynbit’s live contact page. Notice: Operates entirely in-memory using mock promises; does not make actual network requests to Cynbit&apos;s production backend.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenCodeDiff}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-headline font-bold text-xs border border-outline-variant/30 transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer self-start lg:self-center"
          >
            <Code2 className="w-4 h-4 text-primary" aria-hidden="true" />
            <span>View Decompiled Code Diff</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Interactive Pattern Selector (Original vs Improved) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container-low p-4 rounded-3xl border border-outline-variant/15">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="text-xs font-headline font-black uppercase tracking-wider text-on-surface">
            Execution Harness Mode:
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActivePattern('original')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-full text-xs font-headline font-bold transition-all cursor-pointer ${
              activePattern === 'original'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            1. Original Flawed Pattern (Bare Await)
          </button>
          <button
            type="button"
            onClick={() => setActivePattern('improved')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-full text-xs font-headline font-bold transition-all cursor-pointer ${
              activePattern === 'improved'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            2. Improved Pattern (try/catch/finally)
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Form Reproduction */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-5 sm:p-8 md:p-10 rounded-3xl md:rounded-[2.5rem] border border-outline-variant/15 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
            <div>
              <span className="text-[10px] font-headline font-black uppercase tracking-widest text-primary block mb-1">
                {activePattern === 'original' ? 'Production Code Pattern' : 'Improved Resilient Pattern'}
              </span>
              <h2 className="text-xl font-headline font-black text-on-surface">
                {activePattern === 'original' ? 'Bare await submitInquiry()' : 'try...catch...finally Pipeline'}
              </h2>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                activePattern === 'original'
                  ? 'bg-amber-500/10 text-amber-800 border border-amber-500/20'
                  : 'bg-primary/10 text-primary border border-primary/20'
              }`}
            >
              {activePattern === 'original' ? 'NO FINALLY BLOCK' : 'FAULT TOLERANT'}
            </span>
          </div>

          {/* Quick Scenario Triggers */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 space-y-3">
            <span className="text-[11px] font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
              Trigger Simulated Promise Outcome:
            </span>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => handleExecute(true)}
                disabled={originalLoading && activePattern === 'original'}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-error text-white font-headline text-xs font-bold shadow-xs hover:bg-error/90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Trigger Promise Rejection (Network Drop)</span>
              </button>

              <button
                type="button"
                onClick={() => handleExecute(false)}
                disabled={originalLoading && activePattern === 'original'}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high font-headline text-xs font-bold border border-outline-variant/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Trigger Promise Resolution (200 OK)</span>
              </button>

              {isPermanentlyFrozen && activePattern === 'original' && (
                <button
                  type="button"
                  onClick={handleForceReset}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-amber-500/15 text-amber-900 font-headline text-xs font-bold border border-amber-500/30 hover:bg-amber-500/25 active:scale-95 transition-all cursor-pointer animate-pulse"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Force Reset Frozen UI State</span>
                </button>
              )}
            </div>
          </div>

          {/* Frozen State Alert */}
          {isPermanentlyFrozen && activePattern === 'original' && (
            <div
              role="alert"
              className="p-5 rounded-2xl bg-error-container text-on-error-container border-2 border-error/40 space-y-3 animate-in fade-in"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-error shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <div className="font-headline font-black text-xs uppercase tracking-wider text-error">
                    CRITICAL BUG REPRODUCED &bull; UI PERMANENTLY LOCKED
                  </div>
                  <p className="text-xs font-body leading-relaxed">
                    The network request rejected. Because the original source has <strong>no catch block and no finally block</strong>, execution halted at line 7.
                    <code className="font-mono font-bold block mt-1 bg-white/40 p-2 rounded-lg text-[11px]">
                      setLoading(false) was NEVER REACHED.
                    </code>
                    The submit button below is now permanently disabled in the loading state. Notice also that <strong>no error message</strong> is displayed to the user because <code className="font-mono">setError()</code> was also skipped!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Original Mode Success or Error Notice */}
          {activePattern === 'original' && originalSubmitted && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-900 border border-emerald-500/30 flex items-center gap-3 text-xs font-headline font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Inquiry processed. Notice: In original code, this line executes only when the network succeeds.</span>
            </div>
          )}

          {activePattern === 'original' && originalError && (
            <div className="p-4 rounded-2xl bg-error-container text-on-error-container border border-error/30 text-xs font-headline font-bold">
              {originalError}
            </div>
          )}

          {/* Improved Mode Success or Error Notice */}
          {activePattern === 'improved' && improvedSubmitted && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-900 border border-emerald-500/30 flex items-center gap-3 text-xs font-headline font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Inquiry submitted successfully. Draft purged and SLA confirmed.</span>
            </div>
          )}

          {activePattern === 'improved' && improvedError && (
            <div className="p-5 rounded-2xl bg-error-container text-on-error-container border border-error/30 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-headline font-bold text-error">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Exception Caught Gracefully: {improvedError}</span>
              </div>
              <p className="font-body text-on-error-container/90">
                Loading state was safely reset in the <code className="font-mono font-bold">finally</code> block. Your data is 100% preserved.
              </p>
              {canRetry && (
                <button
                  type="button"
                  onClick={() => runImprovedPattern(false)}
                  className="px-4 py-2 rounded-full bg-primary text-white font-headline text-xs font-bold hover:bg-primary-container active:scale-95 transition-all cursor-pointer mt-1"
                >
                  Retry Submission
                </button>
              )}
            </div>
          )}

          {/* Form Inputs (Faithful reproduction of original fields) */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleExecute(isSimulatedToFail)
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                  Full Name
                </label>
                <input
                  type="text"
                  defaultValue="Alex Demo"
                  disabled={activePattern === 'original' ? originalLoading : improvedLoading}
                  className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-xs font-body text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                  Email Address
                </label>
                <input
                  type="email"
                  defaultValue="alex@example.com"
                  disabled={activePattern === 'original' ? originalLoading : improvedLoading}
                  className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-xs font-body text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                Project Message
              </label>
              <textarea
                rows={3}
                defaultValue="Inquiring about enterprise autonomous AI multi-agent orchestration for logistics."
                disabled={activePattern === 'original' ? originalLoading : improvedLoading}
                className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-xs font-body text-on-surface focus:outline-none focus:border-primary disabled:opacity-50 resize-none"
              />
            </div>

            {/* The Submit Button: Demonstrating the Freeze */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={activePattern === 'original' ? originalLoading : improvedLoading}
                className={`w-full py-4 rounded-full font-headline font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                  isPermanentlyFrozen && activePattern === 'original'
                    ? 'bg-error text-white ring-4 ring-error/30 cursor-not-allowed'
                    : (activePattern === 'original' ? originalLoading : improvedLoading)
                    ? 'bg-primary/70 text-white cursor-wait'
                    : 'bg-primary text-white hover:bg-primary-container active:scale-95'
                }`}
              >
                {(activePattern === 'original' ? originalLoading : improvedLoading) ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                    <span>
                      {isPermanentlyFrozen && activePattern === 'original'
                        ? 'FROZEN: loading=true (setLoading(false) never ran)'
                        : 'Transmitting to Server...'}
                    </span>
                  </>
                ) : (
                  <span>
                    {activePattern === 'original' ? 'Submit Inquiry (Bare Await)' : 'Submit Inquiry (try/catch/finally)'}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Runtime Event Stream & Architectural Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          {/* Real-Time Event Stream */}
          <div className="bg-[#111314] text-slate-100 rounded-3xl border border-white/10 shadow-xl overflow-hidden text-left">
            <div className="bg-[#181c1d] px-5 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary-fixed" aria-hidden="true" />
                <span className="text-xs font-mono font-bold tracking-tight">Runtime Execution Stream</span>
              </div>
              <button
                type="button"
                onClick={() => setRuntimeLogs([])}
                className="text-[10px] font-mono uppercase text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Clear Stream
              </button>
            </div>

            <div className="p-4 font-mono text-[11px] h-64 overflow-y-auto space-y-2 scrollbar-none">
              {runtimeLogs.length === 0 ? (
                <div className="text-slate-500 italic p-2">
                  Awaiting execution. Click &quot;Trigger Promise Rejection&quot; on the left to inspect the JavaScript event sequence.
                </div>
              ) : (
                runtimeLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-500 shrink-0 text-[10px]">[{log.timestamp}]</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                        log.channel === 'CRASH' || log.channel === 'FROZEN' || log.channel === 'SKIPPED'
                          ? 'bg-rose-900/60 text-rose-300 border border-rose-500/40'
                          : log.channel === 'SUCCESS' || log.channel === 'FINALLY'
                          ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                          : log.channel === 'WARN' || log.channel === 'CATCH'
                          ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {log.channel}
                    </span>
                    <span
                      className={`${
                        log.level === 'error'
                          ? 'text-rose-300 font-semibold'
                          : log.level === 'warn'
                          ? 'text-amber-300'
                          : log.level === 'success'
                          ? 'text-emerald-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Architectural Comparison Card */}
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 space-y-4 shadow-sm text-left">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Architectural Comparison</span>
            </h3>

            <div className="space-y-3 text-xs font-body">
              {/* Original Card */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                <span className="font-headline font-black text-amber-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Original Code (`page-a581c8d7462124d9.js`)</span>
                </span>
                <ul className="text-amber-950/80 space-y-1 text-[11px] list-disc list-inside">
                  <li><strong>No catch:</strong> Promise rejection halts function execution immediately.</li>
                  <li><strong>No finally:</strong> <code className="font-mono">setLoading(false)</code> never runs.</li>
                  <li><strong>Silent Failure:</strong> Error setter is skipped; user receives zero feedback.</li>
                  <li><strong>UI Lockup:</strong> Button disabled permanently until manual browser reload.</li>
                </ul>
              </div>

              {/* Improved Card */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                <span className="font-headline font-black text-emerald-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Improved Implementation</span>
                </span>
                <ul className="text-emerald-950/80 space-y-1 text-[11px] list-disc list-inside">
                  <li><strong>try/catch/finally:</strong> <code className="font-mono">finally</code> always runs, guaranteeing state reset.</li>
                  <li><strong>Network Error Handling:</strong> Traps `AbortError`, `TypeError`, and HTTP errors.</li>
                  <li><strong>Data Preserved:</strong> User specifications remain in state and storage.</li>
                  <li><strong>Actionable Recovery:</strong> Retry button, copy brief, email, and WhatsApp.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

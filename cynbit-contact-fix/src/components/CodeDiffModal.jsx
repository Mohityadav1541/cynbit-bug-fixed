import React, { useEffect, useRef } from 'react'
import { X, Code2, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function CodeDiffModal({ isOpen, onClose }) {
  const closeBtnRef = useRef(null)

  // Keyboard Escape listener & focus trap management (resolves ISSUE-08 / WCAG 2.1.2)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    if (closeBtnRef.current) {
      closeBtnRef.current.focus()
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diff-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-3xl md:rounded-[2.5rem] max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-4 sm:p-8 md:p-10 space-y-6 text-left">
        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="diff-modal-title" className="font-headline font-black text-lg text-on-surface">
                Decompiled Bug &amp; Architecture Solution
              </h3>
              <p className="text-xs font-mono text-on-surface-variant opacity-75 truncate max-w-lg">
                Source: <code>/_next/static/chunks/app/(marketing)/contact/page-a581c8d7462124d9.js</code>
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Side by side comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs font-mono">
          {/* Before: Cynbit Production Source */}
          <div className="space-y-3 bg-[#181c1d] p-5 rounded-3xl border border-error/30 text-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-rose-400 font-bold border-b border-white/10 pb-2.5">
              <span className="flex items-center gap-1.5 font-headline">
                <AlertTriangle className="w-4 h-4" />
                <span>BEFORE (Cynbit Production)</span>
              </span>
              <span className="text-[10px] uppercase bg-error-container text-on-error-container px-2.5 py-0.5 rounded-full font-bold">
                Buggy
              </span>
            </div>
            <pre className="text-slate-300 overflow-x-auto p-2 leading-relaxed text-[11px] scrollbar-none">
{`// Decompiled directly from Cynbit production:
let x = (0, d.createServerReference)(
  "40247ba4465344b3386595bab4303317cdcce907df",
  d.callServer,
  void 0,
  d.findSourceMapURL,
  "submitInquiry"
);

function ContactForm() {
  let [submitting, setSubmitting] = useState(false);
  let [success, setSuccess] = useState(false);
  let [errorMsg, setErrorMsg] = useState(null);

  // ⚠️ BUG 1: Bare async without try/catch
  let handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    let formData = new FormData(e.currentTarget);
    
    // Unhandled promise rejection if network drops or 500
    let r = await x(formData); 
    
    setSubmitting(false);
    r.success 
      ? setSuccess(true) 
      : setErrorMsg("Something went wrong. Please try again...");
  };

  return (
    // ⚠️ BUG 2: Labels lack 'htmlFor' and inputs lack 'id'
    <form onSubmit={handleSubmit}>
      <label>Full Name</label>
      <input name="fullName" required />

      <label>Email Address</label>
      <input name="email" type="email" required />

      // ⚠️ BUG 3: No Honeypot or anti-bot defense
      // ⚠️ BUG 4: No rate limiter
      // ⚠️ BUG 5: No LocalStorage draft saving
    </form>
  );
}`}
            </pre>
          </div>

          {/* After: Our Solution */}
          <div className="space-y-3 bg-[#181c1d] p-5 rounded-3xl border border-primary/40 text-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-primary-fixed font-bold border-b border-white/10 pb-2.5">
              <span className="flex items-center gap-1.5 font-headline">
                <CheckCircle2 className="w-4 h-4 text-primary-fixed" />
                <span>AFTER (Cynbit Discovery Solution)</span>
              </span>
              <span className="text-[10px] uppercase bg-primary-container text-white px-2.5 py-0.5 rounded-full font-bold">
                Fault-Tolerant
              </span>
            </div>
            <pre className="text-slate-300 overflow-x-auto p-2 leading-relaxed text-[11px] scrollbar-none">
{`export function ImprovedDiscoveryEngine({ simulationMode }) {
  // ✅ 1. Auto-Draft persistence in LocalStorage
  const [formData, setFormData] = useState(() => loadDraft());

  // ✅ 2. Fault-Tolerant Async with try...catch...finally
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Anti-spam token & rate limit checks
    if (!checkRateLimit().allowed) return setRateError();
    if (formData.honeypotField) return silentBotSuccess();
    if (!checkTimingHoneypot()) return rejectFastBot();

    setSubmitting(true);
    try {
      const sanitized = sanitizePayload(formData);
      const res = await submitInquiryMock(sanitized, simulationMode);

      if (res.success) {
        clearDraft();
        recordSubmission();
        setSuccess(true);
      } else {
        setError(res.error || "Server issue");
      }
    } catch (networkError) {
      // ✅ Graceful catch: No unhandled rejection!
      setError("Network offline. Your draft is safe.");
      engageFallbackChannels(); // WhatsApp / Copy email
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // ✅ 3. WCAG 2.1 AA Compliant IDs & htmlFor
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="field-fullName">Full Name</label>
      <input 
        id="field-fullName" 
        aria-invalid={!!errors.fullName}
        aria-describedby="error-fullName" 
      />

      {/* Hidden honeypot catches 99% of bots */}
      <input type="text" tabIndex={-1} aria-hidden="true" />
    </form>
  );
}`}
            </pre>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-full text-xs font-headline font-bold bg-surface-container hover:bg-surface-container-high text-on-surface transition-all cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  )
}

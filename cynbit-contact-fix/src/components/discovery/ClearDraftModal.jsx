import { useEffect, useRef } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

export function ClearDraftModal({ isOpen, onCancel, onConfirm }) {
  const cancelButtonRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      // Focus Cancel button for safety when dialog opens
      cancelButtonRef.current?.focus()

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onCancel()
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="clear-draft-title"
      aria-describedby="clear-draft-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-surface-container-lowest max-w-md w-full rounded-[2rem] p-6 md:p-8 border border-outline-variant/30 shadow-2xl space-y-6 text-left relative animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close dialog"
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-error/15 text-error flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <h2 id="clear-draft-title" className="text-xl font-headline font-black text-on-surface tracking-tight">
              Discard Project Draft?
            </h2>
            <p id="clear-draft-desc" className="text-xs text-on-surface-variant font-body leading-relaxed">
              Are you sure you want to delete your auto-saved architectural specifications?
              All entered details, technology selections, and custom parameters will be cleared.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container text-[11px] font-body text-on-surface-variant leading-relaxed border border-outline-variant/15">
          <strong className="font-bold text-on-surface block mb-0.5">Privacy Notice:</strong>
          Your draft is stored locally on this machine only. Discarding will completely remove all cached specifications from browser storage.
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-3 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high font-headline font-bold text-xs transition-all active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Cancel, Keep Draft
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto px-5 py-3 rounded-full bg-error text-white hover:bg-error/90 font-headline font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Yes, Discard Draft</span>
          </button>
        </div>
      </div>
    </div>
  )
}


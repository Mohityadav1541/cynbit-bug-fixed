import { useState, useEffect } from 'react'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      // Flash "Back online" briefly if the user was offline previously
      setWasOffline(true)
      const timer = setTimeout(() => setWasOffline(false), 4000)
      return () => clearTimeout(timer)
    }

    const handleOffline = () => {
      setIsOffline(true)
      setWasOffline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleManualCheck = () => {
    setIsChecking(true)
    setTimeout(() => {
      setIsOffline(!navigator.onLine)
      setIsChecking(false)
    }, 600)
  }

  if (!isOffline && !wasOffline) {
    return null
  }

  if (wasOffline && !isOffline) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="w-full bg-emerald-600 text-white px-4 py-2.5 text-xs font-headline font-bold flex items-center justify-between shadow-md transition-all animate-in fade-in"
      >
        <div className="flex items-center gap-2 mx-auto">
          <Wifi className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Connection Restored &bull; You are back online. Form submissions are now enabled.</span>
        </div>
      </aside>
    )
  }

  return (
    <aside
      role="alert"
      aria-live="assertive"
      aria-label="Offline connection warning"
      className="w-full bg-[#ba1a1a] text-white px-4 py-3 text-xs font-headline font-semibold flex flex-wrap items-center justify-between gap-3 shadow-lg transition-all animate-in slide-in-from-top-2"
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <WifiOff className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        <div className="text-left space-y-0.5">
          <div className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
            <span>You Are Currently Offline</span>
            <span className="px-2 py-0.5 rounded-full bg-white text-[#ba1a1a] text-[10px] font-mono font-bold">
              NO CONNECTION
            </span>
          </div>
          <p className="text-white/90 text-xs font-medium font-body">
            Your project blueprint is being auto-saved locally in real time. We will hold your submission until you reconnect.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={handleManualCheck}
          disabled={isChecking}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#ba1a1a] text-xs font-bold hover:bg-white/90 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>{isChecking ? 'Checking...' : 'Check Connection'}</span>
        </button>
      </div>
    </aside>
  )
}


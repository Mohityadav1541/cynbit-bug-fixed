import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import SimulatorBar from './components/SimulatorBar'
import { OfflineBanner } from './components/OfflineBanner'
import ImprovedDiscoveryEngine from './components/ImprovedDiscoveryEngine'
import OriginalForm from './components/OriginalForm'
import AuditReport from './components/AuditReport'
import CodeDiffModal from './components/CodeDiffModal'
import { SIMULATION_MODES } from './utils/mockApi'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import { isReviewerModeActive, setReviewerMode } from './config/cynbitConfig'

// Lightweight React Error Boundary for Production Resilience
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Cynbit Engine Error Caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6 text-center">
          <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/20 shadow-xl max-w-md w-full">
            <h2 className="text-xl font-headline font-black text-on-surface mb-2">Something went wrong</h2>
            <p className="text-sm text-on-surface-variant mb-6 font-body">An unexpected interface error occurred. Please refresh the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-white py-3 rounded-full font-headline font-black text-xs uppercase tracking-widest hover:bg-primary-container transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [isReviewerMode, setIsReviewerMode] = useState(isReviewerModeActive)
  const [activeTab, setActiveTab] = useState('improved')
  const [simulationMode, setSimulationMode] = useState(SIMULATION_MODES.SUCCESS)
  const [isCodeDiffOpen, setIsCodeDiffOpen] = useState(false)

  // Derived effective active tab and simulation mode guaranteeing customer isolation
  const effectiveActiveTab = isReviewerMode ? activeTab : 'improved'
  const effectiveSimulationMode = isReviewerMode ? simulationMode : SIMULATION_MODES.SUCCESS

  // Sync state if user changes search parameter / navigates history
  useEffect(() => {
    const handlePopState = () => {
      setIsReviewerMode(isReviewerModeActive())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Explicit reviewer mode toggle
  const handleToggleReviewerMode = (enabled) => {
    setReviewerMode(enabled)
    setIsReviewerMode(enabled)
    try {
      const url = new URL(window.location.href)
      if (enabled) {
        url.searchParams.set('reviewer', '1')
      } else {
        url.searchParams.delete('reviewer')
      }
      window.history.replaceState({}, '', url.toString())
    } catch {
      // ignore
    }
    if (!enabled) {
      setActiveTab('improved')
      setSimulationMode(SIMULATION_MODES.SUCCESS)
      setIsCodeDiffOpen(false)
    }
  }

  // Dynamically update document title based on client tab routing
  useEffect(() => {
    const titles = {
      improved: 'Cynbit Technologies | Architecture Discovery Engine',
      original: 'Legacy Form Bug Inspection | Cynbit Technologies',
      audit: 'Engineering Security & Technical Audit | Cynbit Technologies',
    }
    document.title = titles[effectiveActiveTab] || 'Cynbit Technologies | Architecture Discovery Engine'
  }, [effectiveActiveTab])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-surface text-on-surface flex flex-col font-body selection:bg-primary selection:text-white">
        {/* Top Reviewer Mode Indicator Banner */}
        {isReviewerMode && (
          <aside
            aria-label="Reviewer Mode Active Notice"
            className="bg-amber-500/10 border-b border-amber-500/30 text-amber-950 px-4 md:px-8 py-2 text-xs font-headline flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 z-40"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-black uppercase tracking-wider text-[11px] text-amber-900">
                Reviewer &amp; Evaluation Mode Active
              </span>
              <span className="text-[11px] text-amber-800/80 hidden md:inline">
                (Query parameter <code>?reviewer=1</code> detected &bull; Fault injection simulator, baseline bug reproduction, and technical audit enabled)
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleToggleReviewerMode(false)}
              className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 transition-all cursor-pointer border border-amber-500/30 self-end sm:self-auto"
            >
              Exit to Customer View
            </button>
          </aside>
        )}

        {/* Top Header */}
        <Header
          activeTab={effectiveActiveTab}
          setActiveTab={setActiveTab}
          onOpenCodeDiff={() => setIsCodeDiffOpen(true)}
          isReviewerMode={isReviewerMode}
        />

        {/* Global Offline Network Status Banner */}
        <OfflineBanner />

        {/* Dedicated Engineering Test Simulator (Reviewer Mode Only) */}
        {isReviewerMode && (
          <SimulatorBar
            currentMode={simulationMode}
            onChangeMode={(mode) => setSimulationMode(mode)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-grow max-w-screen-2xl mx-auto px-4 md:px-8 lg:px-12 py-8 md:py-12 w-full">
          {effectiveActiveTab === 'improved' && (
            <ImprovedDiscoveryEngine
              simulationMode={effectiveSimulationMode}
              isReviewerMode={isReviewerMode}
            />
          )}

          {isReviewerMode && effectiveActiveTab === 'original' && (
            <OriginalForm
              simulationMode={simulationMode}
              onOpenCodeDiff={() => setIsCodeDiffOpen(true)}
            />
          )}

          {isReviewerMode && effectiveActiveTab === 'audit' && (
            <AuditReport onOpenCodeDiff={() => setIsCodeDiffOpen(true)} />
          )}
        </main>

        {/* Code Diff Inspection Modal (Reviewer Mode Only) */}
        {isReviewerMode && (
          <CodeDiffModal
            isOpen={isCodeDiffOpen}
            onClose={() => setIsCodeDiffOpen(false)}
          />
        )}

        {/* Cynbit Architectural Footer */}
        <footer className="border-t border-outline-variant/15 bg-surface-container-lowest py-10 text-xs text-on-surface-variant font-body">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Cynbit Logo" className="h-6 w-auto" />
              <span className="text-on-surface-variant opacity-60">|</span>
              <span className="font-semibold text-on-surface">Cynbit Technologies</span>
              <span className="hidden sm:inline text-on-surface-variant opacity-75">
                &bull; Full Stack Developer Intern Assessment
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5 text-primary font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero Secrets &bull; Clean Architecture</span>
              </div>
              <span className="text-outline-variant/40">|</span>
              <a
                href="https://www.cynbit.in"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors flex items-center gap-1 font-semibold"
              >
                <span>cynbit.in</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-outline-variant/40">|</span>
              {!isReviewerMode ? (
                <button
                  type="button"
                  onClick={() => handleToggleReviewerMode(true)}
                  className="hover:text-primary transition-colors text-[11px] text-on-surface-variant/40 hover:text-on-surface-variant cursor-pointer"
                  title="Switch to Reviewer / Evaluation Mode (?reviewer=1)"
                >
                  Reviewer Mode (?reviewer=1)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleReviewerMode(false)}
                  className="hover:text-primary transition-colors text-[11px] text-amber-700 font-semibold cursor-pointer"
                  title="Exit to normal customer view"
                >
                  Customer View
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  )
}

import React, { useState } from 'react'
import { Sparkles, Bug, FileText, Code2, ExternalLink, Menu, X } from 'lucide-react'

export default function Header({ activeTab, setActiveTab, onOpenCodeDiff }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const tabs = [
    {
      id: 'improved',
      label: 'Architecture Discovery',
      badge: 'Production Fix',
      badgeStyle: 'bg-primary-container text-white',
      activeStyle: 'bg-primary text-white shadow-md shadow-primary/20',
      icon: Sparkles,
    },
    {
      id: 'original',
      label: 'Bug Inspector',
      badge: 'Baseline',
      badgeStyle: 'bg-amber-100 text-amber-900 border border-amber-300',
      activeStyle: 'bg-amber-100 text-amber-900 border border-amber-300 shadow-sm',
      icon: Bug,
    },
    {
      id: 'audit',
      label: 'Technical Audit',
      badge: null,
      activeStyle: 'bg-surface-container text-on-surface border border-outline-variant/30 shadow-sm',
      icon: FileText,
    },
  ]

  const handleTabChange = (id) => {
    setActiveTab(id)
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 glass-nav border-b border-outline-variant/15 text-on-surface">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Official Cynbit Brand Logo */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center hover:scale-105 active:scale-95 transition-transform duration-200">
              <img
                src="/logo.svg"
                alt="Cynbit Technologies"
                className="h-8 md:h-10 w-auto"
              />
            </a>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-outline-variant/20">
              <span className="text-[10px] uppercase font-headline font-black tracking-widest px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary/20">
                Intern Assessment
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1.5 bg-surface-container-low p-1.5 rounded-full border border-outline-variant/15">
            {tabs.map(({ id, label, badge, badgeStyle, activeStyle, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-headline font-bold transition-all duration-200 ${
                  activeTab === id
                    ? activeStyle
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
                {badge && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${badgeStyle}`}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={onOpenCodeDiff}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-headline font-bold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 transition-all active:scale-95"
            >
              <Code2 className="w-3.5 h-3.5 text-primary" />
              <span>Inspect Decompiled Bug</span>
            </button>
            <a
              href="https://www.cynbit.in/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary font-headline font-semibold transition-colors"
            >
              <span>Live Site</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden p-2.5 rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/15 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-outline-variant/15 bg-surface px-4 py-4 space-y-2 animate-in fade-in duration-150">
          {tabs.map(({ id, label, badge, badgeStyle, activeStyle, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTabChange(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-headline font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeTab === id
                  ? activeStyle
                  : 'text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
              {badge && (
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${badgeStyle}`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
          <div className="pt-2 border-t border-outline-variant/15 flex items-center gap-2">
            <button
              type="button"
              onClick={() => { onOpenCodeDiff(); setMobileMenuOpen(false) }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-full text-xs font-headline font-bold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Code2 className="w-3.5 h-3.5 text-primary" />
              <span>Inspect Bug Diff</span>
            </button>
            <a
              href="https://www.cynbit.in/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-xs text-on-surface-variant hover:text-primary font-headline font-bold transition-colors bg-surface-container border border-outline-variant/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Live Site</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </header>
  )
}

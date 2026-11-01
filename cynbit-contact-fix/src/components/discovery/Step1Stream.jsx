import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { STREAM_OPTIONS } from './discoveryConstants'

export default function Step1Stream({ selectedStream, onSelectStream }) {
  const handleKeyDown = (e, index) => {
    let nextIndex = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      nextIndex = (index + 1) % STREAM_OPTIONS.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      nextIndex = (index - 1 + STREAM_OPTIONS.length) % STREAM_OPTIONS.length
    }

    if (nextIndex !== null) {
      const nextStream = STREAM_OPTIONS[nextIndex]
      if (nextStream) {
        onSelectStream(nextStream.id)
        const el = document.getElementById(`stream-option-${nextStream.id}`)
        if (el) el.focus()
      }
    }
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby="step1-title"
      aria-describedby="step1-desc"
      className="space-y-6 text-left"
    >
      <div>
        <h2 id="step1-title" className="text-xl sm:text-2xl font-headline font-black text-on-surface tracking-tight">
          Select an Engagement Stream
        </h2>
        <p id="step1-desc" className="text-sm text-on-surface-variant font-body mt-1">
          Choose the architectural discipline that best aligns with your organization&apos;s strategic objectives.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STREAM_OPTIONS.map((item, index) => {
          const Icon = item.icon
          const isSelected = selectedStream === item.id

          return (
            <button
              type="button"
              id={`stream-option-${item.id}`}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : 0}
              key={item.id}
              onClick={() => onSelectStream(item.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`p-6 rounded-3xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.99] ${
                isSelected
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/20'
                  : 'bg-surface-container-low border-outline-variant/15 text-on-surface hover:border-primary/40 hover:bg-surface-container-lowest'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    aria-hidden="true"
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-surface-container text-primary'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-headline font-black uppercase tracking-widest">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Selected</span>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-headline font-black text-lg">{item.title}</h3>
                  <p className={`text-xs mt-2 leading-relaxed font-body ${isSelected ? 'text-white/85' : 'text-on-surface-variant'}`}>
                    {item.desc}
                  </p>
                </div>
              </div>

              {/* Tag Highlights */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-current/10" aria-label={`${item.title} key highlights`}>
                {item.highlights.map((h, i) => (
                  <span
                    key={i}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-headline font-bold ${
                      isSelected
                        ? 'bg-white/15 text-white'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {h}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

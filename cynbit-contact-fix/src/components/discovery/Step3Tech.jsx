import React from 'react'
import { Check, Code2 } from 'lucide-react'
import { TECH_OPTIONS } from './discoveryConstants'

export default function Step3Tech({ selectedTech, onToggleTech, customTech, onCustomTechChange }) {
  const isOtherSelected = selectedTech.includes('Other')

  return (
    <div
      role="group"
      aria-labelledby="step3-title"
      aria-describedby="step3-desc"
      className="space-y-6 text-left"
    >
      <div>
        <h2 id="step3-title" className="text-xl sm:text-2xl font-headline font-black text-on-surface tracking-tight">
          Technical Stack &amp; Architectural Preferences
        </h2>
        <p id="step3-desc" className="text-sm text-on-surface-variant font-body mt-1">
          Select all technologies you are evaluating or currently utilize. Multiple selections allowed.
        </p>
      </div>

      <div
        role="group"
        aria-label="Available Technologies"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
      >
        {TECH_OPTIONS.map((item) => {
          const isSelected = selectedTech.includes(item.id)
          return (
            <button
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              aria-label={`${item.label}, ${item.category} category`}
              key={item.id}
              onClick={() => onToggleTech(item.id)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95 ${
                isSelected
                  ? 'bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20'
                  : 'bg-surface-container-low border-outline-variant/15 text-on-surface hover:border-primary/40 hover:bg-surface-container-lowest'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  aria-hidden="true"
                  className={`text-[9px] uppercase font-headline font-black tracking-wider ${
                    isSelected ? 'text-white/80' : 'text-on-surface-variant opacity-60'
                  }`}
                >
                  {item.category}
                </span>
                <span
                  aria-hidden="true"
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isSelected ? 'bg-white text-primary' : 'border border-outline-variant/30 text-transparent'
                  }`}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              </div>
              <div className="font-headline font-bold text-sm">{item.label}</div>
            </button>
          )
        })}
      </div>

      {/* Custom Tech Field if Other selected */}
      {isOtherSelected && (
        <div className="space-y-1.5 animate-in fade-in duration-200 pt-2">
          <label
            htmlFor="field-customTech"
            className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-75 ml-2"
          >
            Specify Other Technologies or Frameworks
          </label>
          <input
            id="field-customTech"
            name="customTech"
            type="text"
            value={customTech}
            onChange={(e) => onCustomTechChange(e.target.value)}
            placeholder="e.g. LangChain, Rust, Redis, Snowflake, GraphQL"
            className="w-full bg-surface-container-low border border-outline-variant/15 rounded-2xl px-6 py-4 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:bg-white transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          />
        </div>
      )}

      {/* Selected tags indicator */}
      <div
        className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/15 flex items-center justify-between gap-4"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-xs text-on-surface">
          <Code2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          <span className="font-headline font-bold">Selected Stack Elements:</span>
          <span className="text-primary font-bold">{selectedTech.length} Technologies</span>
        </div>
        {selectedTech.length === 0 && (
          <span className="text-xs text-on-surface-variant opacity-60 italic">None selected yet (optional)</span>
        )}
      </div>
    </div>
  )
}

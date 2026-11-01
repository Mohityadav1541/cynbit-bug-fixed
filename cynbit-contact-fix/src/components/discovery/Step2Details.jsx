import React from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default function Step2Details({ formData, errors, touched, onChange, onBlur }) {
  const isTitleInvalid = touched.projectTitle && !!errors.projectTitle
  const isDescInvalid = touched.projectDescription && !!errors.projectDescription

  return (
    <div role="group" aria-labelledby="step2-title" aria-describedby="step2-desc" className="space-y-6 text-left">
      <div>
        <h2 id="step2-title" className="text-xl sm:text-2xl font-headline font-black text-on-surface tracking-tight">
          Project Details &amp; Objectives
        </h2>
        <p id="step2-desc" className="text-sm text-on-surface-variant font-body mt-1">
          Provide contextual specifications so our digital architects can evaluate scope, feasibility, and technical constraints.
        </p>
      </div>

      <div className="space-y-5">
        {/* Project Title */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="field-projectTitle"
              className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-75 ml-2"
            >
              Project Title <span className="text-error" aria-hidden="true">*</span>
              <span className="sr-only">(Required)</span>
            </label>
            {touched.projectTitle && !errors.projectTitle && formData.projectTitle && (
              <span className="text-[10px] text-primary flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Valid title
              </span>
            )}
          </div>

          <p id="desc-projectTitle" className="sr-only">
            A concise working title for your architectural initiative or software system.
          </p>

          <input
            id="field-projectTitle"
            name="projectTitle"
            type="text"
            required
            value={formData.projectTitle}
            onChange={onChange}
            onBlur={onBlur}
            aria-required="true"
            aria-invalid={isTitleInvalid ? 'true' : 'false'}
            aria-describedby={`desc-projectTitle ${isTitleInvalid ? 'error-projectTitle' : ''}`.trim()}
            placeholder="e.g. Enterprise Autonomous Claims Processing Agent"
            className={`w-full bg-surface-container-low border rounded-2xl px-6 py-4 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:bg-white transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              isTitleInvalid
                ? 'border-error focus:ring-2 focus:ring-error/20'
                : 'border-outline-variant/15 focus:border-primary'
            }`}
          />

          {isTitleInvalid && (
            <p
              id="error-projectTitle"
              role="alert"
              aria-live="assertive"
              className="text-xs text-error flex items-center gap-1.5 mt-1 font-medium"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                <strong className="font-bold">Error:</strong> {errors.projectTitle}
              </span>
            </p>
          )}
        </div>

        {/* Project Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="field-projectDescription"
              className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-75 ml-2"
            >
              Project Description <span className="text-error" aria-hidden="true">*</span>
              <span className="sr-only">(Required)</span>
            </label>
            <span
              id="desc-projectDescription-length"
              className="text-[10px] font-mono text-on-surface-variant opacity-60"
              aria-label={`${(formData.projectDescription || '').length} of 3000 characters used`}
            >
              {(formData.projectDescription || '').length} / 3000 chars
            </span>
          </div>

          <p id="desc-projectDescription" className="sr-only">
            Provide a high-level architectural overview describing what you are building and core requirements. Minimum 15 characters.
          </p>

          <textarea
            id="field-projectDescription"
            name="projectDescription"
            required
            rows={4}
            value={formData.projectDescription}
            onChange={onChange}
            onBlur={onBlur}
            aria-required="true"
            aria-invalid={isDescInvalid ? 'true' : 'false'}
            aria-describedby={`desc-projectDescription desc-projectDescription-length ${
              isDescInvalid ? 'error-projectDescription' : ''
            }`.trim()}
            placeholder="Provide a high-level architectural overview: What systems are you building? Who will use them?"
            className={`w-full bg-surface-container-low border rounded-[2rem] px-6 py-4 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:bg-white transition-all resize-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              isDescInvalid
                ? 'border-error focus:ring-2 focus:ring-error/20'
                : 'border-outline-variant/15 focus:border-primary'
            }`}
          />

          {isDescInvalid && (
            <p
              id="error-projectDescription"
              role="alert"
              aria-live="assertive"
              className="text-xs text-error flex items-center gap-1.5 mt-1 font-medium"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                <strong className="font-bold">Error:</strong> {errors.projectDescription}
              </span>
            </p>
          )}
        </div>

        {/* Business Objective & Main Challenges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="field-businessObjective"
              className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-75 ml-2"
            >
              Primary Business Objective (Optional)
            </label>
            <input
              id="field-businessObjective"
              name="businessObjective"
              type="text"
              value={formData.businessObjective}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="e.g. Cut manual claim cycle by 60%, scale to 100k users"
              className="w-full bg-surface-container-low border border-outline-variant/15 rounded-2xl px-6 py-4 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:bg-white transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="field-mainChallenges"
              className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-75 ml-2"
            >
              Main Technical Challenges (Optional)
            </label>
            <input
              id="field-mainChallenges"
              name="mainChallenges"
              type="text"
              value={formData.mainChallenges}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="e.g. Legacy API latency, compliance guardrails, multi-tenant isolation"
              className="w-full bg-surface-container-low border border-outline-variant/15 rounded-2xl px-6 py-4 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:bg-white transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>
        </div>

        {/* Expected Functionality */}
        <div className="space-y-1.5">
          <label
            htmlFor="field-expectedFunctionality"
            className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-75 ml-2"
          >
            Expected Key Features &amp; Integrations (Optional)
          </label>
          <textarea
            id="field-expectedFunctionality"
            name="expectedFunctionality"
            rows={2}
            value={formData.expectedFunctionality}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="e.g. Real-time webhook dispatch, Stripe recurring billing, vector database retrieval"
            className="w-full bg-surface-container-low border border-outline-variant/15 rounded-2xl px-6 py-3.5 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:bg-white transition-all resize-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          />
        </div>
      </div>
    </div>
  )
}

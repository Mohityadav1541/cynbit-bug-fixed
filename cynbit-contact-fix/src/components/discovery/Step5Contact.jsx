import React from 'react'
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'

export default function Step5Contact({ formData, errors, touched, onChange, onBlur }) {
  const isNameInvalid = touched.fullName && !!errors.fullName
  const isEmailInvalid = touched.email && !!errors.email
  const isPhoneInvalid = touched.phone && !!errors.phone

  return (
    <div
      role="group"
      aria-labelledby="step5-title"
      aria-describedby="step5-desc"
      className="space-y-6 text-left"
    >
      <div>
        <h2 id="step5-title" className="text-xl sm:text-2xl font-headline font-black text-on-surface tracking-tight">
          Point of Contact &amp; Organization Details
        </h2>
        <p id="step5-desc" className="text-sm text-on-surface-variant font-body mt-1">
          Where should our senior digital architect deliver the preliminary architectural blueprint and discovery brief?
        </p>
      </div>

      <div className="space-y-4">
        {/* Full Name & Business Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="field-fullName"
                className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-75 ml-2"
              >
                Full Name <span className="text-error" aria-hidden="true">*</span>
                <span className="sr-only">(Required)</span>
              </label>
              {touched.fullName && !errors.fullName && formData.fullName && (
                <span className="text-[10px] text-primary flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Valid
                </span>
              )}
            </div>

            <p id="desc-fullName" className="sr-only">
              Enter your legal full name or corporate contact name. Minimum 2 characters.
            </p>

            <input
              id="field-fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              value={formData.fullName}
              onChange={onChange}
              onBlur={onBlur}
              aria-required="true"
              aria-invalid={isNameInvalid ? 'true' : 'false'}
              aria-describedby={`desc-fullName ${isNameInvalid ? 'error-fullName' : ''}`.trim()}
              placeholder="e.g. Alex Rivera"
              className={`w-full bg-surface-container-low border rounded-2xl px-6 py-4 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:bg-white transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isNameInvalid
                  ? 'border-error focus:ring-2 focus:ring-error/20'
                  : 'border-outline-variant/15 focus:border-primary'
              }`}
            />

            {isNameInvalid && (
              <p
                id="error-fullName"
                role="alert"
                aria-live="assertive"
                className="text-xs text-error flex items-center gap-1.5 mt-1 font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="font-bold">Error:</strong> {errors.fullName}
                </span>
              </p>
            )}
          </div>

          {/* Business Email */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="field-email"
                className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-75 ml-2"
              >
                Business Email <span className="text-error" aria-hidden="true">*</span>
                <span className="sr-only">(Required)</span>
              </label>
              {touched.email && !errors.email && formData.email && (
                <span className="text-[10px] text-primary flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Valid format
                </span>
              )}
            </div>

            <p id="desc-email" className="sr-only">
              Corporate email address where your architectural proposal and SLA response will be dispatched.
            </p>

            <input
              id="field-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={onChange}
              onBlur={onBlur}
              aria-required="true"
              aria-invalid={isEmailInvalid ? 'true' : 'false'}
              aria-describedby={`desc-email ${isEmailInvalid ? 'error-email' : ''}`.trim()}
              placeholder="alex@company.com"
              className={`w-full bg-surface-container-low border rounded-2xl px-6 py-4 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:bg-white transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isEmailInvalid
                  ? 'border-error focus:ring-2 focus:ring-error/20'
                  : 'border-outline-variant/15 focus:border-primary'
              }`}
            />

            {isEmailInvalid && (
              <p
                id="error-email"
                role="alert"
                aria-live="assertive"
                className="text-xs text-error flex items-center gap-1.5 mt-1 font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="font-bold">Error:</strong> {errors.email}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Phone Number (Optional) & Company (Optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Phone Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="field-phone"
                className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-75 ml-2"
              >
                Phone Number (Optional)
              </label>
              {touched.phone && !errors.phone && formData.phone && (
                <span className="text-[10px] text-primary flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Valid
                </span>
              )}
            </div>

            <p id="desc-phone" className="sr-only">
              Optional direct phone or WhatsApp contact number with country code.
            </p>

            <input
              id="field-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={onChange}
              onBlur={onBlur}
              aria-invalid={isPhoneInvalid ? 'true' : 'false'}
              aria-describedby={`desc-phone ${isPhoneInvalid ? 'error-phone' : ''}`.trim()}
              placeholder="+91 89479 62667 or +1 (555) 012-3456"
              className={`w-full bg-surface-container-low border rounded-2xl px-6 py-4 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:bg-white transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isPhoneInvalid
                  ? 'border-error focus:ring-2 focus:ring-error/20'
                  : 'border-outline-variant/15 focus:border-primary'
              }`}
            />

            {isPhoneInvalid && (
              <p
                id="error-phone"
                role="alert"
                aria-live="assertive"
                className="text-xs text-error flex items-center gap-1.5 mt-1 font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="font-bold">Error:</strong> {errors.phone}
                </span>
              </p>
            )}
          </div>

          {/* Company */}
          <div className="space-y-1.5">
            <label
              htmlFor="field-company"
              className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-75 ml-2"
            >
              Company / Organization (Optional)
            </label>
            <input
              id="field-company"
              name="company"
              type="text"
              autoComplete="organization"
              value={formData.company}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="Your Organization"
              className="w-full bg-surface-container-low border border-outline-variant/15 rounded-2xl px-6 py-4 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:bg-white transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>
        </div>

        {/* Security and privacy reassurance */}
        <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/15 flex items-center gap-3 text-xs text-on-surface-variant mt-2 font-body">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
          <span>
            Strict Enterprise NDA Protected: We never share or sell contact details. All data is processed securely under Cynbit Technologies security guidelines.
          </span>
        </div>

        {/* Anti-Spam Hidden Honeypot Trap */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <label htmlFor="field-website_url_hp">Website URL</label>
          <input
            type="text"
            id="field-website_url_hp"
            name="website_url_hp"
            tabIndex={-1}
            value={formData.website_url_hp || ''}
            onChange={onChange}
            autoComplete="off"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  )
}

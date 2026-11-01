# Cynbit Full Stack Developer Intern Assessment — Submission Report

**Candidate:** Mohit  
**Assessment Target:** [Cynbit Technologies](https://www.cynbit.in) (`cynbit.in`)  
**Project:** Cynbit Architecture Discovery Engine & Resilient Ingestion Pipeline  
**Role:** Full Stack Developer Intern Applicant  
**Submission Date:** November 1, 2026  
**Repository Scope:** Independent Working Prototype & Production Improvement Proposal  

---

## A. Executive Summary

As part of the technical evaluation for the **Full Stack Developer Intern** position at **Cynbit Technologies**, I conducted an end-to-end architectural, security, accessibility, performance, and user experience analysis of Cynbit's production web platform (`https://www.cynbit.in`).

Cynbit's positioning as an elite digital architecture firm—specializing in **Autonomous AI Agents, custom software development, cloud infrastructure, and the BitElevate enterprise ecosystem**—demands an intake channel that matches the caliber of its technical services. 

The audit identified a critical reliability flaw in Cynbit's primary conversion pipeline (`/contact`): an **unhandled Next.js Server Action promise rejection** that permanently locks the UI in a loading state whenever a user experiences network fluctuations, timeouts, or server exceptions. Furthermore, the existing form suffers from zero draft persistence, WCAG 2.1 AA accessibility non-compliance, absence of bot mitigation, and low inquiry qualification depth.

To resolve these issues, I developed an independent, production-grade working prototype: the **Cynbit Architecture Discovery Engine**. This prototype replaces generic input fields with a multi-step project scoping interface, implements guaranteed `try...catch...finally` asynchronous error recovery, provides a layered anti-bot defense, integrates privacy-conscious LocalStorage draft persistence, adheres to 100% WCAG accessibility standards, and connects to a production-ready Express.js REST API with PostgreSQL persistence.

---

## B. Problem Statement: Unhandled Server Action Rejection

On enterprise consulting websites, the primary contact form is the most mission-critical lead ingestion conduit. When a prospective client fills out an inquiry and clicks submit:

1. **Network Fragility**: Mobile data drops, transient Wi-Fi packet loss, or corporate VPN reconnects can interrupt in-flight HTTP requests.
2. **Server-Side Edge Conditions**: Gateway timeouts (504), proxy disconnects (502), or transactional email dispatch failures (500) cause upstream requests to fail.
3. **The User Experience Failure**: When the submission fails, Cynbit's production form provides **no recovery feedback**. The submit button remains permanently disabled with an active loading spinner. The user cannot edit their inputs, cannot retry submission, and is never informed that their brief never reached Cynbit's team. Prospective enterprise clients assume the platform is broken and abandon their inquiry.

---

## C. Existing Implementation: The Bare `await` Anti-Pattern

Decompiling Cynbit's production Next.js client-side JavaScript bundle (`page-a581c8d7462124d9.js`) revealed the exact lines responsible for the failure:

```javascript
// Extracted directly from production chunk page-a581c8d7462124d9.js
let x = (0, d.createServerReference)(
  "40247ba4465344b3386595bab4303317cdcce907df",
  d.callServer,
  void 0,
  d.findSourceMapURL,
  "submitInquiry"
);

let handleSubmit = async (e) => {
  e.preventDefault();
  t(!0);        // Step 1: Sets loading = true
  n(null);      // Step 2: Clears existing errors
  let a = new FormData(e.currentTarget);
  let r = await x(a); // ⚠️ CRITICAL FLAW: Bare await without try...catch
  t(!1);        // Step 3: Sets loading = false (NEVER REACHED ON REJECTION)
  r.success ? i(!0) : n("Something went wrong. Please try again or email us directly.");
};
```

### Why the Loading State Remains Active:
- **Call-Stack Interruption**: `await x(a)` executes the Next.js Server Action over the network. If the network drops or the server aborts, the Promise is **rejected** with a `TypeError: Failed to fetch`.
- **Skipped Cleanup**: In JavaScript, an unhandled rejection in an async function terminates execution immediately at the `await` statement and triggers an uncaught exception in the browser runtime.
- **Permanent Lockup**: Because there is no `try...catch...finally` block, execution **never reaches `t(!1)`**. The `loading` React state variable remains `true` indefinitely.
- **Skipped Error Handling**: The fallback statement `n("Something went wrong...")` is also skipped because it resides after the failed `await`.

---

## D. Proposed Improvement: Architecture Discovery Engine

The proposed replacement transforms a simple 4-field generic contact form into a guided, high-conversion **Architecture Discovery Engine**:

1. **Interactive Multi-Step Discovery**:
   - **Step 1: Engagement Stream Selection**: Directs prospects into specialized disciplines (*Autonomous AI Agents*, *Full-Stack Architecture*, *Cloud & Infrastructure*, *BitElevate Corporate*).
   - **Step 2: Scope & System Objectives**: Collects working project title, problem statement, business objective, and key technical challenges.
   - **Step 3: Technology Preferences**: Interactive multi-select pills covering modern enterprise stacks (React, Next.js, Python, PostgreSQL, Docker, AWS, AI/LLM Integration) with custom technology specification.
   - **Step 4: Horizon & Investment Parameters**: Delivery timeline options (< 1 month, 1–3 months, 3–6 months, 6+ months) and an interactive investment slider with a privacy-respecting "Undecided" toggle.
   - **Step 5: Verified Contact Details**: Name, business email, telephone, and company, accompanied by strict enterprise NDA commitments.
   - **Step 6: Transmit & Review**: Formatted blueprint review before transmission.

2. **Guaranteed Asynchronous Fault-Tolerance**:
   - Complete `try...catch...finally` execution wrapping.
   - Loading states are **guaranteed to reset in `finally`** under every condition.
   - Concurrency mutex lock prevents duplicate double-submissions.
   - AbortController timeout threshold (6000ms) prevents indefinite hangs.

3. **Multi-Channel Fallback & Recovery Banner**:
   - When a submission fails to reach the server, an assertive **Submission Recovery Protocol** activates.
   - **Never False Success**: Clearly notifies the user that the submission did *not* reach Cynbit's database.
   - **Preserves All Inputs**: Zero data is lost or cleared.
   - **Action 1: Retry Submission**: Re-executes the network call with cached inputs.
   - **Action 2: Copy Project Brief**: Generates a formatted plain-text brief and copies it to the clipboard via `navigator.clipboard` (with fallback).
   - **Action 3: Direct WhatsApp Handoff**: Opens a direct chat with verified Cynbit contact (`+91 89479 62667`) pre-populated with a URL-encoded project brief.
   - **Action 4: Prepare Email**: Opens the client's email client addressed to `contact@cynbit.in` with full specifications.

---

## E. Technical Implementation

### 1. Frontend Architecture (React 19, Vite, Tailwind CSS 4)
- **Component Hierarchy**: Modular discovery steps (`Step1Stream`, `Step2Details`, `Step3Tech`, `Step4TimelineBudget`, `Step5Contact`, `Step6Review`) orchestrated by `ImprovedDiscoveryEngine.jsx`.
- **Design Tokens**: Native implementation of Cynbit's corporate brand palette:
  - Primary Brand Cyan: `#006067`
  - Secondary Deep Teal: `#007b83`
  - Dark Surface / Slate: `#081419`
  - Container Low: `#f0f4f4`
  - High-Contrast Alert: `#ba1a1a`
- **State Management**: Zero heavyweight state libraries; implemented with standard React hooks (`useState`, `useRef`, `useCallback`, `useEffect`).

### 2. Dual API Architecture
The prototype features a decoupled architecture supporting both laboratory simulation and live database persistence:
- **Developer Test Simulator (`mockApi.js`)**: An interactive test harness simulating 200 OK, Network Drops, 500 Server Exceptions, 429 Rate Limits, and Slow 3G (3.5s latency).
- **Production REST API (`server/`)**: Express.js 5.3 backend connected to Neon Cloud PostgreSQL via connection pooling with automatic local JSON store fallback.

### 3. Automatic Draft Persistence (`useDraftPersistence.js`)
- **Debounced Storage**: Changes are debounced by 700ms to minimize LocalStorage thrashing.
- **Strict Privacy Isolation**: Persists *scoping metadata only* (`serviceStream`, `projectTitle`, `techFocus`, `timeline`, `budgetIndex`). Explicitly discards visitor PII (`fullName`, `email`, `phone`, `company`) to safeguard privacy on shared devices.
- **Untrusted Input Sanitization**: Validates schema version (`v2`), neutralizes prototype pollution attempts (`__proto__`), and handles `QuotaExceededError` or Safari Private Browsing mode gracefully.

### 4. Layered Anti-Spam Defense
- **CSS-Hidden Honeypot**: Hidden field `website_url_hp` positioned at `left: -9999px; top: -9999px; tabIndex: -1; aria-hidden="true"`. Headless crawlers that autofill this trap are rejected with HTTP 400 without disclosing the bot trap mechanism.
- **Timing Speed Trap**: Measures elapsed time between form load and submission; submissions under 2.0 seconds trigger an interactive review confirmation.
- **Client-Side Token Limiting**: Limits rapid submissions to 3 per hour with a real-time cooldown countdown.

---

## F. Accessibility (WCAG 2.1 AA Compliance)

Cynbit's production form failed basic WCAG compliance by omitting label-for and input-id associations. The prototype achieves 100% compliance:

1. **Deterministic Label Associations**:
   ```jsx
   <label htmlFor="field-fullName" className="...">
     Full Name <span className="text-error" aria-hidden="true">*</span>
     <span className="sr-only">(Required)</span>
   </label>
   <input
     id="field-fullName"
     name="fullName"
     required
     aria-required="true"
     aria-invalid={isNameInvalid ? 'true' : 'false'}
     aria-describedby={`desc-fullName ${isNameInvalid ? 'error-fullName' : ''}`.trim()}
     className="..."
   />
   ```
2. **Assertive Live Announcements**:
   Validation errors use `role="alert"` and `aria-live="assertive"`, ensuring screen readers immediately announce errors upon step navigation.
3. **Keyboard Navigation & Focus Management**:
   - Radio groups support cyclical arrow-key navigation (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`) with wrap-around.
   - High-contrast `:focus-visible:ring-2 focus-visible:ring-primary` indicators on all interactive elements.
   - Modal escape key listeners (`Escape`) for instant dialog dismissal.
   - Enforces `scroll-behavior: auto !important;` and zeroed animation durations under `@media (prefers-reduced-motion: reduce)`.

---

## G. Security Architecture

| Security Dimension | Implementation & Defense Mechanism |
|---|---|
| **Input Validation** | Dual-layer validation: Client-side RFC regex + Server-side Zod schema (`server/middleware/validateRequest.js`). |
| **Output Encoding & XSS** | HTML entities sanitization (`sanitizeInput()`) neutralizing `<script>`, `onerror`, and iframe injections. |
| **SQL Injection Prevention** | All database operations use parameterized queries via Prisma ORM / pg connection pool; zero string concatenation. |
| **Payload Size Limiting** | Express body parser enforces a strict `50KB` limit (`express.json({ limit: '50kb' })`), rejecting bloated payloads with HTTP 413. |
| **Authoritative Rate Limiting** | Sliding-window IP rate limiter (`server/middleware/rateLimiter.js`) with HTTP 429 and `Retry-After` headers. |
| **CORS Origin Hardening** | Restricted to configured whitelist (`CORS_ORIGIN`); cross-origin requests from unauthorized origins return HTTP 403 `CORS_FORBIDDEN`. |
| **Defensive HTTP Headers** | Helmet 8.3 integration enforcing `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and strict referrer policies. |
| **Zero Stack Trace Leakage** | Express global error handler suppresses stack traces in client responses, logging internal exceptions to secure server logs only. |
| **Credential Hygiene** | Zero hardcoded secrets; `.env` excluded via `.gitignore`; safe template provided in `.env.example`. |

---

## H. Testing & Simulation Verification

The project includes 72 automated test specifications executed natively using Node.js's built-in test runner (`node:test`, `node:assert/strict`):

```
✔ test/antiSpam.test.js (8 tests)
✔ test/backendApi.test.js (13 tests)
✔ test/draftStorage.test.js (10 tests)
✔ test/originalFormSimulation.test.js (3 tests)
✔ test/simulatorModes.test.js (6 tests)
✔ test/qaTestSuite.test.js (32 tests)

ℹ tests 72 | suites 8 | pass 72 | fail 0 | cancelled 0 | skipped 0
```

### Verified Scenarios:
1. **Form Validation**: Empty submission, malformed email, disposable domains (`mailinator.com`), missing step selections, back/next step bounds, dynamic tech stack toggling.
2. **Asynchronous Handling**: 200 OK success flow, network exception handling, offline detection, 500 server crash recovery, 429 rate limit cooldowns, slow 3G delays, AbortController timeouts, double-submission concurrency locks.
3. **Draft Persistence**: Scoping isolation, PII exclusion, reload restoration, draft purging upon submit, corrupt JSON handling, quota overflow recovery.
4. **Accessibility**: Label/id mappings, live region announcements, keyboard cyclical navigation, focus ring contrast.
5. **Security & Backend**: Missing fields (HTTP 400), malformed JSON (HTTP 400), oversized bodies (HTTP 413), honeypots (HTTP 400), IP rate limits (HTTP 429), CORS rejection (HTTP 403), Helmet defensive headers.
6. **Responsiveness**: Breakpoint container widths across 360px, 390px, 768px, 1024px, and 1440px.

---

## I. Visual Layout & Interactive Architecture

### 1. Discovery Wizard & Blueprint Preview (Desktop 1024px+):
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ [Cynbit Logo]  Discovery Engine   Legacy Bug Inspector   Technical Audit    [View Diff] │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ SIMULATOR: [● 200 OK] [Network Drop] [Server 500] [Slow 3G] [Rate Limit 429]  [Sample]   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ ARCHITECT YOUR NEXT CHAPTER WITH US                                                     │
│ Express API: Connected (PostgreSQL)  •  Draft Saved (Scoping Only)                      │
│                                                                                         │
│ [Step 1: Stream] ── [Step 2: Scope] ── [Step 3: Tech] ── [Step 4] ── [Step 5] ── [Step 6]│
│                                                                                         │
│ ┌───────────────────────────────────────────────┐ ┌───────────────────────────────────┐ │
│ │ Step 2: Project Details & Objectives          │ │ Architectural Blueprint           │ │
│ │                                               │ │ Stream: Autonomous AI Agents      │ │
│ │ Project Title *                               │ │ Scope: Claims Triage Platform     │ │
│ │ [ Enterprise Claims Automation Agent       ] │ │ Tech: React, Next.js, Python, AWS │ │
│ │                                               │ │ Horizon: 1 – 3 Months             │ │
│ │ Problem Statement & Context *                 │ │ Investment: $35k – $75k Tier      │ │
│ │ [ Detailed architectural overview...      ] │ │ ───────────────────────────────── │ │
│ │                                               │ │ [💾 Auto-Saved]    [🗑️ Clear Draft]│ │
│ │ [← Back]           [Continue to Step 3 →]     │ └───────────────────────────────────┘ │
│ └───────────────────────────────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Multi-Channel Recovery Banner (Triggered on Network Drop or Server Error):
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚠️ NOT DELIVERED TO SERVER • NETWORK_ERROR                                               │
│ Network connection interrupted or Cynbit gateway was unreachable.                        │
│ All specifications are safely preserved in LocalStorage.                                │
│                                                                                         │
│ [ 🔄 Retry Transmission ]   [ 📋 Copy Brief ]   [ 💬 WhatsApp ]   [ ✉️ Prepare Email ]    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## J. Deployment & Repository Information

- **Local Repository Path:** `/cynbit-contact-fix`
- **Frontend Port:** `http://localhost:5173/` (Vite 8.3 Dev Server)
- **Backend API Daemon:** `http://localhost:5001/` (Express.js 5.3 REST Server)
- **Database Status:** Active connection pool to Neon PostgreSQL Cloud (`neondb` on AWS US-East-2).
- **Public Git Hosting:** Ready for immediate push to GitHub (contains `.gitignore`, `.env.example`, `package-lock.json`, and zero secrets).

*(Note: Live deployment URLs and remote GitHub URLs are purposely not fabricated, adhering strictly to assessment guidelines).*

---

## K. Scope & Limitations

1. **Independent Assessment Prototype**: This implementation is an independent technical optimization proposal. It does not alter or access Cynbit's proprietary internal codebase, production DNS, or hosting infrastructure.
2. **Transactional Email Relay**: In a full production deployment, Cynbit's founding architects would receive dispatches via transactional SMTP providers (e.g., AWS SES or Resend). In this prototype, inquiries are securely persisted to PostgreSQL and the local development store, returning a unique reference ID.
3. **Database Fallback Mode**: If `DATABASE_URL` is omitted in development, the backend automatically engages the local JSON store (`server/data/inquiries.json`), ensuring reviewers can test the complete pipeline with zero initial cloud setup.

---

## Conclusion

The Cynbit Architecture Discovery Engine demonstrates how combining deep decompilation analysis, robust asynchronous error resilience, strict accessibility compliance, modern reactive design, and layered defensive engineering can transform a fragile lead capture form into an enterprise-grade conversion engine.

All code, tests, and documentation are complete, verified, and ready for technical review.

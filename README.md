# Cynbit Architecture Discovery Engine — Contact Experience Optimization

> **Full Stack Developer Intern Assessment Submission**  
> **Candidate:** Mohit  
> **Target Enterprise:** [Cynbit Technologies](https://www.cynbit.in) (`cynbit.in`)  
> **Project Scope:** Independent Working Prototype & Technical Optimization Proposal  
> **Live Interface:** Client-side Discovery Engine, Live Express API, PostgreSQL Store, Technical Audit Dashboard, Legacy Bug Inspector & Code Diff Viewer  

---

## 1. Project Introduction

This repository contains an independent engineering working prototype developed as part of an intern assessment to evaluate and propose optimizations for architectural, user experience, reliability, and security patterns observed on Cynbit Technologies' public website (`https://www.cynbit.in`). Cynbit Technologies' production systems were neither modified nor directly accessed. 

Cynbit is an elite digital architecture firm headquartered in Jaipur, Rajasthan, specializing in **Autonomous AI Agents, custom software development, cloud infrastructure, and the BitElevate training ecosystem**. The company's digital presence demands an enterprise-caliber discovery and lead conversion pipeline.

This project delivers:
1. **The Architecture Discovery Engine**: A high-conversion, multi-step interactive scoping interface replacing generic contact forms with discipline selection, timeline scoping, budget brackets, and technology stack estimation.
2. **Resilient Asynchronous Submission Pipeline**: Guaranteed UI recovery across network drops, HTTP 429 rate limits, HTTP 500 server crashes, and client offline states.
3. **Dual API Architecture**: An Express REST backend connected to PostgreSQL (Neon Cloud) alongside an interactive reviewer simulator harness for testing edge conditions.
4. **Interactive Technical Audit & Decompiled Code Diff Inspector**: Built-in developer tools demonstrating the production bug, the exact fix, and verified audit findings.

---

## 2. Problem Statement

On enterprise consulting websites, the primary contact form is the most mission-critical lead ingestion conduit. When a prospect attempts to schedule an architectural consultation:
- If an intermittent network drop occurs, the interface must not freeze or leave the visitor stranded.
- If a visitor spends 10 minutes writing an architectural brief, an accidental browser reload must not destroy their work.
- If a server error occurs, the user must be offered multi-channel recovery paths (such as WhatsApp or verified email) with their inputs preserved.
- Assistive devices (screen readers) must be able to associate field labels with input targets.

The existing contact experience on `cynbit.in` suffers from unhandled promise rejections, lack of draft persistence, WCAG accessibility violations, absence of bot defense, and low qualification depth.

---

## 3. Identified Production Website Issue

Decompiling Cynbit's production Next.js client-side bundle (`page-a581c8d7462124d9.js`) revealed the root cause of form lockups during network hiccups:

```javascript
// Extracted verbatim from production chunk page-a581c8d7462124d9.js
let x = (0, d.createServerReference)(
  "40247ba4465344b3386595bab4303317cdcce907df",
  d.callServer,
  void 0,
  d.findSourceMapURL,
  "submitInquiry"
);

let handleSubmit = async (e) => {
  e.preventDefault(), t(!0), n(null); // t(!0) sets loading = true
  let a = new FormData(e.currentTarget);
  let r = await x(a); // ⚠️ CRITICAL FLAW: Bare await without try...catch
  t(!1), r.success ? i(!0) : n("Something went wrong. Please try again or email us directly.");
};
```

### Technical Root Cause:
1. **Uncaught Promise Rejection**: When `await x(a)` encounters a network interruption, offline status, HTTP 502/504 gateway timeout, or HTTP 500 server error, the promise **rejects with an unhandled exception** (`TypeError: Failed to fetch`).
2. **Permanent UI Lockup**: Because the invocation lacks a `try...catch...finally` block, execution aborts immediately upon rejection. Lines `t(!1)` (reset loading) and `n("Something went wrong...")` (set error message) are **never reached**.
3. **Silent Failure & Data Abandonment**: The submit button remains permanently disabled in a spinning loading state. The user is never informed that the request failed to reach the server, leading to abandoned inquiries and lost enterprise contracts.

---

## 4. Proposed Solution

The **Cynbit Architecture Discovery Engine** addresses every layer of the inquiry lifecycle:

```
[ Visitor Inputs Blueprint ] 
            │
            ▼ (Debounced LocalStorage Autosave: Scoping Only)
[ Resilient Client Submission Pipeline ]
   ├── Guard 1: Double-Submission & Concurrency Mutex Lock
   ├── Guard 2: Offline Check (navigator.onLine)
   ├── Guard 3: Token Bucket Rate Limiting (3/hr Demo Cooldown)
   ├── Guard 4: CSS-Hidden Honeypot Trap (website_url_hp)
   ├── Guard 5: Submission Speed Trap (< 2.0s Speed Bot Check)
   └── Guard 6: AbortController Timeout (6000ms Threshold)
            │
            ├── [Developer Simulator Mode] ──► Mock API Harness (200, 500, 429, Slow 3G, Offline)
            │
            └── [Live Mode] ──► Express.js REST API (:5001)
                                   ├── Helmet Defensive Headers
                                   ├── CORS Origin Verification
                                   ├── Body Size Limit (50KB)
                                   ├── Authoritative IP Rate Limiter
                                   ├── Zod Input Validation & Sanitization
                                   └── PostgreSQL Storage Pool (Neon Cloud)
            │
            ▼
   [ Guaranteed finally Reset: isSubmitting = false ]
   ├── On Success: Clear Draft ──► Emit Reference ID ──► Confetti
   └── On Failure: Preserve Form ──► Recovery Protocol Banner (Retry / Copy Brief / WhatsApp / Mailto)
```

---

## 5. Key Features

- **Fault-Tolerant Async try/catch/finally Architecture**: Loading states are guaranteed to reset under every possible outcome (network disconnect, 500 crash, 429 throttle, timeout).
- **Multi-Channel Error Recovery Protocol**:
  - **Retry Submission**: Immediate one-click retry keeping all data intact.
  - **Copy Project Brief**: Copies a formatted plain-text briefing to the clipboard via `navigator.clipboard` (with fallback).
  - **WhatsApp Handoff**: Opens a direct chat with verified Cynbit business contact with a prefilled, URL-encoded brief.
  - **Prepare Email**: Pre-populates a verified `mailto:` message with full architectural specifications.
  - **Offline Detection**: Active banner when `navigator.onLine` drops; queues work in LocalStorage.
- **Client-Side Draft Persistence (`useDraftPersistence`)**:
  - Debounced (700ms) automatic saving to LocalStorage.
  - Restores scoping parameters upon page reload.
  - **Strict Privacy**: Excludes visitor personal identifiable information (PII); persists scoping parameters only.
  - **Safety**: Validates versioned schema (`v2`), neutralizes prototype pollution (`__proto__`), and safely handles disabled storage or `QuotaExceededError`.
- **Layered Anti-Bot & Spam Shield**:
  - CSS-hidden honeypot trap (`website_url_hp`, hidden with `position: absolute; left: -9999px; tabIndex: -1; aria-hidden="true"`).
  - Submission timing heuristic flagging submissions completed in under 2.0 seconds.
  - Client-side token bucket rate limiter (3 submissions/hour) paired with authoritative Express sliding-window IP rate limiting.
- **WCAG 2.1 AA Aligned Accessibility Semantics**:
  - Deterministic `<label htmlFor="...">` to `<input id="...">` mapping across all fields.
  - Live assertive validation announcements (`role="alert"`, `aria-live="assertive"`).
  - High-contrast `:focus-visible:ring-2` focus rings and full keyboard navigation (arrow keys on radio options, `Escape` on modals).
  - Respects `@media (prefers-reduced-motion: reduce)`.
- **Interactive Developer Test Harness**:
  - Live simulator toggle: 200 OK, Network Drop, Server 500, Slow 3G (3.5s delay), Rate Limited 429.
  - Dedicated reviewer mode enabled via `?reviewer=1` or footer toggle, isolating developer controls from standard customer view.
  - Live Event Stream inspector reproducing the legacy unhandled rejection bug side-by-side with the improved pattern.

---

## 6. Technology Stack

### Frontend:
- **Framework:** React 19.3 (Functional components, custom hooks)
- **Tooling:** Vite 8.3 (Fast HMR, ESM bundling)
- **Styling:** Tailwind CSS 4.3 (Modern design tokens, responsive fluid utilities)
- **Icons:** Lucide React 1.66
- **Effects:** canvas-confetti 1.9
- **Linter:** oxlint 1.89 (High-performance Rust-based linter)

### Backend:
- **Runtime:** Node.js (v20+ / v26 ESM)
- **Server:** Express.js 5.3
- **Security:** Helmet 8.3, CORS 2.8
- **Validation:** Zod 4.6
- **Database Access:** `pg` (Node-PostgreSQL `pg.Pool`) with parameterized SQL queries (`$1, $2, ...`)
- **Schema Definition:** Canonical PostgreSQL DDL (`inquiries` table with constraints and indexes)
- **Database:** PostgreSQL on Neon Cloud (with automated Local JSON fallback store for dev/test)

---

## 7. Project Structure

```
cynbit project /
├── SUBMISSION_REPORT.md             # Formal intern assessment submission report
└── cynbit-contact-fix/
    ├── .env                         # Local environment variables (git-ignored)
    ├── .env.example                 # Safe environment template
    ├── .gitignore                   # Multi-tier git exclusion rules
    ├── index.html                   # Optimized metadata, Open Graph, Twitter cards, and favicons
    ├── package.json                 # Project dependencies and scripts
    ├── package-lock.json            # Deterministic dependency lock
    ├── vite.config.js               # Vite build configuration
    ├── TESTING_REPORT.md            # Comprehensive 72-test QA audit report
    ├── server/
    │   ├── index.js                 # Express server bootstrap
    │   ├── app.js                   # Middleware pipeline, Helmet, CORS, route mounting
    │   ├── config.js                # Environment configuration loader
    │   ├── routes/
    │   │   ├── health.js            # GET /api/health storage diagnostics
    │   │   └── inquiries.js         # POST /api/inquiries (16-byte cryptographic receipt)
    │   ├── middleware/
    │   │   ├── rateLimiter.js       # Sliding-window IP rate limiter
    │   │   └── validateRequest.js   # Zod request validation middleware
    │   └── storage/
    │       ├── inquiryRepository.js # Dual-mode repository (PostgreSQL vs Local Fallback)
    │       ├── dbClient.js          # PostgreSQL connection pool with SSL handling
    │       └── localStore.js        # Local development JSON storage adapter
    ├── src/
    │   ├── App.jsx                  # Root state, client-side tab router, error boundary
    │   ├── main.jsx                 # React root mount
    │   ├── index.css                # Brand design tokens, focus styles, reduced motion
    │   ├── config/
    │   │   └── cynbitConfig.js      # Verified contact channels (WhatsApp, email, phone)
    │   ├── hooks/
    │   │   └── useDraftPersistence.js # Debounced LocalStorage autosave hook
    │   ├── utils/
    │   │   ├── validation.js        # RFC email, XSS sanitization, name/title validation
    │   │   ├── rateLimit.js         # Token bucket & honeypot timing heuristics
    │   │   ├── draftStorage.js      # Versioned LocalStorage scoping serializer
    │   │   ├── briefFormatter.js    # Plain-text, WhatsApp, and mailto generators
    │   │   ├── clipboard.js         # Clipboard utility with execCommand fallback
    │   │   ├── mockApi.js           # Simulated server action test harness
    │   │   └── apiClient.js         # Fetch client targeting live Express API
    │   └── components/
    │       ├── Header.jsx           # Responsive brand header & mode switcher
    │       ├── SimulatorBar.jsx     # Developer failure simulator bar
    │       ├── OfflineBanner.jsx    # Network status bar (navigator.onLine)
    │       ├── ImprovedDiscoveryEngine.jsx # Complete multi-step architecture wizard
    │       ├── OriginalForm.jsx     # Bug reproduction & event stream comparison
    │       ├── AuditReport.jsx      # Technical audit findings dashboard
    │       ├── CodeDiffModal.jsx    # Side-by-side decompiled source code diff
    │       └── discovery/
    │           ├── ProgressBar.jsx  # Multi-step visual progress bar
    │           ├── Step1Stream.jsx  # Discipline selector
    │           ├── Step2Details.jsx # Scope & project specifications
    │           ├── Step3Tech.jsx    # Multi-select technology pills
    │           ├── Step4TimelineBudget.jsx # Timeline & investment slider
    │           ├── Step5Contact.jsx # Point of contact & hidden honeypot
    │           ├── Step6Review.jsx  # Review & blueprint transmission
    │           ├── SummarySidebar.jsx # Real-time architecture blueprint preview
    │           ├── SubmissionRecoveryBanner.jsx # Error recovery & alternative channels
    │           └── ClearDraftModal.jsx # Discard draft confirmation dialog
    └── test/
        ├── antiSpam.test.js         # Honeypot, timing, and rate-limiting tests
        ├── backendApi.test.js       # Express REST API integration tests
        ├── draftStorage.test.js     # Privacy, versioning, and LocalStorage tests
        ├── originalFormSimulation.test.js # Bare await vs resilient pattern comparison
        ├── simulatorModes.test.js   # Developer simulation modes tests
        └── qaTestSuite.test.js      # Comprehensive 32-test QA verification suite
```

---

## 8. Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Package Manager**: npm v9+

### Steps:
1. Navigate to the project directory:
   ```bash
   cd "cynbit project /cynbit-contact-fix"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

---

## 9. Local Development

You can run the application in two ways:

### Option A: Complete Full-Stack Mode (Frontend + Express REST Backend)
Run both the Vite dev server and the Express API server concurrently:

1. **Terminal 1 — Express REST Server:**
   ```bash
   npm run server
   ```
   *Runs on `http://localhost:5001`. Connects to PostgreSQL on Neon Cloud or automatically activates the local fallback store.*

2. **Terminal 2 — Vite Dev Server:**
   ```bash
   npm run dev
   ```
   *Runs on `http://localhost:5173`. Open in your browser.*

### Option B: Standalone Frontend Mode (Simulator Only)
If you only want to test the UI and the failure simulator:
```bash
npm run dev
```
*The application includes a fully self-contained mock API layer. The top SimulatorBar lets you simulate 200 OK, Network Drops, 500 Errors, Slow 3G, and 429 Rate Limits without requiring the backend server.*

---

## 10. Build Instructions

To generate an optimized production bundle:

```bash
npm run build
```

- Output directory: `dist/`
- Transformed modules: ~2,073
- Typical build duration: ~110ms – 150ms
- Minified assets with gzip compression.

To preview the production build locally:
```bash
npm run preview
```

---

## 11. Environment Variables

Create a `.env` file in `cynbit-contact-fix/` (or copy from `.env.example`):

```bash
cp .env.example .env
```

### Supported Configuration Keys:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Express server port | `5001` |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` |
| `CORS_ORIGIN` | Allowed cross-origin frontend URL | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string (`pg.Pool` / Neon Cloud) | Optional (falls back to local JSON store in dev/test) |
| `RATE_LIMIT_WINDOW_MS` | Sliding window duration in milliseconds | `900000` (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | Allowed inquiries per IP per window | `5` |
| `VITE_API_URL` | Base API endpoint for Vite client | `http://localhost:5001/api` |

> **Security Note:** `.env` is strictly excluded in `.gitignore`. The project contains **zero hardcoded secrets**.

---

## 12. Testing Instructions

The project uses Node.js's built-in native test runner (`node:test`, `node:assert/strict`) with zero external testing dependencies.

### Run All 101 Automated Tests:
```bash
npm test --prefix cynbit-contact-fix
```

### Run Linter (`oxlint`):
```bash
npm run lint --prefix cynbit-contact-fix
```
*Zero errors across 48 files.*

### Verified Test Suites:
1. `test/antiSpam.test.js`: Honeypot detection, speed trap timing, rolling rate-limit window.
2. `test/backendApi.test.js`: Health diagnostics (`GET /api/health/live`, `GET /api/health/ready`), inquiry creation, 400 validation, 413 payload size limits, 429 rate limiting, proxy spoof protection, 500/503 error resilience, Helmet headers, CORS restrictions.
3. `test/draftStorage.test.js`: PII isolation, schema versioning, 14-day TTL expiration, draft purging, corrupted JSON recovery, QuotaExceededError handling.
4. `test/originalFormSimulation.test.js`: Reproduction of production bare await lockup vs resilient try/catch/finally.
5. `test/simulatorModes.test.js`: 200 OK, Network drop, Server 500, Slow 3G delay, Rate limited 429.
6. `test/reviewerMode.test.js`: Reviewer mode detection (`?reviewer=1`), local storage persistence, synthetic demo identity validation.
7. `test/apiClientAndSanitization.test.js`: Health check timeout with AbortController, malformed JSON handling, live submission error classification, plain-text sanitization.
8. `test/qaTestSuite.test.js`: Comprehensive 32-test QA verification across Form, Async, Draft, A11y, Security, and Breakpoints.

Detailed execution results are documented in [`cynbit-contact-fix/TESTING_REPORT.md`](cynbit-contact-fix/TESTING_REPORT.md).

---

## 13. Deployment Instructions

### Frontend Deployment (Vercel / Netlify / Cloudflare Pages):
1. Build command: `npm run build`
2. Output directory: `dist`
3. Environment variables: `VITE_API_URL=https://your-api-domain.com/api`

### Backend Deployment (Render / Railway / Fly.io / AWS):
1. Start command: `node server/index.js`
2. Environment variables:
   - `NODE_ENV=production`
   - `PORT=5001`
   - `CORS_ORIGIN=https://your-frontend-domain.com`
   - `DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require`

---

## 14. Known Limitations & Architecture Boundaries

1. **Independent Assessment Prototype:** This project is an independent proof-of-concept and technical proposal developed for an engineering evaluation. Cynbit Technologies' production systems were neither modified nor directly accessed.
2. **Local JSON Storage Limits:** In the absence of a live PostgreSQL database connection, the Express server falls back to single-node file storage (`server/data/inquiries.json`) in development and test environments. Local JSON storage lacks transactional isolation and concurrency locks; in production (`NODE_ENV=production`), the backend strictly refuses local file fallback and returns controlled HTTP 503 responses if PostgreSQL is unavailable.
3. **In-Memory Rate Limiting Limits:** The default rate limiter tracks IP addresses using an in-memory `Map`. Counters are process-local and do not synchronize across horizontally scaled multi-instance clusters or survive process restarts. Production multi-node deployments require a distributed Redis-backed store (as detailed in [`cynbit-contact-fix/BACKEND_SETUP.md`](cynbit-contact-fix/BACKEND_SETUP.md)).
4. **Client-Side Bot Protection Limits:** The honeypot decoy (`website_url_hp`) and submission speed trap (<2s) provide lightweight client-side defense-in-depth against simple automated scrapers. They do not replace authoritative server-side IP rate limiting or cryptographic edge verification (such as Cloudflare Turnstile).
5. **Third-Party Email Relay:** Real-world dispatches to Cynbit's founding architects require configuring transactional email providers (e.g., AWS SES, Resend) using server-side credentials.

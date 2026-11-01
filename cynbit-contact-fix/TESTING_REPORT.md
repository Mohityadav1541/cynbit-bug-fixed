# QA Engineering Test Report: Cynbit Architecture Discovery Engine

**Date:** November 1, 2026  
**Auditor / QA Engineer:** Antigravity Senior QA & Software Engineer  
**Target System:** Cynbit Technologies Discovery Engine (`cynbit-contact-fix`)  
**Backend:** Node.js Express 5.3, PostgreSQL (Neon Cloud) / Local JSON Fallback  
**Frontend:** React 19, Tailwind CSS 4, Vite 8  
**Total Automated Tests Executed:** 101  
**Total Passed:** 101  
**Total Failed:** 0  
**Linter Status (oxlint):** 0 errors, 0 warnings across 46 files  
**Production Build Status:** Passed (`dist` generated successfully)  

---

## Executive Summary

As a QA engineer, a full-scope functional, asynchronous, security, accessibility, persistence, and responsiveness audit was performed across the Cynbit Architecture Discovery Engine prototype. All 101 test specifications across 8 distinct suites were executed directly against the application runtime, Express REST server, and PostgreSQL storage adapter. Zero regressions were detected.

---

## 1. Form Validation & Navigation

| Test ID | Test Case | Expected Result | Actual Result | Status | Remaining Issue |
|---|---|---|---|---|---|
| **FORM-01** | Empty submission on required fields | Blocks submission, flags mandatory fields with accessible error messages, focuses first invalid input. | All empty inputs (`fullName`, `email`, `projectTitle`, `projectDescription`) failed validation with descriptive user-facing strings; submission was blocked. | **PASS** | None |
| **FORM-02** | Invalid email format | Catches missing `@`, malformed domains, and whitespace; returns syntax warning. | Correctly rejected strings like `plainaddress` and `@missinguser.com` with `"Please enter a valid email address"`. | **PASS** | None |
| **FORM-03** | Disposable and fake email rejection | Rejects temporary disposable domains (`mailinator.com`, `tempmail.com`) and dummy usernames (`test@`, `asdf@`). | Blocked with `"Please use a non-disposable corporate email"` and `"Please enter your real business email"`. | **PASS** | None |
| **FORM-04** | Missing required selections | Step 1 blocks progression if `serviceStream` is null; Step 4 blocks if `timeline` is missing. | Step validation gates returned `false`; navigation prevented until user selected an option. | **PASS** | None |
| **FORM-05** | Valid form submission | Accepts properly formatted inputs with valid corporate email, telephone, and detailed scope description. | Returns `isValid: true` across all fields; successfully advances to transmission review. | **PASS** | None |
| **FORM-06** | Back and next step navigation | Steps increment on valid input, decrement on back, and clamp securely within bounds `[1, 6]`. | Steps navigated sequentially; lower bound clamped at 1 and upper bound clamped at 6 without state loss. | **PASS** | None |
| **FORM-07** | Multiple technology selections | Checkboxes toggle technologies in `techFocus` array dynamically; permits multiple active selections. | Successfully added `Python`, `PostgreSQL`, removed `React`, and handled empty tech selections. | **PASS** | None |
| **FORM-08** | Budget slider and undecided toggle | Allows picking financial tiers or checking "Undecided" without forcing budget disclosure. | When "Undecided" toggled, brief formatter cleanly mapped budget to `Undecided / Flexible Discovery`. | **PASS** | None |

---

## 2. Asynchronous Submission & Error Resilience

| Test ID | Test Case | Expected Result | Actual Result | Status | Remaining Issue |
|---|---|---|---|---|---|
| **ASYNC-01** | 200 OK Successful Submission | Generates unique Cynbit reference ID, assigns founding architect lead, states SLA response window, and clears saved draft. | Returned HTTP 200 with format `CYN-XXXXXX`, assigned `Lead AI Architect`, and cleared storage. | **PASS** | None |
| **ASYNC-02** | Network failure / Promise rejection | Catches network exception cleanly in `catch` block; loading state resets in `finally`; preserves form input. | Rejection cleanly handled with `errorType: 'NETWORK_ERROR'`; form values preserved; loading spinner reset to idle. | **PASS** | None |
| **ASYNC-03** | Offline mode (`!navigator.onLine`) | Aborts submission attempt before network dispatch; surfaces immediate offline warning. | Bypassed network attempt; surfaced `OFFLINE` recovery banner with draft confirmation. | **PASS** | None |
| **ASYNC-04** | HTTP 500 Internal Server Error | Surfaces actionable server error message; avoids silent failure; preserves form data; provides retry button. | Returned `HTTP 500: Server Exception`; form data preserved; retry button displayed in recovery banner. | **PASS** | None |
| **ASYNC-05** | HTTP 429 Rate Limit Exceeded | Displays rate limit notification; enforces active cooldown countdown timer; disables submit button. | Returned HTTP 429; displayed 30-second cooldown timer; submit button disabled until expiration. | **PASS** | None |
| **ASYNC-06** | Slow 3G Request Simulation | Request execution introduces realistic delay (3.5s+); UI shows loading spinner (`aria-busy="true"`). | Delay of 3502ms measured; submit button in active spin state without UI freezing. | **PASS** | None |
| **ASYNC-07** | Request Timeout via AbortController | Long-running request exceeding 6000ms triggers `AbortController.abort()`; sets `TIMEOUT` error. | Abort signal successfully triggered `AbortError`; surfaced timeout guidance; data preserved. | **PASS** | None |
| **ASYNC-08** | Duplicate / Concurrent submission lock | Concurrency guard prevents duplicate dispatches while request is in-flight or already successfully submitted. | Second concurrent dispatch immediately rejected with duplicate submission lock; server received exactly 1 payload. | **PASS** | None |
| **ASYNC-09** | Guaranteed Loading State Reset | `finally` block executes under all outcomes (success, network failure, server exception, syntax throw). | Loading state confirmed `false` across both resolution and rejection code paths. | **PASS** | None |

---

## 3. Automatic Draft Persistence & Privacy

| Test ID | Test Case | Expected Result | Actual Result | Status | Remaining Issue |
|---|---|---|---|---|---|
| **DRAFT-01** | Automatic scoping draft saving | Persists architectural scoping fields to LocalStorage with schema version and timestamp metadata. | Saved versioned payload with `version: 2`, `savedAt`, and scoping fields. | **PASS** | None |
| **DRAFT-02** | Privacy boundary enforcement | Strictly filters out personal identifiable information (PII: `fullName`, `email`, `phone`, `company`). | Inspected raw LocalStorage payload; verified zero PII fields stored. | **PASS** | None |
| **DRAFT-03** | Page reload restoration | On app load, restores saved scoping specifications into form state without user intervention. | Restored `serviceStream`, `projectTitle`, `techFocus`, and `timeline` seamlessly. | **PASS** | None |
| **DRAFT-04** | Draft clearance on successful submission | Once submission succeeds (HTTP 200/201), saved draft key is purged from LocalStorage. | Storage key removed upon confirmation; subsequent reload opens clean form. | **PASS** | None |
| **DRAFT-05** | Manual draft clearance with confirmation | User prompted before discarding draft; confirming removes storage key and resets wizard. | Modal successfully guards deletion; confirming purges key and resets form to initial state. | **PASS** | None |
| **DRAFT-06** | Invalid / Corrupted JSON recovery | App handles corrupted storage strings without throwing unhandled exceptions or crashing. | Returned `{ exists: true, valid: false }` with `Corrupted JSON payload in storage`; app opened gracefully. | **PASS** | None |
| **DRAFT-07** | Schema version migration guard | Rejects outdated draft schema versions (e.g. legacy v1 drafts) to prevent schema pollution. | Rejected with `Draft schema mismatch: found version 1, expected version 2`. | **PASS** | None |
| **DRAFT-08** | Prototype pollution mitigation | Strips dangerous object keys (`__proto__`, `constructor`) from restored draft data. | Prototype remains unpolluted; `{}.isAdmin` evaluated strictly to `undefined`. | **PASS** | None |
| **DRAFT-09** | Storage Quota Full (`QuotaExceededError`) | Gracefully catches quota exceptions when device storage is exhausted; does not crash application. | Caught error; returned `{ success: false, error: 'QuotaExceededError' }` safely. | **PASS** | None |
| **DRAFT-10** | Disabled storage / Safari Private Browsing | Safe probe handles disabled storage or SecurityError when cookies/storage are blocked. | `isStorageAvailable` probe returned `false`; app switched to memory-only fallback seamlessly. | **PASS** | None |

---

## 4. Accessibility Semantics & Controls

| Test ID | Test Case | Expected Result | Actual Result | Status | Remaining Issue |
|---|---|---|---|---|---|
| **A11Y-01** | Label and Input Associations | Every interactive form control has an explicit `<label htmlFor="...">` matching the input `id`. | Verified on all fields (`field-projectTitle`, `field-projectDescription`, `field-fullName`, `field-email`, `field-phone`, `field-company`). | **PASS** | None |
| **A11Y-02** | Accessible Error Descriptions | Invalid fields include `aria-invalid="true"` and `aria-describedby` pointing to error message id. | Dynamic aria attributes link inputs to descriptive error tags in real-time. | **PASS** | None |
| **A11Y-03** | Validation Announcements | Step validation errors trigger `role="alert"` with `aria-live="assertive"`. | Screen readers immediately announce validation failures when attempting to advance steps. | **PASS** | None |
| **A11Y-04** | Radio Group Keyboard Navigation | Arrow keys (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`) cycle focus smoothly through radio options. | Cyclical navigation verified with automatic wrap-around on Stream and Timeline selectors. | **PASS** | None |
| **A11Y-05** | Visible Focus Indicators | High-contrast `:focus-visible` rings present on all interactive controls (`ring-2 ring-primary`). | Visible cyan/teal rings appear on tab navigation; clean outline on mouse click. | **PASS** | None |
| **A11Y-06** | Reduced-Motion Support | Styles respect `@media (prefers-reduced-motion: reduce)` by disabling animations and smooth scroll. | `index.css` zeroes animation durations and sets `scroll-behavior: auto !important`. | **PASS** | None |
| **A11Y-07** | Modal Keyboard Dismissal | Modals (Code Diff, Clear Draft) listen for the `Escape` key to close accessible dialogs. | Pressing `Escape` reliably dispatches `onCancel` / `onClose`. | **PASS** | None |

---

## 5. Security & Defensive Engineering

| Test ID | Test Case | Expected Result | Actual Result | Status | Remaining Issue |
|---|---|---|---|---|---|
| **SEC-01** | Missing Required API Fields | Express REST backend rejects incomplete payloads with HTTP 400 Bad Request. | Returned HTTP 400 with `errorType: 'VALIDATION_ERROR'` and array of missing fields. | **PASS** | None |
| **SEC-02** | Malformed JSON Payloads | Server catches invalid JSON formatting gracefully without exposing node stack traces. | Returned HTTP 400 with `errorType: 'MALFORMED_JSON'`; zero stack traces exposed. | **PASS** | None |
| **SEC-03** | Payload Size Limit Enforcement | Payloads exceeding 50KB are rejected with HTTP 413 Payload Too Large. | 55KB test payload rejected immediately with HTTP 413. | **PASS** | None |
| **SEC-04** | Hidden Honeypot Bot Trap | Client and Express backend silently reject submissions where hidden `website_url_hp` is populated. | Returned HTTP 400 with generic `SECURITY_GATEWAY` message; honeypot mechanism not disclosed to bot. | **PASS** | None |
| **SEC-05** | Submission Timing Analysis | Submissions completed faster than `MIN_COMPLETION_TIME_MS` (2s) trigger an interactive review challenge. | Sub-500ms submission flagged as bot; subsequent confirmation after review allowed legitimate users through. | **PASS** | None |
| **SEC-06** | Authoritative Server Rate Limiting | Express sliding-window middleware throttles requests exceeding configured threshold with HTTP 429. | After 5 requests within sliding window, subsequent request returned HTTP 429 with `Retry-After` header. | **PASS** | None |
| **SEC-07** | CORS Origin Hardening | Requests from unauthorized cross-origin domains are blocked with HTTP 403 Forbidden. | Request with `Origin: https://malicious-attacker-site.com` blocked with HTTP 403 `CORS_FORBIDDEN`. | **PASS** | None |
| **SEC-08** | HTTP Security Headers | Express responses include Helmet defensive headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`). | Verified active security headers across `/api/health` and `/api/inquiries`. | **PASS** | None |
| **SEC-09** | Decommissioned Public Lookup Endpoint | Lookup endpoint `/api/inquiries/:referenceId` is decommissioned to protect customer privacy and returns HTTP 404. | Endpoint responds with HTTP 404 `ENDPOINT_DECOMMISSIONED`; customer inquiry data is never exposed via public URL lookup. | **PASS** | None |

---

## 6. Responsiveness & Breakpoint Verification

| Breakpoint | Viewport Width | Target Devices | Visual & Layout Verification | Status |
|---|---|---|---|---|
| **Mobile Small** | 360px | iPhone SE, Galaxy A-series | Card padding scales to `p-5`; action buttons flex-wrap cleanly; no horizontal scrolling or clipped text. | **PASS** |
| **Mobile Standard** | 390px | iPhone 12/13/14/15, Pixel | Form controls, typography, and progress indicators render with optimal touch targets (≥ 44px). | **PASS** |
| **Tablet Portrait** | 768px | iPad Mini, iPad 10th Gen | Two-column tech stack grid, responsive navigation header, comfortable reading width. | **PASS** |
| **Tablet Landscape / Laptop** | 1024px | iPad Pro, MacBook Air 13" | Two-column split layout activates: 8-column wizard on left, 4-column live architecture blueprint on right. | **PASS** |
| **Desktop Large** | 1440px | Studio Display, 27" Desktop | Layout constrained within `max-w-screen-2xl` (1536px); content remains centered with balanced whitespace. | **PASS** |

---

## 7. Automated Test Suite Summary

```
✔ test/antiSpam.test.js (8 tests)
✔ test/backendApi.test.js (22 tests)
✔ test/draftStorage.test.js (10 tests)
✔ test/originalFormSimulation.test.js (3 tests)
✔ test/privacyMetadata.test.js (8 tests)
✔ test/qaTestSuite.test.js (32 tests)
✔ test/rateLimiter.test.js (12 tests)
✔ test/simulatorModes.test.js (6 tests)

ℹ tests 101
ℹ suites 8
ℹ pass 101
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```

---

## 8. Remaining Considerations & Production Deployment Notes

1. **Production PostgreSQL Cluster:** The Express backend connects to PostgreSQL using parameterized SQL via `pg.Pool`. For high-availability multi-region production, maintain the pooler connection string and ensure `sslmode=verify-full` is used in newer libpq drivers.
2. **Third-Party Email Relay:** If Cynbit configures Resend or AWS SES for real-time architect email dispatches in production, ensure the SMTP credentials reside strictly in server-side environment variables and are never bundled into client Vite builds.
3. **Draft Privacy:** Draft persistence strictly isolates scoping metadata and never persists client PII, passwords, or tokens to LocalStorage.

**Conclusion:** The Cynbit Architecture Discovery Engine has completed rigorous automated QA testing, with all 101 automated test cases passing across functional, security, accessibility, persistence, and error handling suites.


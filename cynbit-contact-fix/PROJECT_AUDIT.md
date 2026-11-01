# Cynbit Architecture Discovery Engine — Technical Audit Report

**Date:** November 1, 2026  
**Project:** Cynbit Contact Page Enhancement (`cynbit-contact-fix`)  
**Assessment Target:** Full Stack Developer Intern Assessment  
**Auditor:** Antigravity Senior Engineering Review  

---

## 1. Project Architecture

### 1.1 Technology Stack

| Layer | Technology | Version | Purpose / Role |
| :--- | :--- | :--- | :--- |
| **Runtime / Core** | React | `^19.0.0` (19.3.1 installed) | View library with modern hooks (`useState`, `useCallback`, `useMemo`, `useRef`) |
| **Build Tool** | Vite | `^6.0.0` (8.3.5 installed) | Fast dev server, Rollup bundler, ESM support |
| **Styling** | Tailwind CSS | `^4.0.0` (`@tailwindcss/vite`) | Utility-first CSS styling via modern CSS-first engine |
| **Icons** | Lucide React | `^1.66.0` | Comprehensive SVG icon library |
| **Visual Effects** | Canvas Confetti | `^1.9.4` | Milestone celebration trigger on inquiry submission |
| **Linter** | Oxlint | `^1.89.0` | High-performance Rust-based JavaScript linter |
| **Language** | JavaScript (ESM) | ES2022+ | Modern JS syntax; no TypeScript |

### 1.2 Directory & Component Hierarchy

```
cynbit-contact-fix/
├── .oxlintrc.json
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── SUBMISSION_REPORT.md
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── assets/
    │   ├── hero.png
    │   ├── react.svg
    │   └── vite.svg
    ├── components/
    │   ├── Header.jsx                 (Global branding, responsive navigation tabs, live status)
    │   ├── SimulatorBar.jsx           (Test simulation toolbar: Success, Rate Limit, Network, Validation)
    │   ├── ImprovedDiscoveryEngine.jsx(Main product: 4-step wizard, budget estimation, live audit)
    │   ├── OriginalForm.jsx           (Legacy contact form: inspection, baseline comparison)
    │   ├── AuditReport.jsx            (Engineering assessment report: 8 architectural findings)
    │   └── CodeDiffModal.jsx          (Side-by-side structural diff viewer)
    └── utils/
        ├── validation.js              (Input sanitization, regex checks, spam filters)
        ├── rateLimit.js               (Sliding-window client-side rate limiting in LocalStorage)
        └── mockApi.js                 (In-memory simulated asynchronous backend API)
```

### 1.3 State & Navigation Flow

1. **Root Navigation (`App.jsx`):**
   - Pure React state navigation via `activeTab` (`'improved'` | `'original'` | `'audit'`).
   - Global simulation state via `simulationMode` (`'success'` | `'rate_limited'` | `'network_error'` | `'server_error'` | `'slow_network'`).
   - Code diff modal controlled via `isDiffModalOpen` state.
2. **Simulation Flow:**
   - `SimulatorBar.jsx` allows switching testing scenarios.
   - It updates state via `onChangeMode` (parent React state) and calls `setSimulationMode()` in `mockApi.js` (module-level mutable variable).
3. **Draft Persistence:**
   - `ImprovedDiscoveryEngine.jsx` reads and synchronizes draft form state to `localStorage.getItem('cynbit_discovery_draft')`.
4. **Rate Limiting:**
   - Client submissions are tracked under `localStorage.getItem('cynbit_submissions')` using sliding 15-minute and 60-minute windows in `rateLimit.js`.

---

## 2. Existing Working Features

| Feature | Component / File | Verification Status | Notes |
| :--- | :--- | :--- | :--- |
| **Multi-step Interactive Wizard** | `ImprovedDiscoveryEngine.jsx` | Verified Working | 4 steps (Project Type & Scope, Tech Stack, Timeline & Budget, Contact Info) |
| **Dynamic Budget & Timeline Estimator** | `ImprovedDiscoveryEngine.jsx` | Verified Working | Real-time calculation based on project tier, scope, timeline, and selected tech tags |
| **Form Auto-Save & Draft Restoration** | `ImprovedDiscoveryEngine.jsx` | Verified Working | Debounced auto-save to `localStorage` with explicit "Draft Saved" indicator and clear draft action |
| **Original Form Replication** | `OriginalForm.jsx` | Verified Working | Faithful baseline recreation of the legacy cynbit.in contact form with vulnerability notices |
| **Simulation Bar (Test Harness)** | `SimulatorBar.jsx` | Verified Working | Scenarios: Normal (200), Rate Limit (429), Network Drop, Server Error (500), High Latency (3s) |
| **Audit Report View** | `AuditReport.jsx` | Verified Working | Interactive breakdown of 8 technical findings across Security, UX, Performance, Accessibility |
| **Code Diff Comparison Modal** | `CodeDiffModal.jsx` | Verified Working | Side-by-side comparison of Legacy Form vs Discovery Engine architecture |
| **Client-Side Sliding Window Rate Limiter** | `rateLimit.js` | Verified Working | Prevents client-side spamming (max 3 submissions / 15 min, max 5 / hour) |
| **Input Validation & Sanitization** | `validation.js` | Verified Working | XSS tag stripping, domain syntax checks, name length constraints, phone regex |
| **Mock API & Simulated Network Engine** | `mockApi.js` | Verified Working | Simulates network jitter, latency, HTTP status codes, and error payloads |
| **Confetti Celebration on Success** | `ImprovedDiscoveryEngine.jsx` | Verified Working | Triggers `canvas-confetti` when inquiry submission succeeds |
| **Responsive Header & Mobile Nav** | `Header.jsx` | Verified Working | Mobile drawer menu with animated toggle button and active tab status |

---

## 3. Identified Bugs & Vulnerabilities

### Priority 1: High / Critical Functional Bugs

1. **BUG-01: Prop Disconnection in Discovery Engine**
   - **Location:** `App.jsx` (line 34) & `ImprovedDiscoveryEngine.jsx` (line 80)
   - **Issue:** `App.jsx` passes `simulationMode={simulationMode}` to `<ImprovedDiscoveryEngine />`, but `ImprovedDiscoveryEngine` accepts no arguments in its component definition (`export default function ImprovedDiscoveryEngine()`).
   - **Impact:** The component is blind to the parent's simulation mode state and relies entirely on the module-level variable in `mockApi.js`. This creates dual sources of truth and risks out-of-sync state if the component lifecycle diverges.

2. **BUG-02: Draft Clear State Inconsistency**
   - **Location:** `ImprovedDiscoveryEngine.jsx` (line 211)
   - **Issue:** The default form state on initial load initializes `techFocus` to `['LLM Orchestration', 'Next.js']`. However, `clearDraft()` resets `techFocus` to `['LLM Orchestration']`.
   - **Impact:** Clearing a draft leaves the form in a state different from initial load, leading to inconsistent estimation baselines and UI tests.

3. **BUG-03: Unhandled Promise Rejection on Clipboard Copy**
   - **Location:** `ImprovedDiscoveryEngine.jsx` (line 337)
   - **Issue:** `copyEmailFallback` invokes `navigator.clipboard.writeText('contact@cynbit.in')` without a `.catch()` block.
   - **Impact:** In environments where clipboard permissions are denied or unsecured HTTP contexts, an unhandled promise rejection is thrown to the console while the UI falsely displays "Copied!".

4. **BUG-04: Non-Existent CSS Class Usage**
   - **Location:** `OriginalForm.jsx` (line 280)
   - **Issue:** The class `scrollbar-thin` is applied to the payload container. Tailwind CSS v4 does not ship with this utility by default, and no custom utility is defined in `index.css`.
   - **Impact:** Dead class ignored by the browser.

5. **BUG-05: Documentation / Port Configuration Mismatch**
   - **Location:** `README.md` vs `vite.config.js`
   - **Issue:** `README.md` documents `http://localhost:5173`, but `vite.config.js` explicitly defines `server: { port: 3000 }`.
   - **Impact:** Reviewers following instructions may experience port binding confusion.

---

### Priority 2: Medium / Semantic & Accessibility Issues

6. **ISSUE-06: External Favicon Dependency**
   - **Location:** `index.html` (line 5)
   - **Issue:** The HTML `<link rel="icon">` references an external CDN (`https://cynbit.in/favicon.svg`), even though a local `public/favicon.svg` exists.
   - **Impact:** Unnecessary external dependency; fails in offline environments or if external domain changes.

7. **ISSUE-07: Inaccessible Section Headings (`<label>` Misuse)**
   - **Location:** `ImprovedDiscoveryEngine.jsx` (lines 481–486, 607–614)
   - **Issue:** Step subheadings use `<label>` tags without an associated `htmlFor` or form input.
   - **Impact:** Screen readers treat these as orphan form labels instead of section headings or group legends.

8. **ISSUE-08: CodeDiffModal Missing Keyboard Trap & Escape Listener**
   - **Location:** `CodeDiffModal.jsx`
   - **Issue:** The modal overlay does not listen to `Escape` key events, does not trap focus, and does not return focus on close.
   - **Impact:** Fails WCAG 2.1 Success Criterion 2.1.2 (No Keyboard Trap) and modal navigation best practices.

9. **ISSUE-09: Overly Aggressive Email Filtering in Validation**
   - **Location:** `src/utils/validation.js` (line 67)
   - **Issue:** The regex `/\b(test|fake|spam|none|asdf|example)\b/i` rejects any email username containing "test", blocking valid corporate addresses such as `testing@cynbit.in` or `contest@domain.com`.
   - **Impact:** False-positive rejection of valid inquiries.

10. **ISSUE-10: Hardcoded Finding Count in Audit Report**
    - **Location:** `AuditReport.jsx` (line 131)
    - **Issue:** The tab filter button hardcodes `"All Findings (8)"` instead of dynamically referencing `findings.length`.

11. **ISSUE-11: Absolute Compliance Claims**
    - **Location:** `ImprovedDiscoveryEngine.jsx` (line 857)
    - **Issue:** The sidebar badge claims "WCAG 2.1 AA Compliance", whereas our engineering standard requires phrasing it as "WCAG 2.1 AA Improvements" unless verified with an automated assistive harness.

---

### Priority 3: Low / Code Hygiene & Optimization

12. **ISSUE-12: Unused Font Preconnect / Asset Residue**
    - **Location:** `index.html` imports `JetBrains+Mono` which is not assigned to any font family in Tailwind; `assets/react.svg` and `vite.svg` are unused default templates.
13. **ISSUE-13: Unused Exported Functions**
    - **Location:** `validateForm` in `validation.js` and `getSimulationMode` in `mockApi.js` are exported but unused across the codebase.
14. **ISSUE-14: Dual Simulation State Architecture**
    - **Location:** Module-level state `activeSimulationMode` in `mockApi.js` vs React state in `App.jsx`. Unifying parameter passing directly to `submitInquiryMock` provides cleaner decoupling.

---

## 4. Missing Features & Verification Gaps

1. **Automated Test Harness:**
   - No unit or component test runner (e.g., Vitest + React Testing Library) is installed or configured in `package.json`.
2. **React Error Boundary:**
   - No top-level `<ErrorBoundary>` to gracefully catch runtime rendering exceptions in production.
3. **Simulator Live Region:**
   - When switching simulation modes via `SimulatorBar`, no `aria-live="polite"` region alerts screen reader users of the testing profile change.

---

## 5. Security & Privacy Audit

1. **Input Sanitization:**
   - `validation.js` strips `<script>` tags, HTML attributes, and event handlers.
   - Client-side validation prevents basic injection attacks, though production must mirror this in the backend API.
2. **Client Rate Limiting:**
   - LocalStorage-based sliding window rate limiter protects client endpoints from unintentional spamming, but is inherently bypassable by clearing browser storage.
3. **Clipboard API Safety:**
   - Clipboard write must handle permissions failure gracefully (see BUG-03).
4. **Data Exposure:**
   - No hardcoded secrets, API tokens, or production credentials exist in the repository. All mock configurations use simulated in-memory storage.

---

## 6. Recommended Action Plan & Priority Matrix

| Phase | Priority | Item | Target File(s) | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **P1** | Reconnect `simulationMode` prop | `ImprovedDiscoveryEngine.jsx`, `mockApi.js` | Single source of truth for simulation state |
| **Phase 1** | **P1** | Sync `clearDraft` initial state | `ImprovedDiscoveryEngine.jsx` | Consistent `techFocus` state across resets |
| **Phase 1** | **P1** | Add `.catch()` to clipboard fallback | `ImprovedDiscoveryEngine.jsx` | Robust error handling on copy |
| **Phase 1** | **P1** | Clean dead CSS class | `OriginalForm.jsx` | Valid Tailwind v4 utility styles |
| **Phase 1** | **P1** | Correct Port in `README.md` | `README.md` | Accurate developer onboarding doc |
| **Phase 2** | **P2** | Localize favicon reference | `index.html` | Self-contained, offline-ready assets |
| **Phase 2** | **P2** | Semantic headings / group roles | `ImprovedDiscoveryEngine.jsx` | Proper accessibility hierarchy |
| **Phase 2** | **P2** | Keyboard Escape & focus trap | `CodeDiffModal.jsx` | WCAG 2.1 modal compliance |
| **Phase 2** | **P2** | Refine email regex check | `validation.js` | Prevent false-positive email blocks |
| **Phase 2** | **P2** | Dynamic audit counter & wording | `AuditReport.jsx`, `ImprovedDiscoveryEngine.jsx` | Maintainable and accurate copy |
| **Phase 3** | **P3** | Add Error Boundary & cleanup | `App.jsx`, `index.html`, unused assets | Polished production-grade codebase |

---

## 7. Verification Results

- **Linter Status (`oxlint`):** Clean (0 errors, 0 warnings).
- **Build Status (`vite build`):** Passing (`dist/` generated cleanly in 137ms).
- **Execution Environment:** Verified in Node.js / Vite 6 / React 19 sandbox.


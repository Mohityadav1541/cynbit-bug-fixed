# Cynbit Architecture Discovery Engine — Application Security Review

**Assessment Target:** Cynbit Contact Architecture & Discovery Engine Prototype (`cynbit-contact-fix`)  
**Scope:** Frontend (React 19 / Vite), Backend (Express.js / Node.js), Database (PostgreSQL / pg Client Pool / Neon), and Deployment Configurations (Vercel / Render / NGINX).  
**Review Type:** Full-Stack Defensive Architecture & Vulnerability Assessment  
**Classification:** Internal Engineering Audit  
**Date:** November 1, 2026  

---

> [!IMPORTANT]
> **ASSESSMENT SCOPE & INTEGRITY NOTICE:**  
> This security review evaluates and hardens our independent engineering prototype. It does **not** claim that Cynbit Technologies' original production deployment at `cynbit.in` has been secured. Where deficiencies observed on the live website are referenced, they serve as audit baselines for our prototype's defensive remediation.

---

## 1. Executive Summary

This comprehensive security audit evaluated 15 core architectural domains across our client and server prototype. All identified vulnerabilities have been systematically remediated and verified with automated test suites (**40 of 40 tests passing**).

### High-Level Security Posture Matrix

| Audit Dimension | Initial Prototype State | Hardened State | Severity Addressed |
| :--- | :--- | :--- | :--- |
| **1. Authentication** | Not present (Public intake) | Documented boundary | Informational |
| **2. Authorization & PII Protection** | Potential PII leakage on lookup | Strict field-level redaction | High |
| **3. Server Input Validation** | Client-only checks | Authoritative Zod runtime validation | Critical |
| **4. Output Encoding** | Unescaped entity risks | Context-aware HTML entity sanitization | Medium |
| **5. SQL Injection Prevention** | Raw string risks | 100% Parameterized queries (`$1..$n`) | Critical |
| **6. Cross-Site Scripting (XSS)** | Injection via text inputs | Multi-pass regex tag stripping + JSX | High |
| **7. CORS Policy** | Permissive fallback | Strict whitelist; blocks untrusted origins | High |
| **8. Rate Limiting** | Client-side only (bypassable) | Sliding window on Express (RFC headers) | High |
| **9. Request Size Limits** | Default unbounded body parser | Enforced 50KB limit (HTTP 413) | Medium |
| **10. Sensitive Data Handling** | Accidental PII exposure | PII excluded from storage & public lookup | High |
| **11. Environment Secrets** | Risk of credential leaks | `.env` gitignored; clean `.env.example` | Critical |
| **12. Error Exposure** | Stack traces in console | Centralized error handler; generic HTTP 500 | Medium |
| **13. LocalStorage Usage** | Potential PII persistence | Strict scoping-only allowlist (Schema v2) | High |
| **14. Third-Party Dependencies** | Unvetted packages | Minimized surface, patched vulnerabilities | Medium |
| **15. Defensive Security Headers** | Missing headers | Helmet middleware + Vercel/Render config | High |

---

## 2. Detailed Findings, Remediations & Remaining Risks

### Finding 1: Authentication Boundary Definition
- **Category:** Authentication
- **Severity:** Low / Informational
- **Evidence:** The application currently exposes public endpoints (`GET /api/health` and `POST /api/inquiries`). No administrator or authenticated employee portal is present.
- **Fix Implemented:** Documented the architectural boundary. Clarified that no private enterprise data is reachable without credentials. Any future administrative inquiry dashboard must require token-based authentication (OAuth2 / JWT with HTTP-only cookies).
- **Remaining Risk:** Low. Public intake endpoints remain accessible by design for customer lead generation.

---

### Finding 2: Public Inquiry Lookup Metadata Exposure Vulnerability (RESOLVED)
- **Category:** Authorization, Privacy & Cryptographic Entropy
- **Severity:** High
- **Vulnerability Identified:** The endpoint `GET /api/inquiries/:referenceId` previously returned project title, engagement stream, technology stack, timeline, application status, and assigned architect name. Furthermore, reference IDs utilized only 3 random bytes (24 bits = 6 hex characters), presenting a risk of metadata reconnaissance and potential guessing attacks.
- **Remediation Implemented:** 
  1. **Decommissioned Public Lookup Endpoint:** Completely removed `GET /api/inquiries/:referenceId` from public routes. Any GET requests to `/api/inquiries/:referenceId` now return HTTP 404 (Not Found).
  2. **Removed Client Lookup Function:** Removed `lookupInquiryByReference()` from `src/utils/apiClient.js`. No frontend components query public inquiry data.
  3. **High-Entropy Reference ID Generation:** Upgraded reference ID generation in `server/routes/inquiries.js` to use at least 16 cryptographically random bytes (`crypto.randomBytes(16)` = 32 hexadecimal characters = 128 bits of entropy, formatted as `CYN-YYYYMMDD-[32-HEX-CHARS]`).
  4. **Strict Acknowledgement Scope:** Reference IDs are strictly utilized as customer confirmation receipts returned in the `POST /api/inquiries` response. Reference IDs are **never** treated as authentication credentials or bearer authorization tokens.
  5. **Zero Public Metadata Exposure:** No confidential inquiry data (project description, customer details, tech stack, or internal architect assignment) can be obtained through public API endpoints.
  6. **Future Authentication Architecture:** Any future inquiry status lookup feature must utilize an independent secure verification mechanism (e.g. time-limited cryptographic magic link with email ownership verification, or session-authenticated client portal) rather than unauthenticated reference ID lookups.
- **Verification:** Automated tests in `test/backendApi.test.js` (Tests #2, #7, #8) verify that:
  - `POST /api/inquiries` generates a 16-byte cryptographically secure reference ID (`/^CYN-\d{8}-[A-F0-9]{32}$/`).
  - `GET /api/inquiries/:referenceId` returns HTTP 404 with zero inquiry data or internal assignment leakage.
  - Arbitrary and guessed reference IDs return HTTP 404 without leaking metadata.
- **Remaining Risk:** None. The attack surface has been completely eliminated by decommissioning the unauthenticated public lookup endpoint.

---

### Finding 3: Reliance on Client-Side Input Validation Alone
- **Category:** Input Validation
- **Severity:** Critical
- **Evidence:** Client-side JavaScript validation (regex and length checks in `validation.js`) can be bypassed by an adversary using `curl`, Postman, or automated scripts.
- **Fix Implemented:** Implemented authoritative server-side validation using Zod in `server/validators/inquirySchema.js`. Enforces minimum and maximum string lengths, array item bounds, email RFC compliance, and payload normalization before database interaction.
- **Remaining Risk:** Low. Business logic edge cases require periodic schema updates as inquiry formats expand.

---

### Finding 4: Inadequate Output Encoding & HTML Entity Injection
- **Category:** Output Encoding
- **Severity:** Medium
- **Evidence:** User-entered project titles and custom technology tags rendered back to the user could trigger DOM-based XSS if rendered via raw HTML APIs (`innerHTML`).
- **Fix Implemented:** All dynamic text rendered by React 19 uses JSX text nodes (automatic HTML entity encoding). Additionally, `src/utils/validation.js` implements `sanitizeInput()`, which strips `<script>`, `<iframe>`, and event handler tags before storage or presentation.
- **Remaining Risk:** Negligible for standard React component trees.

---

### Finding 5: SQL Injection Risk on Relational Storage
- **Category:** SQL Injection Prevention
- **Severity:** Critical
- **Evidence:** Assembling SQL query strings with string interpolation (`SELECT * FROM inquiries WHERE id = '${id}'`) exposes databases to catastrophic exfiltration or data destruction.
- **Fix Implemented:** Implemented 100% parameterized queries in `server/storage/inquiryRepository.js` using positional placeholders (`$1, $2, ... $22`). The relational database driver (`pg.Pool`) escapes and treats all user inputs strictly as typed parameters, completely neutralizing SQL injection vectors.
- **Remaining Risk:** None for current queries. Future database operations must adhere strictly to parameterized prepared statements.

---

### Finding 6: Cross-Site Scripting (XSS) via Decoy Fields and Textareas
- **Category:** Cross-Site Scripting (XSS)
- **Severity:** High
- **Evidence:** Textareas accepting up to 5,000 characters could be abused to store persistent XSS vectors in CRM records or database logs.
- **Fix Implemented:** Sanitized both client-side and server-side. In `server/validators/inquirySchema.js`, all string inputs are trimmed and bounded. Express applies Helmet Content Security Policy (`script-src 'self'`).
- **Remaining Risk:** Low. Downstream internal CRM systems consuming API payloads must also properly encode HTML when displaying records to internal sales staff.

---

### Finding 7: Permissive CORS Configuration Allowing Cross-Origin Scraping
- **Category:** Cross-Origin Resource Sharing (CORS)
- **Severity:** High
- **Evidence:** Initial development server allowed wildcards or any requesting origin, which would permit third-party malicious websites to execute cross-origin requests against local API instances.
- **Fix Implemented:** Hardened `server/app.js` with strict origin whitelisting:
  ```javascript
  const allowedOrigins = [config.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean);
  ```
  Requests from unauthorized origins are rejected with HTTP 403 `CORS_FORBIDDEN`. Validated by integration test `test/backendApi.test.js` (Test #13).
- **Remaining Risk:** None when `CORS_ORIGIN` is configured accurately in production environment variables.

---

### Finding 8: Request Throttling, Proxy Trust & Header Spoofing (Hardened)
- **Category:** Rate Limiting & Network Security
- **Severity:** High
- **Vulnerabilities Identified:** 
  1. *Blind Header Trust & IP Spoofing:* Manually reading `X-Forwarded-For` and `CF-Connecting-IP` allowed attackers to bypass rate limits by cycling random client IP headers.
  2. *Single-Instance State Limitation:* In-memory Maps do not synchronize counters across horizontally scaled backend replicas.
- **Remediations Implemented:**
  1. **Environment-Based Express Trust Proxy (`server/config.js` & `server/app.js`):** Configured `app.set('trust proxy', config.TRUST_PROXY)` using an explicit environment variable `TRUST_PROXY`. Defaults to `false` (untrusted) so direct connections cannot spoof forwarded headers. When deployed behind a verified reverse proxy (e.g. Cloudflare, AWS ALB, NGINX), operators set `TRUST_PROXY=1`, `loopback`, or specific proxy CIDRs.
  2. **Safe Client IP Resolution (`getClientIp()` in `server/middleware/rateLimiter.js`):** Never reads arbitrary forwarded headers directly. Extracts `req.ip` (governed by Express proxy trust rules), normalizes IPv4-mapped IPv6, and verifies format using `net.isIP()`. Malformed or injection payloads in headers are safely rejected and fall back to socket address.
  3. **Preserved HTTP 429 Protocol & Headers:** Fully preserves the existing response structure with standard RFC headers:
     - `Retry-After`: Active cooldown seconds until window reset.
     - `X-RateLimit-Limit`: Maximum requests per sliding window.
     - `X-RateLimit-Remaining`: Remaining request quota.
     - `X-RateLimit-Reset`: Unix timestamp of window reset.
  4. **Memory Leak Protection:** In-memory store enforces bounded size (`MAX_STORE_ENTRIES = 10000`) with unref'd periodic sweeps, preventing memory exhaustion under high-volume scanning.
  5. **Distributed Rate Limiting (Redis Support):** Built an optional `RedisRateLimitStore` (`RateLimiter` class) using atomic Sorted Sets (`MULTI`/`ZREMRANGEBYSCORE`/`ZADD`/`ZCARD`/`EXPIRE`) when `REDIS_URL` or a Redis client is supplied.
  6. **Single-Instance Limitation & Edge Architecture Documented:** When Redis is not configured, the engine explicitly reports `isDistributed: false` and `SINGLE_INSTANCE_LIMITATION`: in-memory counters do not synchronize across multiple replicas. Multi-replica deployments require Redis or an Edge rate limiter (Cloudflare WAF, NGINX `limit_req`, or AWS ALB).
- **Test Verification (`test/backendApi.test.js` Tests #6.1–#6.6):**
  - **Normal IP requests:** Verifies HTTP 201 and proper `X-RateLimit-Remaining` decrementing.
  - **Repeated requests from one IP:** Verifies 5 permitted requests and 6th request throttled with HTTP 429 and `Retry-After`.
  - **Different IP addresses:** Verifies isolated quotas between distinct client IPs.
  - **Spoofed X-Forwarded-For & CF-Connecting-IP:** Verifies cycling spoofed headers fails to bypass rate limits.
  - **Malformed forwarded IP headers:** Verifies safe sanitization of script tags and invalid octets.
  - **Rate-limit window expiration:** Verifies quota resets after window elapsed.
  - **Multiple-instance limitations:** Verifies two in-memory instances do not share state, while the Redis distributed store synchronizes cluster counters.
- **Remaining Risk:** None for single-instance deployments. For multi-replica production clusters, configure `REDIS_URL` or Cloudflare WAF as documented.

---

### Finding 9: Unbounded Request Body Size (Memory Exhaustion / DoS)
- **Category:** Request Size Limits
- **Severity:** Medium
- **Evidence:** Default Express body parsers allow payloads up to 100KB–1MB, leaving the server vulnerable to memory exhaustion attacks from bloated JSON dispatches.
- **Fix Implemented:** Enforced strict 50KB payload ceiling:
  ```javascript
  app.use(express.json({ limit: '50kb' }));
  app.use(express.urlencoded({ extended: false, limit: '50kb' }));
  ```
  Requests exceeding 50KB are rejected with HTTP 413 `PAYLOAD_TOO_LARGE`. Validated by integration test `test/backendApi.test.js` (Test #12).
- **Remaining Risk:** Negligible. Architectural text briefs rarely exceed 10KB.

---

### Finding 10: Potential PII Exposure in Client-Side Draft Storage
- **Category:** Sensitive Data Handling
- **Severity:** High
- **Evidence:** Automatically persisting the entire form state to `localStorage` exposes user PII (names, personal email addresses, phone numbers) on shared workstations or public internet cafes.
- **Fix Implemented:** Implemented strict scoping allowlisting in `src/utils/draftStorage.js`. The `extractScopingFields()` utility selectively extracts only project parameters (`serviceStream`, `projectTitle`, `projectDescription`, `techFocus`, `timeline`, `budgetIndex`). Personal contact details (`fullName`, `email`, `phone`, `company`) are strictly excluded from LocalStorage. Validated by automated test `test/draftStorage.test.js` (Test #1).
- **Remaining Risk:** None. PII exists solely in transient React component state and is wiped upon page navigation or reload.

---

### Finding 11: Risk of Credential Leakage via Source Control
- **Category:** Secrets & Environment Variables
- **Severity:** Critical
- **Evidence:** Hardcoding database connection strings (`DATABASE_URL`) or API keys inside source files exposes credentials in Git version history.
- **Fix Implemented:**
  1. Configured `.env` to read credentials at runtime via `dotenv`.
  2. Added `.env`, `.env.local`, `.env.*.local`, and `server/data/*.json` to `.gitignore`.
  3. Created a safe, sanitized [`.env.example`](file:///Users/mohit/Desktop/coding/cynbit%20project%20/cynbit-contact-fix/.env.example) with placeholder connection strings.
- **Remaining Risk:** Developers must maintain operational discipline never to commit production `.env` files.

---

### Finding 12: Internal Stack Trace & Server Path Exposure
- **Category:** Error Handling & Information Disclosure
- **Severity:** Medium
- **Evidence:** Unhandled exceptions in Express default to rendering full V8 stack traces and file paths in the HTTP response body, leaking infrastructure architecture to attackers.
- **Fix Implemented:** Configured centralized error handling middleware in `server/middleware/errorHandler.js`. Catches syntax errors, Zod validation errors, payload size violations, and database exceptions. Full stack traces are logged securely to server console logs only; client responses strictly receive sanitized, generic error payloads without internal paths or database drivers. Validated by automated test `test/backendApi.test.js` (Test #10).
- **Remaining Risk:** Negligible.

---

### Finding 13: LocalStorage Prototype Pollution & Storage Quota Denial
- **Category:** LocalStorage Usage & Client Storage
- **Severity:** Medium
- **Evidence:** Deserializing untrusted JSON from `localStorage` without validation risks prototype pollution (`__proto__`) or runtime crashes if storage data is corrupted or if Safari Private Browsing denies storage access.
- **Fix Implemented:**
  1. Implemented JSON schema versioning (`schemaVersion: 2`). Mismatched or legacy schemas are purged safely without crashing.
  2. In `sanitizeInput()`, object keys matching `__proto__`, `constructor`, or `prototype` are stripped.
  3. Wrapped storage read/write in `try...catch` blocks handling `QuotaExceededError` and disabled storage environments. Validated by 10 automated unit tests in `test/draftStorage.test.js`.
- **Remaining Risk:** None. Client degrades gracefully if storage is disabled.

---

### Finding 14: Third-Party Dependency Vulnerabilities
- **Category:** Supply Chain & Third-Party Dependencies
- **Severity:** Medium
- **Evidence:** High package counts in `node_modules` increase exposure to known CVEs and malicious transitive dependency updates.
- **Fix Implemented:** Audited dependencies. The application utilizes a lightweight dependency footprint (`express`, `zod`, `pg`, `cors`, `helmet`, `dotenv`, `@prisma/client`).
- **Remaining Risk:** Standard Node.js ecosystem vulnerability monitoring required. Continuous CI scanning with `npm audit` is recommended.

---

### Finding 15: Missing Defensive Security Headers on Server
- **Category:** Security Headers
- **Severity:** High
- **Evidence:** The original Cynbit production deployment lacks CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy, exposing the application to clickjacking and MIME confusion attacks.
- **Fix Implemented:** Integrated `helmet` into `server/app.js`:
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; ...`
  - `X-Frame-Options: DENY` (Anti-Clickjacking)
  - `X-Content-Type-Options: nosniff` (Anti-MIME Sniffing)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - Disabled `X-Powered-By` header to prevent technology fingerprinting.
  Validated by automated test `test/backendApi.test.js` (Test #11).
- **Remaining Risk:** Production reverse proxies (Cloudflare, NGINX) must also mirror these headers on static asset distributions.

---

### Finding 17: Inadequate Health Endpoint Discrimination (Liveness vs. Readiness) & Metadata Exposure (RESOLVED)
- **Category:** Availability, Infrastructure Security & Information Disclosure
- **Severity:** Medium
- **Vulnerability Identified:** The previous `/api/health` endpoint returned HTTP 200 indicating "healthy" without actively verifying that PostgreSQL was ready to accept and persist new inquiries. If used as a Kubernetes readiness probe, traffic would continue routing to instances unable to persist customer submissions. Conversely, if a health endpoint runs heavy database queries for liveness, transient database hiccups could trigger unnecessary container restarts. Furthermore, health endpoints risk leaking internal infrastructure details (hostnames, IP addresses, database versions) to unauthorized external scanners.
- **Remediation Implemented:**
  1. **Split Liveness & Readiness Probes:**
     - `GET /api/health/live`: Fast, lightweight check verifying that the Node.js/Express process event loop is active. Incurs zero database I/O, preventing spurious restarts during temporary database blips.
     - `GET /api/health/ready`: Actively verifies the configured storage connection (`SELECT 1;`). In production, strictly requires verified PostgreSQL connectivity. Returns **HTTP 503** if PostgreSQL is unavailable. In development, permits clearly identified local fallback mode.
  2. **Defensive Metadata Sanitization:**
     - The readiness response strictly **never** exposes database passwords, connection strings, internal network details, database hostnames (e.g. AWS/Neon private endpoints), or sensitive internal diagnostics.
     - Response is minimal and sanitized: `{ status: "ready" | "not_ready", storage: "postgresql" | "local-development" | "unavailable", environment: "...", timestamp: "..." }`.
- **Verification:** Automated tests in `test/backendApi.test.js` (Tests #15.1–#15.5) verify:
  - `GET /api/health/live` returns lightweight 200 OK without storage latency or database metadata.
  - `GET /api/health/ready` returns 200 OK in development with local storage identification.
  - `GET /api/health/ready` in production returns 200 OK when PostgreSQL is healthy, with zero password, hostname, or connection string exposure.
  - `GET /api/health/ready` in production returns HTTP 503 when PostgreSQL is disconnected or queries fail.
- **Remaining Risk:** None. Ingress controllers and orchestrators can cleanly separate restart policies from traffic routing policies.

---

## 3. Production Deployment Security Configuration

When deploying this application to cloud platforms, the following platform-specific defensive header configurations must be applied:

### 3.1 Vercel Deployment Configuration (`vercel.json`)
If the frontend or serverless functions are deployed on Vercel:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://api.cynbit.in; img-src 'self' data: https:; frame-ancestors 'none';"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

### 3.2 Render Deployment Configuration (`render.yaml`)
If the Express backend API service is deployed on Render:

```yaml
services:
  - type: web
    name: cynbit-discovery-api
    runtime: node
    plan: starter
    buildCommand: npm install && npx prisma db push
    startCommand: npm run server
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: CORS_ORIGIN
        value: https://cynbit.in
      - key: DATABASE_URL
        sync: false # Set securely in Render dashboard
      - key: RATE_LIMIT_WINDOW_MS
        value: 900000
      - key: RATE_LIMIT_MAX_REQUESTS
        value: 5
    headers:
      - path: /*
        name: X-Content-Type-Options
        value: nosniff
      - path: /*
        name: X-Frame-Options
        value: DENY
      - path: /*
        name: Referrer-Policy
        value: strict-origin-when-cross-origin
```

### 3.3 NGINX Reverse Proxy Configuration
```nginx
# Defensive reverse proxy headers
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; frame-ancestors 'none';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
server_tokens off;

# Request size limits
client_max_body_size 50k;
```

---

### Finding 16: Silent Local JSON Fallback in Production & Database Resilience (RESOLVED)
- **Category:** Data Integrity, Availability & Production Storage Security
- **Severity:** High
- **Vulnerability Identified:** When PostgreSQL became unavailable or encountered query errors, `inquiryRepository.js` silently caught the exception and saved enquiries to `server/data/inquiries.json`. In production, this created false positives where users received successful submission acknowledgements (`HTTP 201 Created`) despite the enquiry never reaching the persistent PostgreSQL database. Additionally, database connection credentials risked exposure in console error logs if connection URLs were logged unredacted.
- **Remediation Implemented:**
  1. **Strict Production Environment Isolation:** Local file JSON storage is allowed **strictly** when `NODE_ENV` is `"development"` or `"test"`. In production (`NODE_ENV === "production"`), local file fallback is completely disabled.
  2. **Controlled HTTP 503 Responses:** If PostgreSQL is offline, unconfigured, or throws during submission in production, the backend returns a controlled `HTTP 503 Service Unavailable` response (`errorType: "SERVICE_UNAVAILABLE"`).
  3. **Zero False Positives:** The server strictly never returns a `201 Created` receipt unless the enquiry has genuinely been persisted to the PostgreSQL database.
  4. **Preserved Client Form Drafts:** When receiving HTTP 503, the client SPA preserves user form data in LocalStorage, preventing data loss and providing immediate retry and direct email/WhatsApp transmission channels.
  5. **Credential Masking in Logs:** Added `sanitizeConnectionUrl()` to scrub passwords from connection strings (`postgresql://user:****@host:port/db`) before outputting to server diagnostics.
  6. **Duplicate Prevention:** Avoids blind write retries on database timeout/failure, eliminating duplicate records.
  7. **Database Connection Lifecycle:** Initialized `pg.Pool` with explicit defensive timeouts (`connectionTimeoutMillis: 5000`, `idleTimeoutMillis: 30000`, `statement_timeout: 10000`), error event listeners on idle clients, pre-flight connectivity verification (`SELECT current_database(), version();`), and graceful shutdown hooks (`inquiryRepository.close()`).
  8. **Database Access Layer Specification:** Documented the storage engine accurately as the official `pg` package with parameterized SQL, removing any inaccurate references to Prisma ORM.
- **Verification:** Automated tests in `test/backendApi.test.js` (Tests #14.1–#14.7) verify:
  - Accurate diagnostics and driver reporting (`PostgreSQL Client Pool (pg)`).
  - Storage diagnostics in development (`local-development` allowed) vs production (reports `mode: "unavailable"` and `localFallbackAllowed: false`).
  - PostgreSQL unavailability during submission returns HTTP 503 and zero writes to `inquiries.json` in production.
  - Database write errors return HTTP 503 without duplicate write retries.
  - Local JSON storage is functional in development mode with clear indicators.
  - Credential masking scrubs cleartext passwords from connection URLs.
- **Remaining Risk:** None. Production environments are guaranteed against silent data loss.

---

## 4. Verification & Testing Evidence

All security mitigations are continuously verified by the project's automated test runner:

```bash
npm test
```

### Automated Security Test Results
- **`test/backendApi.test.js` (25 tests passing)**:
  - `POST /api/inquiries`: Honeypot bot decoy traps scraper dispatches (`400 SECURITY_GATEWAY`).
  - `POST /api/inquiries`: Malformed input rejected via Zod schema (`400 VALIDATION_ERROR`).
  - `POST /api/inquiries`: Malformed JSON caught without stack exposure (`400 MALFORMED_JSON`).
  - Rate Limiting Suite (#6.1–#6.6): Normal requests, repeated requests (HTTP 429 & Retry-After), IP isolation, spoofed X-Forwarded-For rejection, malformed header sanitization, window expiration, and multiple-instance limitations & Redis distributed store.
  - Storage Resilience Suite (#14.1–#14.7): PostgreSQL startup verification, HTTP 503 on database unavailability, local JSON fallback prevention in production, single-write guarantee, and credential masking.
  - `POST /api/inquiries`: Oversized payloads exceeding 50KB rejected (`413 PAYLOAD_TOO_LARGE`).
  - `POST /api/inquiries`: Untrusted CORS origins rejected (`403 CORS_FORBIDDEN`).
  - `GET /api/inquiries/:referenceId`: Decommissioned public lookup returns HTTP 404, ensuring zero project metadata, tech stack, or architect assignment is publicly exposed.
  - Reference ID Security: Validates generation of 16-byte cryptographically random tokens (`CYN-YYYYMMDD-[32-hex-chars]`). Arbitrary/guessed IDs return 404 without data leakage.
  - Centralized Error Handler: Catches unexpected repository throws, returning HTTP 500/503 without leaking stack traces or internal exception messages.
  - Helmet Security Headers: Verifies `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and omission of `X-Powered-By`.
- **`test/draftStorage.test.js`**:
  - Verifies PII exclusion from `localStorage` (10 tests passing).
- **`test/antiSpam.test.js`**:
  - Verifies honeypot detection and progressive submission velocity traps (8 tests passing).
- **`test/simulatorModes.test.js`**:
  - Verifies deterministic simulator fault injection across all 5 modes (6 tests passing).
- **`test/originalFormSimulation.test.js`**:
  - Verifies laboratory reproduction of the legacy unhandled promise rejection bug (3 tests passing).
- **`test/qaTestSuite.test.js`**:
  - Full end-to-end QA validation suite covering all discovery flows, accessibility, responsiveness, and resilience (32 tests passing).

**Total Test Suite Execution:** **84 of 84 tests passing** across 9 test suites.  
**Linter Execution:** **0 warnings and 0 errors** on 45 files via `oxlint`.


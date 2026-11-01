# Cynbit Architecture Discovery Engine — Security & Anti-Spam Architecture

**Product:** Cynbit Architecture Discovery Engine  
**Author:** Senior Full-Stack Engineer, Security Reviewer & Architect  
**Classification:** Engineering Specification & Security Audit Reference  
**Status:** Prototype Demonstration Implemented; Production Roadmap Specified  

---

## 1. Executive Summary & Core Security Distinction

In this assessment prototype, anti-spam protections are demonstrated through a multi-layered, defense-in-depth approach.

> [!WARNING]
> **CRITICAL ARCHITECTURAL DISTINCTION: Client vs. Server Enforcement**  
> Client-side rate limiting, speed traps, and hidden honeypot fields implemented inside React/JavaScript are **UX controls and defense-in-depth measures**, not authoritative server security. Any client-side restriction can be bypassed by an adversary using `curl`, headless automation, or clearing `localStorage`.  
> 
> In this client-side Vite demonstration, these controls are transparently labeled as **Prototype Demonstrations**. For real-world production deployment at Cynbit Technologies (`cynbit.in`), authoritative enforcement **must reside at the edge and backend API layers**.

---

## 2. Multi-Layer Anti-Spam Defense Model

```
                    ┌────────────────────────────────────────────────────────┐
                    │               CLIENT-SIDE (PROTOTYPE LAYER)            │
                    ├────────────────────────────────────────────────────────┤
User / Bot Influx ──► [1] Invisible Honeypot Trap (`website_url_hp`)         │
                    │     • Positioned offscreen (-9999px)                   │
                    │     • aria-hidden="true", tabIndex={-1}                │
                    │     • Traps automated scripts populating hidden fields │
                    ├────────────────────────────────────────────────────────┤
                    │ [2] Submission Timing Verification                     │
                    │     • Evaluates elapsed time since form load           │
                    │     • Flags unrealistic completion (<3s)               │
                    │     • Progressive challenge (never locks genuine users)│
                    ├────────────────────────────────────────────────────────┤
                    │ [3] Interface Concurrency & 3/hr Window Throttling     │
                    │     • Hardware ref lock blocks rapid double-clicks     │
                    │     • LocalStorage sliding window (3 submissions/hour) │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │          PRODUCTION EDGE & BACKEND ARCHITECTURE        │
                    ├────────────────────────────────────────────────────────┤
                    │ [4] Edge WAF & Bot Management (Cloudflare / Cloud Armor)│
                    │     • TLS fingerprinting (JA3/JA4)                     │
                    │     • Cloudflare Turnstile non-interactive challenge   │
                    ├────────────────────────────────────────────────────────┤
                    │ [5] Distributed Token Bucket Rate Limiting (Redis)     │
                    │     • Per-IP & per-subnet sliding window               │
                    │     • Max 3 inquiries / hour; Burst limit: 1 / 10s     │
                    ├────────────────────────────────────────────────────────┤
                    │ [6] Server-Side Cryptographic Timing Validation        │
                    │     • HMAC-SHA256 signed form session token            │
                    │     • Validates timestamp integrity without client trust│
                    ├────────────────────────────────────────────────────────┤
                    │ [7] Authoritative Server Payload Sanitization & Schema │
                    │     • Zod / Joi runtime schema validation              │
                    │     • Server-side honeypot drop & IP abuse reporting   │
                    └────────────────────────────────────────────────────────┘
```

---

## 3. Implementation in This Prototype

### Layer A: Honeypot Protection
- **Field Name:** `website_url_hp` (Standard decoy field that automated web scrapers greedily populate).
- **Accessibility Inaccessibility:**
  - Placed inside a container with `aria-hidden="true"`, `width: 1px`, `height: 1px`, `opacity: 0`, `overflow: hidden`, and `pointer-events: none`.
  - Input has `tabIndex={-1}` and `autoComplete="off"`. Screen readers and standard keyboard navigation skip the element entirely.
- **Rejection Behavior:**
  - If populated, client halts submission immediately.
  - Server simulation drops the payload with HTTP 400 (`SECURITY_GATEWAY`).
  - **No leakage:** Error messages communicate `"Security verification failed"` without disclosing that a honeypot caused the rejection.

### Layer B: Progressive Submission Timing
- **Measurement:** Starts timing when the inquiry wizard mounts (`formLoadTime.current = Date.now()`).
- **Threshold:** A minimum realistic threshold of 3,000ms (3 seconds) is established for an inquiry requiring a project title and description.
- **Progressive Fallback:** Genuine fast typists or users utilizing 1Password/Chrome autofill are **never permanently blocked**. If flagged, the user receives an alert: `"Submission was completed unusually quickly. For automated security verification, please review your architectural blueprint and confirm submission again."` Retrying after review passes cleanly.

### Layer C: Concurrency Locks & 3 Inquiries/Hour Throttling
- **Concurrency Lock:** Synchronous mutable ref `isSubmittingRef.current` drops parallel dispatches within 0ms, preventing double-clicks from spawning duplicate database records.
- **Demo Window Throttling:** Client-side sliding window tracks timestamps in `cynbit_form_submissions`. Reaching 3 submissions within 60 minutes disables the submission CTA, displays a clear countdown, and routes urgent inquiries to verified alternative channels (`opportunities@cynbit.in` and WhatsApp `+91-89479-62667`).

---

## 4. Production Deployment Blueprint

When deploying the Cynbit Architecture Discovery Engine to production behind Node.js, Express, or Next.js 15 Server Actions, the following authoritative protections must be configured:

### 1. Distributed Rate Limiting via Redis Token Bucket (Express / Next.js)

```javascript
// production/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
});

export const inquirySubmissionLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:cynbit:inquiry:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour rolling window
  max: 3, // Authoritative limit: 3 submissions per IP per hour
  standardHeaders: true, // Returns `RateLimit-*` headers (RFC draft-6)
  legacyHeaders: false,
  statusCode: 429,
  keyGenerator: (req) => {
    // Obtain client IP using req.ip after Express trust proxy configuration
    return req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      errorType: 'RATE_LIMIT_EXCEEDED',
      error: 'HTTP 429: Inquiry threshold exceeded. Please wait 1 hour or email opportunities@cynbit.in directly.',
      retryAfterSeconds: Math.ceil(req.rateLimit.resetTime ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 3600),
    });
  },
});
```

### 2. Cryptographic HMAC Timestamp Tokens

To prevent attackers from bypassing timing checks by forging request payloads, the server issues a signed timestamp token on initial page load:

```javascript
// Server generates signed token when contact page renders:
const timestamp = Date.now();
const signature = crypto
  .createHmac('sha256', process.env.SECURITY_SECRET)
  .update(`${timestamp}:${clientIp}`)
  .digest('hex');
const timingToken = `${timestamp}.${signature}`;

// On form submission, the server verifies:
const [ts, sig] = req.body.timingToken.split('.');
const expectedSig = crypto
  .createHmac('sha256', process.env.SECURITY_SECRET)
  .update(`${ts}:${clientIp}`)
  .digest('hex');

if (sig !== expectedSig || (Date.now() - Number(ts)) < 3000) {
  return res.status(400).json({ error: 'Security verification failed.' });
}
```

### 3. Edge Bot Mitigation: Cloudflare Turnstile
- Integrate Cloudflare Turnstile invisible widget.
- Unlike traditional reCAPTCHA v2 (which violates WCAG 2.1 AA accessibility guidelines with visual puzzle challenges), Turnstile uses cryptographic PoW and browser heuristics without disrupting accessibility or requiring user interaction.
- The server validates the `cf-turnstile-response` token with Cloudflare's `siteverify` endpoint before queuing the email to Resend.

---

## 5. Verification Matrix

| Layer | Threat Vector | Prototype Behavior | Production Behavior |
| :--- | :--- | :--- | :--- |
| **Honeypot** | Automated crawler filling all inputs | Caught by `website_url_hp`; rejected with generic error. | Dropped by Edge Gateway; flagged IP in Fail2ban. |
| **Timing** | Script dispatching POST in < 500ms | Flagged via `verifySubmissionTiming`; temporary review challenge. | Rejected via HMAC server timestamp token. |
| **Concurrency** | User rapid double-clicking submit | `isSubmittingRef.current` lock drops 2nd call synchronously. | Idempotency Key in Redis drops duplicate requests within 10s. |
| **Volume Throttling** | Spammer sending 50 inquiries / hr | LocalStorage 3/hr threshold blocks interface with countdown. | Redis Token Bucket returns HTTP 429 with RFC headers. |
| **Accessibility** | Blind user with screen reader | Trap is `aria-hidden="true"`, `tabIndex={-1}`; completely transparent. | Non-interactive Turnstile avoids visual puzzles. |


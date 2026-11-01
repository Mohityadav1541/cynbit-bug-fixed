# Cynbit Architecture Discovery Engine — Backend API Documentation

**Service:** Cynbit Discovery Backend API  
**Framework:** Node.js (v20+ / v26) + Express.js  
**Validation:** Zod Schema Validation  
**Database Access Layer:** PostgreSQL Client Connection Pool (`pg`) with Parameterized SQL (Authoritative) + Local JSON Store (Development/Test Only)  

---

## 1. Overview & Architectural Boundaries

The Cynbit Architecture Discovery Engine uses a decoupled client-server architecture:

1. **Frontend Client (`cynbit-contact-fix`):** React 19 + Vite client-side SPA.
2. **Backend API (`server/`):** Express.js REST API providing authoritative server-side validation, anti-bot mitigation, proxy trust evaluation, rate limiting, and persistent storage.
3. **Developer Simulator vs. Real Backend:**
   - **Simulator Modes:** When reviewers select simulated scenarios (e.g., Network Drop, 500 Crash, Slow 3G, Rate Limit), the client executes through `src/utils/mockApi.js`. Submissions in this mode are tagged as `simulated-mock` and are **never** falsely represented as stored in a database.
   - **Live Submission Mode:** Normal submissions call `POST /api/inquiries` against the real Express backend, persisting records to PostgreSQL (via `pg.Pool`) or the local development store (in development/test environments).

---

## 2. API Endpoints Specification

### 2.1 `GET /api/health/live` (Liveness Probe)
Checks whether the Express Node.js process is alive and responding to HTTP requests.
- **Purpose:** Used by container orchestrators (e.g., Kubernetes, AWS ECS, Docker Swarm) to determine if the container process has locked up or crashed and requires a process restart.
- **Characteristics:** Zero database I/O, non-blocking, near-zero latency (<2ms).

**Response (200 OK):**
```json
{
  "status": "live",
  "uptimeSeconds": 240,
  "timestamp": "2026-11-01T20:25:00.000Z"
}
```

---

### 2.2 `GET /api/health/ready` (Readiness Probe)
Checks whether the service can actively accept and persist inquiries.
- **Purpose:** Used by load balancers, reverse proxies, and Kubernetes ingress controllers to determine if traffic should be routed to this instance.
- **Storage Verification:** Actively validates the underlying storage layer:
  - In **production (`NODE_ENV=production`)**: Strictly requires verified PostgreSQL connection. If PostgreSQL is offline, returns **HTTP 503**.
  - In **development (`NODE_ENV=development` / `test`)**: Allows clearly identified local file storage (`server/data/inquiries.json`).
- **Defensive Privacy Guarantee:** Strictly **never** exposes database passwords, connection strings, internal network details, database hostnames, or sensitive internal diagnostics.

**Response (200 OK — Ready in Production):**
```json
{
  "status": "ready",
  "storage": "postgresql",
  "environment": "production",
  "timestamp": "2026-11-01T20:25:00.000Z"
}
```

**Response (200 OK — Ready in Development):**
```json
{
  "status": "ready",
  "storage": "local-development",
  "environment": "development",
  "timestamp": "2026-11-01T20:25:00.000Z"
}
```

**Response (503 Service Unavailable — Not Ready in Production):**
```json
{
  "status": "not_ready",
  "storage": "unavailable",
  "environment": "production",
  "error": "Primary database storage is unavailable.",
  "timestamp": "2026-11-01T20:25:00.000Z"
}
```

---

### 2.3 `GET /api/health` (General Diagnostics)
Backward-compatible endpoint providing high-level diagnostics.

**Response (200 OK — Development Mode):**
```json
{
  "status": "healthy",
  "service": "Cynbit Architecture Discovery API",
  "version": "1.0.0",
  "uptimeSeconds": 142,
  "timestamp": "2026-11-01T15:30:00.000Z",
  "environment": "development",
  "storage": {
    "mode": "local-development",
    "driver": "LocalDevelopmentStore (JSON File)",
    "connected": true,
    "databaseConfigured": false,
    "localFallbackAllowed": true,
    "disclaimer": "LOCAL DEVELOPMENT STORE ACTIVE: Allowed only in development/test environments. Inquiries are stored in local file storage (server/data/inquiries.json). In production, this fallback is strictly disabled to prevent silent data loss.",
    "limitations": [
      "Environment guardrail: Allowed exclusively when NODE_ENV is \"development\" or \"test\". Strictly blocked in production.",
      "Single-node storage: Does not support multi-instance horizontal scaling or distributed cloud replicas.",
      "Ephemeral in containerized environments: Data will be reset if the container or ephemeral disk is destroyed.",
      "No transactional guarantees: Lacks ACID transactions, foreign key constraints, and WAL replication.",
      "Concurrency: File-based persistence under extreme concurrency may experience I/O contention."
    ]
  }
}
```

---

### 2.4 `POST /api/inquiries`
Validates, normalizes, and stores an enterprise architectural discovery enquiry.

**Request Headers:**
- `Content-Type: application/json`

**Request Body (JSON):**
```json
{
  "engagementStream": "Autonomous AI Agents",
  "projectTitle": "Enterprise RAG Pipeline & Multi-Agent Orchestrator",
  "projectDescription": "Designing and deploying an autonomous multi-agent reasoning architecture with retrieval-augmented generation and vector indexing.",
  "businessObjective": "Automate high-volume customer inquiries and reduce escalation turnaround.",
  "mainChallenges": "Low latency requirements and multi-tenant security isolation.",
  "expectedFunctionality": "Streaming chat interface, tool calling, and audit logging.",
  "techStack": ["Next.js", "Python", "PostgreSQL", "Docker"],
  "timeline": "3 - 6 Months",
  "budgetRange": "$50,000 - $100,000",
  "fullName": "Jane Doe",
  "email": "jane.doe@enterprise-corp.com",
  "phone": "+91-9876543210",
  "company": "Enterprise Corp Global",
  "website_url_hp": ""
}
```

**Validation & Security Rules:**
1. **Honeypot Decoy:** If `website_url_hp` contains any text, returns `400 Bad Request` with `errorType: "SECURITY_GATEWAY"`.
2. **Zod Schema:**
   - `projectTitle`: min 3, max 150 characters.
   - `projectDescription`: min 20, max 5000 characters.
   - `fullName`: min 2, max 100 characters.
   - `email`: Validated via RFC regex; automatically trimmed and lowercased.
3. **Server Rate Limiter:** 5 requests per 15-minute sliding window per IP. Exceeding returns `429 Too Many Requests` with RFC `Retry-After` header.
4. **Reference ID:** Automatically generated cryptographic ID formatted as `CYN-YYYYMMDD-[32-HEX-CHARS]` (16 cryptographically random bytes = 128 bits entropy).
5. **Sanitized Error Responses:** Zero stack traces or database connection strings are returned to clients.
6. **Production Storage Guardrail:** If PostgreSQL is offline or encounters write errors in production, returns `503 Service Unavailable` (`errorType: "SERVICE_UNAVAILABLE"`).

**Success Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "referenceId": "CYN-20261101-A9E24F8812BC4D6E8901FA2357CB90ED",
  "message": "Architectural discovery enquiry received and registered successfully.",
  "assignedArchitect": "Lead AI & LLM Systems Architect",
  "slaResponseHours": 24,
  "timestamp": "2026-11-01T15:30:00.000Z",
  "storageMode": "postgresql"
}
```

---

### 2.3 Inquiry Reference IDs & Decommissioned Public Lookup

**Security Architecture Update:**
The public lookup endpoint `GET /api/inquiries/:referenceId` has been **decommissioned (returns HTTP 404)** to protect prospective client metadata (project title, engagement stream, tech stack, timeline, and staff assignment).

**Reference ID Security Standards:**
- **Cryptographic Entropy:** Generated using 16 cryptographically random bytes (`crypto.randomBytes(16)` = 32 uppercase hexadecimal characters = 128 bits of entropy) formatted as `CYN-YYYYMMDD-[32-HEX-CHARS]`.
- **Acknowledgement Only:** Reference IDs are issued exclusively as client confirmation receipts returned upon submission via `POST /api/inquiries`.
- **Non-Credential Status:** Reference IDs are strictly customer reference numbers and are **never** treated as bearer credentials or authentication tokens.
- **Future Portal Tracking:** Any future self-service status lookup MUST use an independent secure verification mechanism (e.g. email-verified OTP magic link or authenticated portal login).

---

## 3. Storage Layer Architecture & Production Guardrails

### 3.1 PostgreSQL Database Layer (`pg.Pool`)
The backend database access layer is built directly using the official `pg` (Node-PostgreSQL) package with 100% parameterized SQL:
- **Connection Pool:** Initialized via `new pg.Pool()` with explicit timeouts:
  - `connectionTimeoutMillis: 5000` (5-second connection acquisition timeout).
  - `idleTimeoutMillis: 30000` (30-second idle client reap).
  - `statement_timeout: 10000` (10-second query execution limit).
  - `max: 10` (maximum 10 pooled clients per instance).
- **SSL / TLS:** Automatically enforced for cloud providers (Neon, AWS, Azure, Supabase) or when `sslmode=require`.
- **Startup Connection Verification:** Validates database connectivity via `SELECT current_database(), version();` before declaring database readiness.
- **Graceful Shutdown:** The pool listens for `SIGINT` and `SIGTERM` process signals and cleanly drains connections via `inquiryRepository.close()`.
- **Credential Masking:** Database connection strings are sanitized via `sanitizeConnectionUrl()` to ensure passwords are never printed to console logs or error diagnostics.

### 3.2 Local Development JSON Store (`server/data/inquiries.json`)
When `DATABASE_URL` is omitted in development or test environments, the server uses the local file store at `server/data/inquiries.json`.
- **Environment Gate:** Local JSON storage is permitted **strictly** when `NODE_ENV` is `"development"` or `"test"`.
- **Clear Indicators:** The storage diagnostics and API responses explicitly mark `storageMode: "local-development"`.

### 3.3 Production Storage Guardrails (`NODE_ENV === "production"`)
In production environments:
1. **No Silent Fallback:** The backend **never** silently switches to local JSON files if PostgreSQL fails.
2. **Controlled HTTP 503:** If PostgreSQL is unavailable or encounters a write error, the server immediately returns a controlled `HTTP 503 Service Unavailable` response.
3. **No False Positives:** The server **never** returns `201 Created` unless the enquiry has actually been persisted to the PostgreSQL database.
4. **Preserved Client Form Data:** The client SPA catches HTTP 503, preserves user form drafts in LocalStorage, and offers retry or fallback transmission channels (WhatsApp, Email).
5. **Duplicate Prevention:** Avoids blind write retries on database timeout/failure to eliminate duplicate record creation.

---

## 4. Setup & Running Instructions

### 4.1 Install Dependencies
```bash
npm install
```

### 4.2 Start the Backend API Server
```bash
# Production Mode
NODE_ENV=production npm run server

# Development Mode
npm run server:dev
```
Server runs on `http://localhost:5001`.

### 4.3 Database Table DDL (PostgreSQL)
```sql
CREATE TABLE IF NOT EXISTS inquiries (
  id VARCHAR(64) PRIMARY KEY,
  reference_id VARCHAR(64) UNIQUE NOT NULL,
  engagement_stream VARCHAR(100) NOT NULL,
  project_title VARCHAR(150) NOT NULL,
  project_description TEXT NOT NULL,
  business_objective TEXT,
  main_challenges TEXT,
  expected_functionality TEXT,
  tech_stack TEXT[] DEFAULT '{}',
  timeline VARCHAR(50),
  budget_range VARCHAR(50),
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(100),
  status VARCHAR(50) DEFAULT 'PENDING_REVIEW',
  assigned_architect VARCHAR(100),
  sla_response_hours INTEGER DEFAULT 24,
  -- Data Minimization: ip_address and user_agent are omitted from active inserts
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_ref_id ON inquiries(reference_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(email);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);
```

### 4.4 Start the Vite Frontend SPA
In a separate terminal:
```bash
npm run dev
```
Frontend runs on `http://localhost:5173` and connects to the Express backend at `http://localhost:5001/api`.

---

## 5. Automated Testing

Run the full end-to-end integration and unit test suite:
```bash
npm test
```

### Test Coverage Highlights:
- **`test/backendApi.test.js`**:
  - `GET /api/health/live` liveness check (fast, non-blocking process health).
  - `GET /api/health/ready` readiness check (validates database readiness; HTTP 503 on database drop without leaking credentials).
  - `GET /api/health` backward-compatible diagnostics validation.
  - `POST /api/inquiries` clean submission, Zod schema validation, honeypot decoy rejection (`400 SECURITY_GATEWAY`), and malformed JSON handling.
  - Express environment-based proxy trust (`TRUST_PROXY`) and client IP spoof-prevention.
  - Sliding-window rate limiting (`429 RATE_LIMIT_EXCEEDED`) and Redis distributed store logic.
  - Decommissioned `GET /api/inquiries/:referenceId` (returns HTTP 404).
  - PostgreSQL startup verification, connection recovery, and graceful shutdown.
  - Production storage guardrails: HTTP 503 on database unavailability, local JSON fallback prevention in production, safe credential masking.
- **`test/draftStorage.test.js`**: LocalStorage draft debouncing, schema v2 migration, corrupted JSON fallback.
- **`test/antiSpam.test.js`**: Honeypot decoy and progressive speed trap timing.
- **`test/simulatorModes.test.js`**: Developer test harness scenarios (200, 429, 500, Slow 3G, Network Drop).
- **`test/qaTestSuite.test.js`**: Full comprehensive QA validation suite.

---

## 6. Container & Cloud Deployment Architecture

### 6.1 Liveness vs. Readiness Probes Distinction

| Probe | Endpoint | Purpose | Trigger Action on Failure |
| :--- | :--- | :--- | :--- |
| **Liveness** | `GET /api/health/live` | Checks if Node.js/Express process event loop is active | **Restart Container:** Kills and restarts the hung container process |
| **Readiness** | `GET /api/health/ready` | Checks if PostgreSQL can accept and persist new inquiries | **Remove from Traffic:** Stops routing ingress traffic until DB recovers |

### 6.2 Kubernetes Deployment Manifest Example
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cynbit-discovery-api
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: api
          image: cynbit-api:latest
          ports:
            - containerPort: 5001
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
          livenessProbe:
            httpGet:
              path: /api/health/live
              port: 5001
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /api/health/ready
              port: 5001
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 2
```

---

## 7. Data Minimization, Metadata Purpose & Retention Policy

### 7.1 Purpose of Retained Metadata
Every field collected through the Discovery API serves a documented, necessary business function:

| Category | Fields Retained | Business Purpose |
| :--- | :--- | :--- |
| **Project Scoping** | `engagementStream`, `projectTitle`, `projectDescription`, `techStack`, `timeline`, `budgetRange`, `businessObjective`, `mainChallenges`, `expectedFunctionality` | Required to evaluate enterprise architectural feasibility, formulate a technical discovery brief, and assign specialized domain architects. |
| **Contact Details** | `fullName`, `email`, `phone`, `company` | Required to deliver the architectural blueprint, schedule consultation calls, and communicate with prospective engineering clients. |
| **Operational Metadata**| `referenceId`, `status`, `assignedArchitect`, `slaResponseHours`, `createdAt`, `updatedAt` | Customer acknowledgement tracking, audit verification, and fulfillment of response SLAs. |

### 7.2 Non-Retained & Ephemeral Metadata
- **Client IP Address:** Evaluated transiently in volatile sliding-window memory or Redis cache strictly to enforce rate limits (5 requests / 15 minutes) and mitigate automated attacks. It is **never** persisted to database records, linked to customer contact details, or returned via APIs.
- **User-Agent:** Used transiently for request parsing; never stored or returned.

### 7.3 Data Retention & Deletion Policy
1. **Retention Timeline:** Prospective architectural discovery inquiries that do not transition into active contracted engagements are retained for a maximum of **90 days**, after which they are permanently purged.
2. **Right to Erasure (Manual Purge):** Prospective clients can request immediate, permanent deletion of their inquiry records by submitting their `referenceId` to `opportunities@cynbit.in` or `privacy@cynbit.in`.
3. **Browser LocalStorage Policy:** Form drafts auto-saved in the client browser contain strictly project scoping specifications (zero PII) and can be immediately erased at any point via the UI **Clear Draft** button or automatically upon successful submission.

### 7.4 Statutory Privacy Notice
> [!NOTE]
> **Privacy by Design Notice:** This system is engineered under strict principles of data minimization and purpose limitation. Formal statutory legal compliance under specific territorial privacy frameworks (e.g., GDPR, CCPA, or DPDP Act) requires an independent organizational legal review.


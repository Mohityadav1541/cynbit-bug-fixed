# Cynbit Architecture Discovery Engine — Backend API Documentation

**Service:** Cynbit Discovery Backend API  
**Framework:** Node.js (v20+ / v26) + Express.js  
**Validation:** Zod Schema Validation  
**ORM / Database:** Prisma ORM with PostgreSQL (Authoritative) + Local JSON Store (Development Fallback)  

---

## 1. Overview & Architectural Boundaries

The Cynbit Architecture Discovery Engine uses a decoupled client-server architecture:

1. **Frontend Client (`cynbit-contact-fix`):** React 19 + Vite client-side SPA.
2. **Backend API (`server/`):** Express.js REST API providing authoritative server-side validation, anti-bot mitigation, rate limiting, and persistence.
3. **Developer Simulator vs. Real Backend:**
   - **Simulator Modes:** When reviewers select simulated scenarios (e.g., Network Drop, 500 Crash, Slow 3G, Rate Limit), the client executes through `src/utils/mockApi.js`. Submissions in this mode are tagged as `simulated-mock` and are **never** falsely represented as stored in a database.
   - **Live Submission Mode:** Normal submissions call `POST /api/inquiries` against the real Express backend, persisting records to PostgreSQL or the local development store.

---

## 2. API Endpoints Specification

### 2.1 `GET /api/health`
Checks server uptime, health status, and active storage diagnostics.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "Cynbit Architecture Discovery API",
  "version": "1.0.0",
  "uptimeSeconds": 142,
  "timestamp": "2026-11-01T15:30:00.000Z",
  "environment": "development",
  "storage": {
    "mode": "local-fallback",
    "driver": "LocalDevelopmentStore (JSON File)",
    "connected": true,
    "databaseConfigured": false,
    "disclaimer": "LOCAL DEVELOPMENT FALLBACK STORE ACTIVE: DATABASE_URL is not set...",
    "limitations": [
      "Single-node storage: Does not support multi-instance horizontal scaling.",
      "Ephemeral in containerized environments without mounted volumes.",
      "Lacks ACID transactions and WAL replication."
    ]
  }
}
```

---

### 2.2 `POST /api/inquiries`
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
4. **Reference ID:** Automatically generated cryptographic ID formatted as `CYN-YYYYMMDD-XXXXXX`.
5. **Sanitized Error Responses:** Zero stack traces or internal server details are returned to clients.

**Success Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "referenceId": "CYN-20261101-A9E24F",
  "message": "Architectural discovery enquiry received and registered successfully.",
  "assignedArchitect": "Lead AI & LLM Systems Architect",
  "slaResponseHours": 24,
  "timestamp": "2026-11-01T15:30:00.000Z",
  "storageMode": "local-fallback"
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

## 3. Storage Engines & Persistence Fallback

### 3.1 PostgreSQL with Prisma ORM (Production)
When `DATABASE_URL` is set:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/cynbit_inquiries?schema=public"
```
The server connects to PostgreSQL via Prisma ORM (`prisma/schema.prisma`), providing:
- Full ACID transactions and relational persistence.
- High-concurrency connection pooling.
- Indexed lookups on `referenceId`, `email`, and `createdAt`.

To generate Prisma client and apply migrations:
```bash
npx prisma generate
npx prisma db push
```

### 3.2 Local Development Fallback Store
When `DATABASE_URL` is omitted, the server automatically and transparently activates the local file store at `server/data/inquiries.json`.

**Persistence Limitations Disclaimer:**
- Single-node file persistence: Does not support multi-instance cluster synchronization.
- Container ephemeral disk: Reset if an unmounted container filesystem is recreated.
- Concurrency: File-based I/O under extreme write concurrency lacks ACID guarantees.

---

## 4. Setup & Running Instructions

### 4.1 Install Dependencies
```bash
npm install
```

### 4.2 Start the Backend API Server
```bash
# Production Mode
npm run server

# Development Watch Mode
npm run server:dev
```
Server starts on `http://localhost:5001`.

### 4.3 Start the Vite Frontend SPA
In a separate terminal:
```bash
npm run dev
```
Frontend runs on `http://localhost:5173` and automatically connects to the Express backend at `http://localhost:5001/api`.

---

## 5. Automated Testing

Run the full end-to-end integration and unit test suite:
```bash
npm test
```

### Test Coverage Highlights:
- **`test/backendApi.test.js`**:
  - `GET /api/health` diagnostic validation.
  - `POST /api/inquiries` clean submission, Zod schema validation, honeypot decoy rejection (`400 SECURITY_GATEWAY`), and malformed JSON handling.
  - Server-side sliding-window rate limiting (`429 RATE_LIMIT_EXCEEDED`).
  - `GET /api/inquiries/:referenceId` decommission verification (asserts HTTP 404 with zero data leakage).
  - Internal server exception handling (zero stack trace leakage).
- **`test/draftStorage.test.js`**: LocalStorage draft debouncing, schema v2 migration, corrupted JSON fallback.
- **`test/antiSpam.test.js`**: Honeypot decoy and progressive speed trap timing.
- **`test/simulatorModes.test.js`**: Developer test harness scenarios (200, 429, 500, Slow 3G, Network Drop).
- **`test/originalFormSimulation.test.js`**: Production bare `await` bug reproduction.

---

## 6. Production Deployment Instructions

### Option A: Docker Deployment
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
ENV PORT=5001
EXPOSE 5001
CMD ["node", "server/index.js"]
```

### Option B: Cloud Hosting (Railway, Render, AWS ECS)
1. Set Environment Variables:
   - `NODE_ENV=production`
   - `PORT=5001`
   - `DATABASE_URL=postgresql://...`
   - `CORS_ORIGIN=https://cynbit.in`
2. Run database migration:
   `npx prisma db push`
3. Start command:
   `node server/index.js`


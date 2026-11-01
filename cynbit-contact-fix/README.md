# Cynbit Contact Experience Fix — Application Workspace (`cynbit-contact-fix`)

This directory contains the complete source code, test suites, and engineering documentation for the **Cynbit Architecture Discovery Engine** working prototype.

> **Canonical Repository Documentation:**  
> Please see the root [README.md](../README.md) for the comprehensive architectural analysis, decompiled bug investigation, system architecture, and technology stack.

---

## Quick Reference Links

- [Root README (Canonical Overview)](../README.md)
- [Submission Report](../SUBMISSION_REPORT.md)
- [Backend Setup & API Reference](./BACKEND_SETUP.md)
- [Security Review & Audit](./SECURITY_REVIEW.md)
- [Security & Anti-Spam Architecture](./SECURITY_ARCHITECTURE.md)
- [Brand Design Specification](./BRAND_DESIGN_SPEC.md)
- [Project Audit & Bug Catalog](./PROJECT_AUDIT.md)
- [QA Testing Report](./TESTING_REPORT.md)

---

## Directory Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development
```bash
# Terminal 1 — Express REST Server (Port 5001)
npm run server

# Terminal 2 — Vite Frontend Development Server (Port 5173)
npm run dev
```

### 3. Run Automated Tests
```bash
npm test
```
*Executes all 101 unit and integration tests across 8 test suites natively with `node:test`.*

### 4. Build for Production
```bash
npm run build
```

### 5. Run Linter (`oxlint`)
```bash
npm run lint
```

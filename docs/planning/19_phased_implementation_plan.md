# Deliverable 19: Phased Implementation Plan
**Project:** ForgeStudio SaaS Platform  
**Date:** September 2026  
**Leadership:** Engineering & Product Operations  

---

## 1. Quality Gates & Release Criteria

| Gate | Milestone | Objective | Exit Criteria |
| :--- | :--- | :--- | :--- |
| **Gate 0** | Architecture & Discovery | Contracts, RBAC model, schema plan, risk register, and baseline test audit approved. | 20 planning deliverables approved; clean branch `feature/forgestudio-complete-platform` established. |
| **Gate 1** | System Stabilization & Core SaaS | Dead files pruned; real Admin dashboards built; 7+7 RBAC unified without breaking legacy data. | All 10 existing backend test suites pass; Admin dashboards render live database analytics. |
| **Gate 2** | Editor & Renderer Parity | Tri-renderer parity across Canvas, Public Site, and Static Compiler. | Static compiler produces 100% styled HTML/CSS for all 40+ Pro widgets matching `PublishedSite.tsx`. |
| **Gate 3** | WordPress Real Integration | Complete `forgestudio-connector` plugin; real HTTPS publishing; zero simulated post IDs. | Real WordPress instance connects, publishes, and returns verified live URL; rollback restores previous post state. |
| **Gate 4** | Deployments & Dynamic CMS | Multi-destination publishing (SFTP, Static ZIP, WordPress); CPT dynamic loops; Forms & Leads. | SFTP transfers verified; CSV export downloads leads; CPT entries dynamically render in Loop Grid. |
| **Gate 5** | Agency, Dev Platform & Automation| Multi-tenant workspaces; scoped API v1; durable job runner; scheduled publishing. | API key queries return scoped data; scheduled publish job triggers on time without process crash. |
| **Gate 6** | Security, Hardening & Production | Anti-SSRF, DOM reduction, bundle optimization, full regression suite pass. | Zero simulated workflows; zero known security vulnerabilities; build passes on both frontend and backend. |

---

## 2. Definition of Ready (DoR)

A feature or milestone may enter implementation only when:
1. User story, roles, and business value are documented.
2. Exact backend files, frontend files, database models, and API endpoints are identified.
3. Security, capability authorization, and tenant isolation requirements are defined.
4. Backward compatibility with existing `CanonicalWebsiteData` is confirmed.
5. Acceptance test scenarios (happy path, validation error, unauthorized, cross-tenant) are written.

---

## 3. Definition of Done (DoD)

A milestone is considered complete only when:
1. All changes are additive; no existing working features, models, or routes were deleted.
2. Server-side authorization (`authorizeCapability`) is enforced on all endpoints.
3. No fake data, hardcoded metrics, or simulated publishing results remain.
4. Tri-renderer parity is visually and programmatically validated.
5. All relevant unit and integration test suites pass with 100% success.
6. Backend and frontend builds compile without TypeScript errors.
7. Audit log entries are recorded for all sensitive mutations.

# Deliverable 17: Risk Register
**Project:** ForgeStudio SaaS Platform  
**Date:** September 2026  
**Audience:** CTO, Product Manager, Lead Architects  

---

## 1. Risk Register Summary Table

| Risk ID | Category | Risk Description | Probability | Impact | Score | Mitigation Strategy | Contingency Plan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | Technical | Modifying monolithic `WebsiteEditor.tsx` causes regression in canvas drag-and-drop or inspector state. | High | Critical | **HIGH** | Use additive component extraction; leave core state loops intact; run full manual QA across breakpoints. | Fast git revert of incremental feature commits. |
| **R-02** | Integrity | Simulated WordPress publishing logic (`wpPostId = 1000 + ...`) leaks to production, returning fake success. | High | Critical | **HIGH** | Build real `forgestudio-connector` PHP plugin; require HTTP 200/201 response verification before marking deployment `PUBLISHED`. | Mark status `FAILED` with descriptive error when remote host is unreachable. |
| **R-03** | Data Loss | Prisma schema migration alters or drops existing production tables or columns. | Med | Critical | **HIGH** | Strictly use additive columns with defaults (`@default(...)`); never drop columns without deprecation cycles. | Automated pg_dump backup before every schema push. |
| **R-04** | Compatibility| Static compiler (`staticCompiler.ts`) only supports core widgets, leaving Pro widgets unrendered in ZIP exports. | High | High | **HIGH** | Systematically implement HTML5/CSS3 renderers for all Pro/Interactive widgets matching `renderers.tsx`. | Warn user during pre-publish validation if unsupported widget is detected. |
| **R-05** | Security | SSRF vulnerability allowing malicious users to enter internal IP addresses (`127.0.0.1`, `169.254.169.254`) in WordPress/Webhook URLs. | Med | Critical | **HIGH** | Implement DNS resolution and IP CIDR filtering before initiating server-side HTTP requests. | Restrict outbound traffic via network security groups. |
| **R-06** | Security | IDOR or tenant leak due to missing capability authorization on sub-routes (e.g. CPTs or form submissions). | Med | High | **MED** | Enforce `authorizeCapability()` middleware on 100% of website-scoped Express routes. | Automated penetration test running cross-tenant token replay tests. |
| **R-07** | Operational | In-memory job queue losing scheduled publications or webhook retries upon process reboot. | Med | Med | **MED** | Ensure all jobs are durably written to PostgreSQL `background_jobs` table before worker execution. | Re-queue pending jobs on server startup. |
| **R-08** | Team Sync | Concurrent commits from active team members on `devnew` causing complex merge conflicts. | High | Med | **MED** | Strictly isolate development on `feature/forgestudio-complete-platform`; communicate additive state properties inline. | Frequent git fetch and merge checks against `origin/devnew`. |

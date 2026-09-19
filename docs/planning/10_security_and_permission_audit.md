# Deliverable 10: Security and Permission Audit
**Project:** ForgeStudio SaaS Platform  
**Date:** September 2026  
**Auditor:** Principal Security Architect  

---

## 1. Executive Summary & Security Posture

ForgeStudio demonstrates robust architectural security controls across multi-tenant isolation, cryptographic credential management, and server-side capability authorization. However, several critical operational hardening measures and boundary checks must be addressed before enterprise deployment.

---

## 2. Authentication & Session Security

| Control Area | Current Implementation | Security Evaluation | Required Hardening |
| :--- | :--- | :--- | :--- |
| **Password Hashing** | Uses `argon2` and `bcryptjs` with salt work factor 10. | **STRONG:** Industry-standard password hashing preventing rainbow table extraction. | Ensure all legacy paths strictly enforce argon2 for new hashes. |
| **Session Cookies** | HTTP-Only, SameSite=Lax (or Strict in prod), Secure flag enabled when `NODE_ENV=production`. | **STRONG:** Protected against XSS-based token exfiltration. | Enforce automatic session rotation on privilege change. |
| **Multi-Channel OTP** | Stores hashed OTPs (`otpHash`) in DB with expiration timestamp and 5-attempt brute-force cap. | **STRONG:** Resilient against brute-force guessing and replay attacks. | Add IP-based rate limiting on `/api/v1/auth/verify-otp`. |
| **Session Revocation** | `Session.revokedAt` timestamp checked on every request; DB index on `tokenHash`. | **STRONG:** Immediate revocation upon user logout or password reset. | Implement automated cron job to purge expired sessions. |

---

## 3. Server-Side Authorization & Tenant Isolation (Anti-IDOR)

1. **Website & Project Isolation:**
   - **Mechanism:** `authorizeCapability(capability, resourceId)` middleware verifies that the requesting user is either the project owner, an authorized team member, or has an explicit `ALLOW` entry in `GranularPermission`.
   - **Tenant Boundary:** The user ID is authoritatively extracted from `res.locals.user.id` (hydrated by `requireAuth` session lookup), **never** accepted from untrusted request body parameters.
   - **Evaluation:** Prevents IDOR (Insecure Direct Object Reference) vulnerabilities on website read, edit, delete, and publish operations.
2. **Component & Element-Level Isolation:**
   - `component_accesses` table restricts sensitive elements (e.g. billing blocks, client-restricted sections) from unauthorized collaborators.
3. **Identified Gap:**
   - Some sub-routes in `customPostType.routes.ts` directly queried `postTypeId` without verifying that the parent website belongs to the requesting user's organization.
   - **Remediation:** Enforce `authorizeCapability("VIEW")` on all CPT and Custom Entry endpoints.

---

## 4. Secret Protection & Cryptographic Storage

| Secret Type | Storage Mechanism | Transmission & Browser Exposure |
| :--- | :--- | :--- |
| **WordPress API Keys** | Stored as SHA-256 / bcrypt hash (`apiKeyHash`) in `wordpress_connections`. | **NEVER EXPOSED TO BROWSER.** Transmitted only server-to-server. |
| **Developer API Keys** | Stored as SHA-256 hash (`tokenHash`) in `developer_api_keys`. | The raw token is only returned **once** upon creation; never retrievable afterwards. |
| **SFTP Passwords & Keys**| Stored in `sftp_connections` or injected via server environment variables. | Passwords omitted from JSON serialization in API responses. |
| **OAuth Client Secrets** | Injected via backend `.env` variables (`GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_SECRET`). | Kept strictly on the backend server. |

---

## 5. Input Validation, Injection & XSS Protection

1. **SQL Injection:**
   - All database queries execute via Prisma ORM parameterized queries or tagged templates (`prisma.$executeRawUnsafe` in migrations only uses trusted structural SQL).
2. **Cross-Site Scripting (XSS):**
   - In Visual Canvas & Published Site: Raw HTML injection is sanitized via `DOMPurify.sanitize()`.
   - Link protocol sanitization strictly blocks `javascript:`, `data:`, `vbscript:`, and malformed protocols.
3. **Server-Side Request Forgery (SSRF) Protection:**
   - WordPress connection URLs and Webhook URLs must be validated against private IP ranges (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, AWS metadata `169.254.169.254`) before dispatching HTTP requests.
   - **Remediation:** Add an SSRF IP validator in `wordpress/connector.service.ts` and `jobs/handlers.ts`.

---

## 6. Audit Trail & Compliance

- `AuditLog` table stores:
  `{ userId, action, targetResource, details, ipAddress, createdAt }`
- Actions currently logged: `ORGANIZATION_CREATED`, `WORKSPACE_CREATED`, `PERMISSION_UPDATED`, `PERMISSION_DELETED`, `TEAM_MEMBER_INVITED`, `TEAM_MEMBER_REMOVED`, `DEPLOYMENT_PUBLISHED`, `DEPLOYMENT_ROLLBACK`.
- **Required Expansion:** Log login failures, password resets, account suspension, and website deletions.

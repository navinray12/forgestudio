# ForgeStudio — Phase 3: Authentication, Organizations & 7+7 RBAC Architecture & Verification

## 1. Executive Summary

Phase 3 establishes an enterprise-grade multi-tenant authorization, organization/workspace isolation, canonical 7+7 role hierarchy, deterministic permission evaluation engine, privilege escalation defense, and hardened session lifecycle for ForgeStudio.

---

## 2. 7+7 Role Reconciliation

### Global Roles Reconciliation (Platform Level)
The database schema contained 8 entries for `UserRole`. Phase 3 reconciles them into the canonical 7 global roles while preserving backward compatibility for existing records:

| Canonical Global Role (7) | Database Enum Value | Hierarchy Tier | Authority & Capabilities |
| :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `SUPER_ADMIN` | 100 | Full platform infrastructure control, worker job queues, system configurations, last-admin lockout defense. |
| **PLATFORM_ADMIN** | `PLATFORM_ADMIN` (legacy: `ADMIN`) | 80 | Full platform operations, user moderation, website moderation, live metrics, audit log CSV export. |
| **SUPPORT_ADMIN** | `SUPPORT_ADMIN` | 60 | Customer support operations, user read/status assistance, ticket resolution. |
| **DEVELOPER** | `DEVELOPER` | 50 | Platform API keys, webhooks, technical integrations, system telemetry. |
| **AI_CONTENT_ADMIN** | `AI_CONTENT_ADMIN` | 40 | Platform AI prompt templates, dynamic generation quotas, model fine-tuning settings. |
| **CUSTOMER** | `USER` | 20 | Standard tenant account, workspace owner, project creation, subscription management. |
| **TEAM_MEMBER** | `TEAM_MEMBER` | 10 | Invited tenant collaborator with delegated workspace or project permissions. |

*Legacy Alias Strategy:* Legacy `ADMIN` is normalized via `normalizeGlobalRole()` to `PLATFORM_ADMIN` with complete backwards compatibility without destructive database schema changes.

### Project Roles Reconciliation (Website Level)
Phase 3 establishes 7 canonical project roles with distinct capabilities, unifying legacy aliases (`PROJECT_OWNER`, `PROJECT_ADMIN`, `REVIEWER`, `CLIENT`):

| Canonical Project Role (7) | Legacy Aliases | Rank Tier | Documented Capabilities |
| :--- | :--- | :--- | :--- |
| **OWNER** | `PROJECT_OWNER` | 100 | Full project sovereignty: `VIEW`, `PREVIEW`, `EDIT_CONTENT`, `EDIT_DESIGN`, `CUSTOM_CODE`, `SFTP_ACCESS`, `EDIT_SEO`, `PUBLISH`, `RESTORE_REVISION`, `PROJECT_SETTINGS`, `MANAGE_MEMBERS`, `MANAGE_PERMISSIONS`, `DELETE`, `EXPORT_CODE`, `VIEW_ANALYTICS`, `MANAGE_INTEGRATIONS`, `COMMENT` |
| **ADMIN** | `PROJECT_ADMIN` | 80 | Full management except project deletion: `VIEW`, `PREVIEW`, `EDIT_CONTENT`, `EDIT_DESIGN`, `CUSTOM_CODE`, `SFTP_ACCESS`, `EDIT_SEO`, `PUBLISH`, `RESTORE_REVISION`, `PROJECT_SETTINGS`, `MANAGE_MEMBERS`, `MANAGE_PERMISSIONS`, `EXPORT_CODE`, `VIEW_ANALYTICS`, `MANAGE_INTEGRATIONS`, `COMMENT` |
| **DESIGNER** | - | 60 | Design & visual styling: `VIEW`, `PREVIEW`, `EDIT_CONTENT`, `EDIT_DESIGN`, `EDIT_SEO`, `PUBLISH`, `RESTORE_REVISION`, `COMMENT` |
| **DEVELOPER** | - | 50 | Code & technical integrations: `VIEW`, `PREVIEW`, `EDIT_CONTENT`, `CUSTOM_CODE`, `SFTP_ACCESS`, `EXPORT_CODE`, `MANAGE_INTEGRATIONS`, `COMMENT` |
| **CONTENT_EDITOR** | - | 40 | Text & media content updates: `VIEW`, `PREVIEW`, `EDIT_CONTENT`, `EDIT_SEO`, `COMMENT` |
| **SEO_MANAGER** | - | 30 | Search optimization & analytics: `VIEW`, `PREVIEW`, `EDIT_SEO`, `VIEW_ANALYTICS`, `COMMENT` |
| **VIEWER** | `REVIEWER`, `CLIENT` | 10 | Read-only inspection & collaboration: `VIEW`, `PREVIEW`, `VIEW_ANALYTICS`, `COMMENT` |

---

## 3. Deterministic Permission Precedence Engine

Access resolution in `canUserAccessResource()` follows a strict deterministic 10-step precedence order:

```
[1] Authenticated User Check (valid non-null userId)
               │
[2] Account Status & Session Validity (Active account, unrevoked session)
               │
[3] Explicit Resource-Specific DENY Override (effect = 'DENY', resourceId = target)
               │
[4] Explicit Resource-Specific ALLOW Override (effect = 'ALLOW', resourceId = target)
               │
[5] Explicit Wildcard DENY Override (effect = 'DENY', resourceId = '*')
               │
[6] Explicit Wildcard ALLOW Override (effect = 'ALLOW', resourceId = '*')
               │
[7] Project Ownership Grant (Owner has full capabilities, cannot be restricted)
               │
[8] Canonical Project Role Default Capabilities (Evaluated via DEFAULT_CAPABILITIES)
               │
[9] Workspace / Organization Administrative Authority (Workspace OWNER/ADMIN)
               │
[10] Default Fail-Closed (Reject with 403 Forbidden)
```

**Key Security Properties:**
- Explicit `DENY` overrides cannot be bypassed by wildcard grants or default role capabilities.
- Project Owners cannot be locked out of their own projects.
- Requests without positive authorization fail closed.

---

## 4. Multi-Tenant Organization & Workspace Isolation Model

1. **Organization Layer:**
   - Multi-tenant enterprise boundary (`Organization` model).
   - Membership tracked via `OrganizationMember` with roles (`OWNER`, `ADMIN`, `MEMBER`).
   - Tenant isolation enforced on `/api/v1/organizations` and sub-resources.
2. **Workspace Layer:**
   - Scoped departmental / client container (`Workspace` model) linked to `organizationId`.
   - Membership tracked via `WorkspaceMember` with roles (`OWNER`, `ADMIN`, `MEMBER`).
   - Tenant isolation enforced on `/api/v1/workspaces`.
3. **Website Scoping:**
   - Websites possess foreign key references to `workspaceId` and `organizationId`.
   - Querying websites via `GET /api/websites?workspaceId=...` strictly validates workspace membership; unauthorized workspace context queries return `403 FORBIDDEN`.
   - Direct access by ID (`GET /api/websites/:id`) validates ownership, collaboration membership, or workspace administrative authority; IDOR attempts fail with `404` or `403`.

---

## 5. Privilege Escalation Prevention & Administrative Safety

1. **Global Role Escalation Defense:**
   - Normal users cannot alter global roles.
   - Administrators cannot assign higher tiers than their own tier (`canAssignGlobalRole`).
   - Super Admin lockout protection: The system strictly prevents demoting or deleting the last active `SUPER_ADMIN`.
2. **Project Role Escalation Defense:**
   - Collaborators cannot assign roles higher or equal to their own tier (`canAssignProjectRole`).
   - Project Admins cannot grant the `OWNER` role.
   - Peer Admins cannot demote or remove other Admins.
   - Non-admin collaborators cannot invite members or alter granular permissions.

---

## 6. Route Authorization & Sensitive Endpoint Coverage

| Endpoint / Area | Auth Middleware | Enforcement Level | Status |
| :--- | :--- | :--- | :--- |
| `GET /api/websites` | `requireAuth` | Tenant / Workspace membership filtering | Protected |
| `GET /api/websites/:id` | `requireAuth` | Website ownership, collaborator, or workspace authority | Protected |
| `GET /api/websites/:id/roles` | `requireAuth` | Collaborator or Owner check | Protected |
| `PUT /api/websites/:id/roles/:userId` | `requireAuth` | Owner or Admin with `canAssignProjectRole` | Protected |
| `POST /api/websites/:id/invite` | `requireAuth` | Owner or Admin with `MANAGE_MEMBERS` capability | Protected |
| `POST /api/websites/:id/permissions`| `requireAuth` | Owner or Admin with `MANAGE_PERMISSIONS` capability | Protected |
| `GET /api/websites/:id/effective-permissions` | `requireAuth` | Collaborator / Owner role capability resolution | Protected |
| `GET /api/v1/workspaces` | `requireAuth` | User workspace membership resolution | Protected |
| `POST /api/v1/workspaces` | `requireAuth` | Workspace creation with caller as `OWNER` | Protected |
| `POST /api/v1/workspaces/:id/websites/:websiteId` | `requireAuth` | Cross-tenant website assignment authorization | Protected |
| `GET /api/v1/organizations` | `requireAuth` | User organization membership resolution | Protected |
| `PUT /api/v1/operations/admin/users/:userId/role` | `requireAuth`, `requireRole` | Privilege escalation check & last Super Admin protection | Protected |
| `GET /api/v1/operations/jobs` | `requireAuth`, `requireRole` | Restricted strictly to `SUPER_ADMIN` | Protected |

---

## 7. Role Manager & Workspace UI Integration

- **RoleManagerModal.tsx:**
  - Integrated with canonical 7 project roles (`OWNER`, `ADMIN`, `DESIGNER`, `DEVELOPER`, `CONTENT_EDITOR`, `SEO_MANAGER`, `VIEWER`).
  - Displays readable capability names and descriptions.
  - Inherited role capabilities and explicit permission overrides (`ALLOW` / `DENY`) rendered authoritatively.
  - Real-time save actions dispatch directly to `/api/websites/:id/permissions` and `/roles/:userId`.
- **WorkspaceSwitcher.tsx & UserDashboard.tsx:**
  - Workspace selector passes `workspaceId` context to `/api/websites?workspaceId=...`.
  - Switching workspaces re-fetches websites and guarantees isolation.

---

## 8. Database Migrations & Enum Compatibility

- **Enum Values Verified:**
  - Verified and executed forward-only PostgreSQL enum additions:
    `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PLATFORM_ADMIN';`
    `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPPORT_ADMIN';`
    `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DEVELOPER';`
    `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AI_CONTENT_ADMIN';`
    `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TEAM_MEMBER';`
  - Zero data loss, zero destructive migrations, 100% backward compatibility for existing records.

---

## 9. Comprehensive Test Suite & Evidence Matrix

### Phase 3 Verification Suite (`tests/phase3-auth-rbac.test.ts`)
- **Total Tests:** 29
- **Passed:** 29
- **Failed:** 0

### Regression Test Evidence
- **Milestone A Permissions (`src/tests/milestoneA-permissions.test.ts`):** 15/15 Passed (0 Failed)
- **Milestone C Collaboration (`src/tests/milestoneC-collaboration.test.ts`):** 14/14 Passed (0 Failed)
- **Phase 2 Admin Verification (`tests/phase2-admin.test.ts`):** 22/22 Passed (0 Failed)
- **Backend TypeScript Build (`tsc`):** Clean (0 Errors)
- **Frontend Vite & TS Build (`tsc -b && vite build`):** Clean (0 Errors)

---

## 10. Status Matrix

| Workstream | Before | Implemented | Test Evidence | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Canonical 7 Global Roles** | Discrepant (8 in Prisma, unranked) | Canonical 7 hierarchy tiers, normalization for legacy aliases | Tests A1-A2, C1-C3 (All Pass) | **COMPLETE** |
| **Canonical 7 Project Roles** | Legacy aliases & fragmented keys | 7 canonical roles with distinct capability matrix | Tests A3-A5, D1-D5 (All Pass) | **COMPLETE** |
| **Permission Precedence** | Basic role fallback | 10-step deterministic precedence (DENY overrides) | Tests D6-D7, Milestone A (All Pass) | **COMPLETE** |
| **Organization & Workspace Isolation** | Incomplete API endpoints | `/api/v1/workspaces`, `/api/v1/organizations` CRUD & membership | Tests B1-B4, F1-F4 (All Pass) | **COMPLETE** |
| **Privilege Escalation Prevention** | Unchecked role assignment | Hierarchy checks & last Super Admin protection | Tests C1-C5 (All Pass) | **COMPLETE** |
| **Role Manager & Workspace UI** | Hardcoded legacy values | Aligned 7-role capabilities, workspace context queries | Frontend build clean, D3/D5 Pass | **COMPLETE** |
| **Session Lifecycle Hardening** | Basic token checks | Immediate revocation checks, suspended denial | Tests E1-E2, Phase 2 B6 (All Pass) | **COMPLETE** |
| **Regression Integrity** | Untested against Phase 3 | Milestone A, C and Phase 2 test suites run against PostgreSQL | 51 regression tests Pass (0 Fail) | **COMPLETE** |

---

## 11. Files Modified / Created

- `backend/src/services/permission.service.ts`
- `backend/src/services/website.service.ts`
- `backend/src/controllers/website.controller.ts`
- `backend/src/routes/website.routes.ts`
- `backend/src/controllers/workspace.controller.ts`
- `backend/src/routes/workspace.routes.ts`
- `backend/src/controllers/organization.controller.ts`
- `backend/src/routes/organization.routes.ts`
- `backend/src/controllers/operations.controller.ts`
- `backend/src/routes/operations.routes.ts`
- `backend/src/middlewares/auth.middleware.ts`
- `backend/src/app.ts`
- `backend/prisma/apply_enum_migration.ts`
- `backend/tests/phase3-auth-rbac.test.ts`
- `frontend/src/pages/dashboard/components/RoleManagerModal.tsx`
- `frontend/src/pages/dashboard/UserDashboard.tsx`
- `docs/planning/PHASE3_AUTH_RBAC.md`

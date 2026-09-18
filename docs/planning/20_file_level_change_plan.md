# Deliverable 20: File-Level Change Plan
**Project:** ForgeStudio SaaS Platform  
**Date:** September 2026  
**Audience:** Full-Stack Engineering Team & Product Leadership  

---

## 1. Milestone 1: System Stabilization, Dead Code Pruning & Baseline Health

### Specification & Requirements
- **Business Purpose:** Establish a clean, deterministic baseline across backend and frontend before feature expansion.
- **User Roles:** Platform Developers, DevOps, QA Engineers.
- **Dependencies:** Branch safety verification (`feature/forgestudio-complete-platform`).
- **Existing Reusable Code:** Existing 10 test suites in `backend/src/tests`.
- **Backend Changes:** Remove dangling catch blocks in raw SQL migrations; ensure routes in `app.ts` preserve dual-mount compatibility.
- **Frontend Changes:** Safely clean unused temporary diff text files (`_temp_editor_diff*.txt`, `right_panel.txt`, `*.rej`).
- **Database Changes:** None.
- **API Changes:** None.
- **Security Requirements:** Ensure all `.env` secrets remain uncommitted.
- **Permission Requirements:** N/A.
- **Migration Requirements:** None.
- **Testing Requirements:** Run all 10 backend test suites (`tsx src/tests/...`); verify 100% pass rate.
- **Rollback Strategy:** Git branch reset to `013cb5901762068183c5e909eb4405157a912a40`.
- **Acceptance Criteria:** Zero dead diff files; all 10 test suites execute green; backend and frontend build cleanly.
- **Affected Files:**
  - `frontend/_temp_editor_diff.txt` [DELETE]
  - `frontend/_temp_editor_diff_utf8.txt` [DELETE]
  - `frontend/right_panel.txt` [DELETE]
  - `frontend/App.tsx.rej` [DELETE]
  - `frontend/src/pages/editor/WebsiteEditor.tsx.rej` [DELETE]
  - `et --hard 6a2f2b3`, `et --hard HEAD@{1}`, `tatus` [DELETE]
  - `backend/error.txt`, `backend/ts_error*.txt` [DELETE]
- **Estimated Complexity:** Low (1-2 engineer hours).

---

## 2. Milestone 2: SaaS Admin Dashboards & Real System Governance

### Specification & Requirements
- **Business Purpose:** Replace placeholder Admin views with a real administrative control plane for monitoring tenants, websites, users, and system health.
- **User Roles:** `SUPER_ADMIN`, `ADMIN`, `PLATFORM_ADMIN`, `SUPPORT_ADMIN`.
- **Dependencies:** Milestone 1.
- **Existing Reusable Code:** `operations.service.ts`, `audit.service.ts`, `website.service.ts`, `UserDashboard.tsx` component library.
- **Backend Changes:** Add admin query endpoints for platform-wide metrics (total websites, active users, storage consumed, failed deployments).
- **Frontend Changes:** Evolve `AdminDashboard.tsx` and `SuperAdminDashboard.tsx` into responsive control centers featuring:
  - Metric cards: Total Users, Total Websites, Storage Used, Active Deployments.
  - Users data table: Name, email, role, status, website count, last login, suspend/unsuspend action.
  - Websites data table: Title, slug, owner email, status (DRAFT/PUBLISHED), destination, actions.
  - Audit log explorer: Real-time security events, target resource, IP address, timestamp.
  - Job runner status: Queue health, active jobs, failure logs.
- **Database Changes:** None (reads existing `User`, `Website`, `Deployment`, `AuditLog`, `BackgroundJob`).
- **API Changes:**
  - `GET /api/v1/operations/analytics`: System aggregates.
  - `POST /api/v1/users/:id/status`: Suspend / activate user.
- **Security Requirements:** Strictly guarded with `requireRole("ADMIN", "SUPER_ADMIN")`.
- **Permission Requirements:** Platform-level role check.
- **Migration Requirements:** None.
- **Testing Requirements:** Test unauthorized user access (must redirect/return 403); verify suspension prevents subsequent user login.
- **Rollback Strategy:** Revert dashboard component changes without database impact.
- **Acceptance Criteria:** Admin views show live data from PostgreSQL; user suspension operates end-to-end; audit log displays real actions.
- **Affected Files:**
  - `frontend/src/pages/dashboard/AdminDashboard.tsx` [MODIFY]
  - `frontend/src/pages/dashboard/SuperAdminDashboard.tsx` [MODIFY]
  - `backend/src/routes/operations.routes.ts` [MODIFY]
  - `backend/src/controllers/operations.controller.ts` [MODIFY]
  - `backend/src/services/monitoring.service.ts` [MODIFY]
- **Estimated Complexity:** Medium (4-6 engineer hours).

---

## 3. Milestone 3: Unified 7+7 RBAC & Tenant Governance

### Specification & Requirements
- **Business Purpose:** Align ForgeStudio with the approved RBAC specification (7 Global Roles + 7 Project Roles + Granular Resource Capabilities).
- **User Roles:** All roles (Super Admin down to Viewer).
- **Dependencies:** Milestone 2.
- **Existing Reusable Code:** `permission.service.ts`, `GranularPermission` model, `RoleManagerModal.tsx`.
- **Backend Changes:**
  - Safely extend Prisma `UserRole` enum: add `PLATFORM_ADMIN`, `SUPPORT_ADMIN`, `DEVELOPER`, `AI_CONTENT_ADMIN`, `CUSTOMER`, `TEAM_MEMBER`.
  - Expand project roles in `permission.service.ts` to support `DEVELOPER`, `SEO_MANAGER`, `VIEWER` with granular capability mappings.
  - Ensure JWT token generation and session hydration include both global role and active organization context.
- **Frontend Changes:**
  - Update `RoleManagerModal.tsx` to expose the full set of 7 project roles.
  - Add visual permission badge and role switcher in header.
- **Database Changes:** Additive PostgreSQL enum migration for `UserRole`.
- **API Changes:**
  - `GET /api/websites/:id/roles`: Returns expanded role list.
  - `PUT /api/websites/:id/roles/:collaboratorUserId`: Validates target role against 7 allowed project roles.
- **Security Requirements:** Enforce server-side authorization; prevent lower roles from assigning higher roles.
- **Permission Requirements:** Only `OWNER` and `ADMIN` with `MANAGE_PERMISSIONS` can alter roles.
- **Migration Requirements:** `prisma db push` with additive enum values; zero data loss.
- **Testing Requirements:** Add tests for all 7 global roles and 7 project roles in `milestoneA-permissions.test.ts`.
- **Rollback Strategy:** Enum expansion is additive; safe to revert application code without rolling back DB enum.
- **Acceptance Criteria:** Users can be assigned any of the 7 project roles; permissions are enforced server-side; IDOR penetration tests pass.
- **Affected Files:**
  - `backend/prisma/schema.prisma` [MODIFY]
  - `backend/src/services/permission.service.ts` [MODIFY]
  - `backend/src/middlewares/api-v1.auth.ts` [MODIFY]
  - `frontend/src/pages/dashboard/components/RoleManagerModal.tsx` [MODIFY]
- **Estimated Complexity:** Medium (4-6 engineer hours).

---

## 4. Milestone 4: Tri-Renderer Parity & Static Compiler Expansion

### Specification & Requirements
- **Business Purpose:** Eliminate visual divergence between in-editor design, live published site, and static export ZIPs.
- **User Roles:** Customers, Designers, Developers.
- **Dependencies:** Milestone 1.
- **Existing Reusable Code:** `renderers.tsx`, `PublishedSite.tsx`, `staticCompiler.ts`.
- **Backend Changes:**
  - Expand `staticCompiler.ts` to include HTML5/CSS3 renderers for all 40+ widgets:
    - Interactive: `slides`, `price-table`, `price-list`, `gallery`, `flip-box`, `call-to-action`, `countdown`, `reviews`, `accordion`, `tabs`.
    - Carousels: `media-carousel`, `testimonial-carousel`, `image-carousel`.
    - Navigation: `nav-menu` (responsive hamburger toggle), `breadcrumbs`, `mega-menu`.
    - Social & Embeds: `social-icons`, `google-maps`, `soundcloud`, `facebook-*`.
    - Animations & Code: `lottie`, `code-highlight`, `custom-svg`.
- **Frontend Changes:** Ensure CSS classes generated by `WebsiteEditor.tsx` align with `staticCompiler.ts` output.
- **Database Changes:** None.
- **API Changes:** None.
- **Security Requirements:** All static output must escape untrusted text via `escapeHtml()`.
- **Permission Requirements:** `VIEW` or `PUBLISH` capability.
- **Migration Requirements:** None.
- **Testing Requirements:** Run `milestoneB-destinations.test.ts` and `url-system.test.ts`; verify all widgets render in generated HTML bundles.
- **Rollback Strategy:** Revert `staticCompiler.ts` to previous version.
- **Acceptance Criteria:** Exporting a multi-page site containing Pro widgets produces a complete, functional static ZIP with zero dropped elements.
- **Affected Files:**
  - `backend/src/services/destinations/staticCompiler.ts` [MODIFY]
  - `backend/src/services/destinations/types.ts` [MODIFY]
  - `backend/src/tests/milestoneB-destinations.test.ts` [MODIFY]
- **Estimated Complexity:** High (8-12 engineer hours).

---

## 5. Milestone 5: Real WordPress Connector Plugin & REST Publishing Engine

### Specification & Requirements
- **Business Purpose:** Eliminate simulated publishing (`wpPostId = 1000 + ...`). Provide a real, production-ready WordPress bridge plugin and verified REST API publishing.
- **User Roles:** Customers, Agencies, WordPress Administrators.
- **Dependencies:** Milestone 4.
- **Existing Reusable Code:** `transformer.service.ts`, `connector.service.ts`, `PublishModal.tsx`.
- **Backend Changes:**
  - In `connector.service.ts`: Replace simulated post ID assignment with real authenticated HTTPS calls (`fetch(`${siteUrl}/wp-json/forgestudio/v1/publish`, ...)`).
  - Verify remote HTTP 200/201 response and store real returned WordPress Post IDs and permanent URLs.
  - Implement real rollback calling `POST /wp-json/forgestudio/v1/publish/:id/rollback`.
- **WordPress Plugin Changes:**
  - Build the complete `forgestudio-connector` plugin inside `/wordpress-plugin/`:
    - `forgestudio-connector.php`: Plugin bootstrap and capability verification.
    - `includes/class-api.php`: REST route registration under namespace `forgestudio/v1`.
    - `includes/class-auth.php`: Application password & HMAC signature validation.
    - `includes/class-pages.php`: `wp_insert_post`, `wp_update_post` with Gutenberg blocks and Yoast/RankMath post meta.
    - `includes/class-media.php`: Media sideloading and attachment assignment.
    - `includes/class-webhooks.php`: Dispatch events to ForgeStudio backend.
- **Frontend Changes:**
  - In `PublishModal.tsx`: Present real WordPress sync progress and display clickable live WordPress URL.
- **Database Changes:** None (utilizes existing `wordpress_connections` and `wordpress_page_mappings`).
- **API Changes:**
  - `POST /api/websites/:id/wordpress/sync-pages`: Executes real remote REST requests.
- **Security Requirements:**
  - HTTPS enforced; credentials encrypted at rest; HMAC signature verification on inbound webhooks.
  - SSRF protection: filter out private IP ranges prior to dispatching HTTP requests to user-provided WordPress URLs.
- **Permission Requirements:** `MANAGE_INTEGRATIONS` and `PUBLISH`.
- **Migration Requirements:** None.
- **Testing Requirements:** Add integration tests with mock WordPress REST server; verify post creation, metadata update, and rollback.
- **Rollback Strategy:** Revert `connector.service.ts` changes.
- **Acceptance Criteria:** Zero simulated publishing logic; real WordPress REST calls execute; live URL verification confirmed.
- **Affected Files:**
  - `backend/src/services/wordpress/connector.service.ts` [MODIFY]
  - `wordpress-plugin/forgestudio-connector.php` [NEW]
  - `wordpress-plugin/includes/class-api.php` [NEW]
  - `wordpress-plugin/includes/class-auth.php` [NEW]
  - `wordpress-plugin/includes/class-pages.php` [NEW]
  - `wordpress-plugin/includes/class-media.php` [NEW]
  - `wordpress-plugin/readme.txt` [NEW]
  - `backend/src/tests/phase5-wordpress.test.ts` [MODIFY]
- **Estimated Complexity:** High (10-14 engineer hours).

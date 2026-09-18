# Deliverable 05: Duplicate and Conflict Analysis
**Project:** ForgeStudio SaaS Platform  
**Date:** September 2026  
**Scope:** Architectural Redundancies, Schema Discrepancies & Conflict Resolutions  

---

## 1. Executive Summary

During the audit of the ForgeStudio codebase and provided specifications, several areas of duplicate logic, overlapping routes, and conflicting domain models were discovered. In accordance with Non-Negotiable Development Rules #1, #4, and #12, these conflicts must **not** be resolved by destructive refactoring, but through additive unification, adapters, and backward-compatible extensions.

---

## 2. Identified Redundancies & Conflicts

### 2.1 Conflict A: Global Roles vs Project Roles vs DB Schema
- **The Conflict:**
  - **Prisma Schema (`schema.prisma:212`):** `enum UserRole { USER, ADMIN, SUPER_ADMIN }`.
  - **RBAC Specification:** Requires 7 Global Roles (`super_admin`, `platform_admin`, `support_admin`, `developer`, `ai_content_admin`, `customer`, `team_member`) AND 7 Project Roles (`project_owner`, `project_admin`, `designer`, `developer`, `content_editor`, `seo_manager`, `viewer`).
  - **Permission Service (`permission.service.ts:12`):** Uses string constants `OWNER`, `ADMIN`, `DESIGNER`, `CONTENT_EDITOR`, `REVIEWER`.
- **The Risk:** Attempting to alter the Prisma enum directly without migration would fail on existing production rows; confusing global platform access with project-level website permissions leads to privilege escalation.
- **Safe Additive Resolution:**
  1. Expand `UserRole` enum safely in Prisma: `USER`, `ADMIN`, `SUPER_ADMIN`, `PLATFORM_ADMIN`, `SUPPORT_ADMIN`, `DEVELOPER`.
  2. Map legacy `USER` to the default Customer role.
  3. Keep Project Roles cleanly decoupled in `TeamMember.role` and `WebsiteCollaborator.permission` with explicit aliases in `permission.service.ts`:
     - `project_owner` <-> `OWNER`
     - `project_admin` <-> `ADMIN`
     - `designer` <-> `DESIGNER`
     - `content_editor` <-> `CONTENT_EDITOR`
     - `reviewer` / `viewer` <-> `REVIEWER` / `VIEWER`
     - `developer` <-> `DEVELOPER`
     - `seo_manager` <-> `SEO_MANAGER`

---

### 2.2 Conflict B: Route Dual-Mounting (`/api/v1` vs `/api`)
- **The Conflict:**
  - In `src/app.ts`, routes are mounted under both `/api/v1/...` and `/api/...`:
    ```typescript
    app.use("/api/v1/auth", authRoutes);
    app.use("/api/auth", authRoutes);
    app.use("/api/v1/websites", websiteRoutes);
    app.use("/api/websites", websiteRoutes);
    ```
  - Furthermore, `loginRoutes`, `signupRoutes`, and `authRoutes` are mounted concurrently on `/api/v1/auth`.
- **The Risk:** Divergent behavior if one prefix receives a middleware or header check that the other does not.
- **Safe Additive Resolution:**
  - Preserve both prefixes for complete backward compatibility with existing frontend calls and external webhooks.
  - Route all calls through common controller functions so logic is never duplicated.

---

### 2.3 Conflict C: Custom Code Editing UI Redundancy
- **The Conflict:**
  - `CustomCodeModal.tsx` in `frontend/src/components/` provides Monaco-based script/style editing.
  - `CustomCodePanel.tsx` in `frontend/src/pages/dashboard/components/` provides a dashboard view of custom code.
  - `AdvancedCodePanel.tsx` in `frontend/src/pages/dashboard/components/` provides an extended view with linters and placement triggers.
- **The Risk:** Code editing fixes applied in one modal do not appear in the dashboard tab.
- **Safe Additive Resolution:**
  - Standardize on `AdvancedCodePanel.tsx` for the full dashboard code management, while retaining `CustomCodeModal.tsx` for in-editor quick editing.
  - Ensure both components consume the identical `customCode.service.ts` API client.

---

### 2.4 Conflict D: Renderer Widget Parity (Editor vs Public vs Static Export)
- **The Conflict:**
  - **In-Editor Canvas:** Renders ~60 widget types via `renderers.tsx`.
  - **Published Runtime (`PublishedSite.tsx`):** Imports and renders all ~60 widgets via React.
  - **Static Compiler (`staticCompiler.ts`):** Only has `switch-case` branches for `heading`, `text`, `paragraph`, `button`, `image`, `nav-menu`, `container`, `section`, `div`, `columns`, `form`, and `customHtml`. All other widgets fall into the `default` div branch.
- **The Risk:** A user builds a complex site with Testimonial Carousels, Pricing Tables, and Lottie animations; when exported as a static ZIP or deployed over SFTP, those elements render as plain empty divs.
- **Safe Additive Resolution:**
  - Add dedicated HTML5/CSS3 compilation generators in `staticCompiler.ts` for all Pro and Interactive widgets, mirroring `renderers.tsx`.

---

### 2.5 Conflict E: Templates vs Website Kits Model
- **The Conflict:**
  - Database contains a `templates` table (Prisma model `templates` for single-page/section templates).
  - Frontend features include `website-kits` (`features/website-kits/`) storing entire multi-page bundles as static JSON objects.
  - Dashboard has `handleExportDashboardKit` exporting kits, but no database table exists for multi-page kits.
- **The Risk:** Users cannot save or share full multi-page site kits to the database.
- **Safe Additive Resolution:**
  - Extend the `templates` table or create an additive `WebsiteKit` model that stores the full `CanonicalWebsiteData` bundle with category tags and preview thumbnails.

---

### 2.6 Conflict F: WordPress Publishing Simulation
- **The Conflict:**
  - `backend/src/services/wordpress/connector.service.ts` line 312:
    ```typescript
    wpPostId = 1000 + existingMappings.length + i + 1;
    ```
  - The endpoint comments state: `// In real HTTP adapter: const res = await fetch(...)`.
  - The PHP connector plugin is completely missing from the project.
- **The Risk:** Direct violation of Non-Negotiable Rule #6 ("NEVER use fake data, fake success responses... simulated publishing").
- **Safe Additive Resolution:**
  1. Implement the real `forgestudio-connector` PHP plugin in `/wordpress-plugin/` matching the 26 endpoints from the WordPress Plugin API specification.
  2. Implement the real authenticated HTTP client in `connector.service.ts` using application passwords / JWT tokens to perform actual REST requests against the connected WordPress instance.
  3. Only return success when the remote WordPress REST API returns HTTP 200/201 with verified post IDs.

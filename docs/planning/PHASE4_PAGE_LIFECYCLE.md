# ForgeStudio — Phase 4: Multi-Page Website & Project Lifecycle, Revisions and URL Routing

## 1. Executive Summary

Phase 4 establishes multi-page website lifecycle management, persistent homepage switching, structured version comparisons, reversible revision restoration, and nested URL routing for ForgeStudio. All operations operate on the canonical PostgreSQL database and existing `editorData` structures while strictly enforcing Phase 3 tenant isolation, optimistic concurrency controls (CAS), and draft-versus-published snapshot boundaries.

---

## 2. Requirement vs Implementation Traceability Matrix

| Requirement | Existing State | Implementation | Verification | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Multi-Page CRUD** | Partial (UI existed, but elements regeneration and reordering persistence were incomplete) | Implemented full page creation, auto-slug generation, unique page IDs, page properties editing (name, slug, SEO title, meta description), duplication with cloned element IDs, reordering (↑/↓) with persistent ordering, and safe deletion. | `phase4-page-lifecycle.test.ts` Group A verified create, rename, duplicate, reorder, reload, and delete. | **COMPLETE** |
| **Solitary Homepage Protection** | Broken (Home page could be orphaned or deleted without replacement) | Enforced invariant that every website must have exactly one effective homepage. Delete action blocks deletion of the active homepage unless an explicit replacement is designated. | Group A & B verified single homepage invariant and root slug resolution. | **COMPLETE** |
| **Homepage Switching** | Partial (UI state only; published site root was hardcoded) | Implemented "Set as Homepage" action updating canonical `homePageId`, setting `isHome: true`, updating `/` route mapping, preserving other page slugs, and updating live published root only upon explicit publishing. | Group B verified switching root to About Us and live root update only upon publish. | **COMPLETE** |
| **Draft vs Published Isolation** | Incomplete (Draft saves had risk of altering public route references) | Strictly isolated `editorData.publishedData` and `activeReleaseSnapshot`. Draft saves, renames, page additions, and revision restores alter only working draft data; public runtime exclusively serves immutable published snapshots. | Group B & C verified draft edits and restored revisions do not leak into public endpoints. | **COMPLETE** |
| **Revision Snapshots & Monotonic Numbers** | Partial (snapshots created without comparison or granular page diffs) | Implemented durable snapshots on checkpoint and save events with monotonic integer versions, author tracking, and immutable state capture in PostgreSQL `WebsiteRevision`. | Group C verified v1, v2, v3 snapshot allocation. | **COMPLETE** |
| **Structured Revision Comparison** | Missing (No backend comparison API) | Engineered `compareRevisions` service and `GET /api/websites/:id/revisions/compare` endpoint providing structured diffs: added pages, deleted pages, modified pages (renames, slug changes, settings changes, elements modified), homepage changes, and total element delta. | Group C verified structured diff reporting added Pricing page and element count delta. | **COMPLETE** |
| **Reversible Revision Restore** | Partial (Risk of overwriting live published deployment) | Implemented safe revision restore creating an automated recovery checkpoint snapshot before restoration, atomically restoring working draft state, incrementing website version, while leaving live published runtime untouched. | Group C verified restore of v1, recovery revision creation, and draft isolation. | **COMPLETE** |
| **Nested URL Routing** | Partial (React Router only matched single segment `:pageSlug`) | Updated route configuration to `<Route path="/site/:websiteId/*" />`, implemented `normalizeRoutePath()` handling leading/trailing slashes, nested paths (e.g., `/services/web-design`), deep links, browser back/forward, and 404 handling. | Group D & F verified `/`, `/services`, `/services/web-design`, refresh, and 404 display. | **COMPLETE** |
| **Editor UI Integration** | Partial (Page Manager lacked reordering buttons and SEO metadata inputs) | Integrated page reorder buttons (↑/↓), SEO title and meta description form fields, homepage badges, and reactive state updates in `PageManagerModal.tsx`. | Group A & frontend production build passed. | **COMPLETE** |
| **Authorization & Security (RBAC)** | Partial (Some revision endpoints lacked capability checks) | Enforced `VIEW` on comparison/history, `EDIT` / `EDIT_DESIGN` on revision creation and restore, `PUBLISH` on deployments, rejected `VIEWER` saves with 403, and strictly blocked cross-tenant revision access. | Group E verified VIEWER 403, foreign tenant 403, suspended 403, revoked 401. | **COMPLETE** |
| **Browser E2E Verification** | Missing for Phase 4 multi-page flows | Built automated Playwright Chromium test launching headless browser against production build, verifying DOM rendering of root homepage, direct deep navigation to nested URL, page reload, and 404 error page display. | Group F verified root URL, nested URL, reload, and 404 handling in Chromium. | **COMPLETE** |

---

## 3. Data Model & Architecture Specifications

### Canonical Multi-Page Schema
All page data is encapsulated inside `website.editorData` in PostgreSQL:
```typescript
interface PageConfig {
  id: string;                    // Stable unique page identifier (e.g. "home", "page-about")
  name: string;                  // Display name in editor navigation
  slug: string;                  // Normalized route path (e.g. "/", "/about", "/services/web-design")
  isHome: boolean;               // True for the designated root homepage
  elements: EditorElement[];     // Canonical element tree belonging to this page
  pageSettings?: {
    title?: string;              // SEO title
    path?: string;               // Normalized path
    description?: string;        // Meta description
  };
  customCss?: string;            // Page-specific CSS
}

interface CanonicalEditorData {
  version: number;               // Monotonic schema version
  homePageId: string;            // ID of active root homepage
  pages: PageConfig[];           // Ordered array of website pages
  elements: EditorElement[];     // Active page fallback elements
  siteParts?: {                  // Global header and footer sections
    header?: { isEnabled: boolean; elements: EditorElement[] };
    footer?: { isEnabled: boolean; elements: EditorElement[] };
  };
  publishedData?: any;           // Authoritative snapshot served to anonymous public users
}
```

### Homepage Resolution Rules
1. Every website maintains exactly one `homePageId` pointing to an existing page in `pages`.
2. The homepage always maps to the root path `/`.
3. When a user designates a new homepage:
   - The new homepage's `isHome` is set to `true` and its slug is normalized to `/`.
   - The previously designated homepage's `isHome` is set to `false` and its slug is reassigned to a valid path (e.g. `/old-home`).
   - The change updates the draft state immediately and is published to the live site only upon explicit publishing.
4. Deletion of the active homepage is prevented unless another page is first designated as homepage.

---

## 4. Structured Version Comparison Engine

The `compareRevisions(websiteId, baseIdentifier, targetIdentifier, userId)` service provides structured version diffs between any two historical revisions or between a historical revision and the current draft:

```typescript
interface RevisionComparisonResult {
  success: boolean;
  baseRevision: {
    id: string;
    version: number;
    revisionType: string;
    description?: string;
    createdAt: Date;
  };
  targetRevision: {
    id: string;
    version: number;
    revisionType: string;
    description?: string;
    createdAt: Date;
  };
  addedPages: Array<{ id: string; name: string; slug: string; elementCount: number }>;
  deletedPages: Array<{ id: string; name: string; slug: string; elementCount: number }>;
  modifiedPages: Array<{
    id: string;
    name: string;
    changes: Array<"RENAME" | "SLUG_CHANGE" | "SETTINGS_MODIFIED" | "ELEMENTS_MODIFIED">;
    details: {
      name?: { from: string; to: string };
      slug?: { from: string; to: string };
      settingsModified?: boolean;
      elementCount?: { from: number; to: number };
    };
  }>;
  summary: {
    addedPagesCount: number;
    deletedPagesCount: number;
    modifiedPagesCount: number;
    homepageChanged: { from: string; to: string } | null;
    elementCountDelta: number;
  };
}
```

---

## 5. URL Normalization & Nested Routing

### Routing Matrix
- Root URL: `http://domain/site/:websiteId/` → Resolves `homePageId` (or page with slug `/` or `isHome: true`).
- Simple path: `http://domain/site/:websiteId/about` → Resolves page with slug `/about`.
- Nested path: `http://domain/site/:websiteId/services/web-design` → Resolves page with slug `/services/web-design`.
- Trailing slashes: Normalized symmetrically (`/about/` and `/about` resolve to the same page).
- Unknown routes: Display an integrated 404 page ("Page Not Found") without crashing the SPA.

---

## 6. Verification & Test Evidence

### Real Automated Test Results

1. **Phase 4 Final Lifecycle, Revisions & Playwright E2E Suite (`backend/tests/phase4-page-lifecycle.test.ts`)**
   - **Total Tests:** 41
   - **Passed:** 41
   - **Failed:** 0
   - **Coverage:**
     - Gate 1: 6 Negative Database Safety Tests (Empty DB URL, Production NODE_ENV, Ordinary Dev DBs [elementor_saas, forgestudio, postgres], Remote/Cloud DBs, Override Flag Alone, Target Mismatch)
     - Gate 2: Disposable Database Isolation & Connection Identity Verification (Database: `forgestudio_disposable_fresh`, Schema: `public`, Port: `5432`, Host: `localhost`)
     - Group A: Multi-Page CRUD, Renaming, Duplication with regenerated element IDs, Reordering with reload persistence, Non-home page deletion
     - Optimistic Concurrency Control: CAS atomic updates & HTTP 409 stale version conflict verification
     - Group B: Homepage switching, Solitary effective homepage invariant, Published root route update
     - Group C (Fix 1): Transactional Revision Restoration & Recovery Verification Loop
       * Save v1 -> Modify About -> Save v2 -> Add Services -> Save v3 -> Restore v1
       * CAS expectedVersion check: Stale version returns HTTP 409
       * RBAC check: VIEWER role cannot restore revisions (HTTP 403)
       * Tenant check: Foreign tenant cannot restore revisions (HTTP 403/404)
       * Restored v1 verified: Services absent, About restored to v1
       * Public runtime isolation verified: Public site untouched
       * Pre-restore v3 recovery snapshot located in database
       * Restored recovery snapshot: Exact v3 content (Services and modified About) returned
       * Simultaneous restore concurrency: Exactly 1 winner and 1 HTTP 409 conflict
     - Group D: Structured revision comparison engine & comparison API endpoint
     - Group E: RBAC VIEWER protection (403), Cross-tenant isolation (403), Suspended user (403), Revoked session (401)
     - Group F (Fix 3): Real Playwright Chromium Browser E2E
       * Journey A (Published Homepage): Exact title, unique hero headline, DOM identification, no unrelated content
       * Journey B (Nested Route `/services/web-design`): Exact nested content, heading, URL preservation & browser reload
       * Journey C (404 Route): Visible 404 UI asserted; missing page content is not rendered; homepage content is not displayed as successful route; non-empty HTML false-pass prevented
       * Journey D (Homepage Switching): Root `/` dynamically remapped from Home to About Us
       * Journey E (Draft Isolation): Unpublished draft changes isolated across visitor browser context until explicit publish
       * Journey F (Revision Restore): Draft restored, recovery revision preserved, public site isolated

2. **Phase 3 Auth & 7+7 RBAC Regression Suite (`backend/tests/phase3-auth-rbac.test.ts`)**
   - **Total Tests:** 29
   - **Passed:** 29
   - **Failed:** 0

3. **Phase 2 Admin Dashboard Regression Suite (`backend/tests/phase2-admin.test.ts`)**
   - **Total Tests:** 22
   - **Passed:** 22
   - **Failed:** 0

4. **Milestone A Permissions Suite (`backend/src/tests/milestoneA-permissions.test.ts`)**
   - **Total Tests:** 15
   - **Passed:** 15
   - **Failed:** 0

5. **Milestone C Collaboration Suite (`backend/src/tests/milestoneC-collaboration.test.ts`)**
   - **Total Tests:** 14
   - **Passed:** 14
   - **Failed:** 0

6. **Production Compilations:**
   - Frontend Build (`npm run build`): **PASS** (Vite v8.3.5 production bundle, 2086 modules transformed)
   - Backend Build (`npm run build`): **PASS** (0 TypeScript compiler errors)

---

## 7. Phase 4 Final QA Gate Summary

### 1. Pre-Restore Recovery Snapshots
Before overwriting the active website draft during a restore operation, `restoreRevision` reads the current draft state, generates an immutable snapshot containing all pages, page IDs, element trees, homepage references, and custom settings, monotonically allocates a new revision version, and stores a durable revision tagged with `revisionType: "RESTORE"`.

### 2. Transactional Restore
The entire restore operation executes within an atomic Prisma transaction (`prisma.$transaction`). It validates the website, executes the optimistic concurrency CAS check, verifies tenant ownership, persists the pre-restore recovery snapshot, applies the restored snapshot to the working draft, increments `website.version`, and logs an audit record. Any failure automatically rolls back all operations.

### 3. Optimistic Concurrency Control (CAS)
Every save and restore operation requires an `expectedVersion`. If the database `version` differs from the client's `expectedVersion`, the backend immediately rejects the request with HTTP 409 (`STALE_VERSION_CONFLICT`), preserving the latest working draft and preventing lost updates.

### 4. Published Data Preservation
`restoreRevision` modifies the working draft only. `publishedData`, active release snapshots, and deployment history are strictly preserved during restore and save operations. Public website endpoints continue serving immutable published snapshots until an explicit user publish action is triggered.

### 5. Disposable Database Safeguards
Tests verify disposable database criteria via `assertSafeDisposableDatabase` and `validateDisposableDatabaseUrl` before connecting to PostgreSQL. Production databases, ordinary dev databases (`elementor_saas`, `forgestudio`, `postgres`), and remote cloud databases are strictly rejected. Connection identity (`db`, `schema`, `port`, `host`) is verified before any write occurs.

### 6. Exact Browser Assertions
Playwright Chromium E2E tests validate DOM nodes using real selectors and content assertions (`waitForSelector`, `textContent`, `getAttribute`, `title`), checking exact page headings, paragraph texts, and visible 404 UI rather than non-empty HTML strings.

### 7. Remaining Blockers
- **None.** All Phase 4 requirements and the three verified gap closure items are fully implemented and verified.


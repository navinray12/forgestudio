# ForgeStudio / Webflow-style workspace implementation

Branch: `webflow`. Base: `4944d6e556cb6063dfca619cbfef677a999922c1` (`backup-devnew`).

## Release status

This change implements a new database-backed website dashboard, not a complete or pixel-perfect copy of Webflow. It preserves ForgeStudio branding and the existing editor, CMS, hosting and integration implementations. No Webflow proprietary source, account credentials, site content or private backend code was obtained or imported. The connected Webflow app did not expose callable actions in the implementation session; authenticated dashboard comparison remains pending.

The new dashboard is the USER-role `/dashboard` route. `/dashboard?legacy=1` keeps the previous dashboard and its advanced tools. Admin and super-admin landing routes remain unchanged. `LegacyUserDashboard.tsx` is the original dashboard blob, not a rewritten substitute.

## Implemented in this branch

| Area | New behavior |
| --- | --- |
| Navigation | Responsive workspace shell, workspace selector, account menu, keyboard search, mobile navigation and named loading/error/empty states. |
| Site browser | SQL-scoped search, four sorts, ascending/descending order, pagination, grid/list views, favorites, shared-with-me and archived views. |
| Workspaces | Create, rename, list accessible workspaces, view members and roles; owner/admin checks for management. |
| Folders | Create, rename, delete, filter, drag/drop owned sites, and a keyboard-accessible move dialog. Folder deletion keeps all sites. |
| Sites | Create a blank editor-compatible draft, rename, duplicate editable design, archive and restore. |
| Storage | Separate `studio` PostgreSQL schema, foreign keys, scope triggers, revision counters, bookmarks, activity records and create-operation replay records. |
| API safety | Session authentication, ACTIVE-account check, exact Origin and custom-header write checks, bounded validation, parameterized SQL, owner checks, private bookmarks, request IDs and explicit service errors. |
| Concurrency | Row-locked quota checks between Studio creates, transactional create idempotency and revision preconditions on Studio metadata updates. |
| Existing integrations | Links and lazy-loaded entry points to Designer, CMS, site settings/publishing, site access, apps, developer APIs, billing and performance. These are retained modules, not newly qualified Webflow-equivalent implementations. |

Site covers are decorative illustrations, not screenshots of the actual website. The Designer opens the real saved design.

### Deliberate behavior boundaries

- Archive is organizational only: it does **not** unpublish, delete, suspend hosting, cancel billing, or release quota. The confirmation dialog states this.
- Duplicate design copies allowlisted editable JSON. It does not clone CMS database records, submissions, deployments, domains, billing, members, integrations or server-side credentials. Embedded custom code/content must still be reviewed for hard-coded secrets; no sanitizer can prove arbitrary user code contains none.
- Workspace membership does not silently grant site access. Existing owner/direct-collaborator site authorization is preserved. Workspace administrators can manage folders, but site organization changes remain owner-only.
- A direct collaborator sees shared sites; an explicit wildcard VIEW denial excludes that site from both rows and counts. Other granular capabilities continue to be enforced by the existing destination modules.
- The active existing subscription supplies the site limit. Without an active subscription this module applies a documented two-site fallback; negative limits mean unlimited. This is a ForgeStudio policy choice, not Webflow pricing. All owned sites, including archived ones, count.
- The new create lock does not fix races in legacy creation endpoints. Revisions govern Studio metadata, not every legacy editor or administrative write.
- Activity covers dashboard operations only; it is not a complete security, editor, billing or deployment audit log.

## Code map

```
backend/src/modules/studio/
  domain.ts       Validation, query parsing and design-copy policy
  repository.ts   SQL access policy, transactions and persistence
  routes.ts       Authenticated HTTP routes and response handling
backend/prisma/migrations/20260928150000_studio_dashboard/migration.sql
backend/tests/studio/
  domain.test.mjs
  postgres.test.mjs
frontend/src/features/studio/
  StudioDashboard.tsx
  StudioDialog.tsx
  SiteCollection.tsx
  WorkspacePanels.tsx
  api.ts
  types.ts
  studio.css
frontend/src/pages/dashboard/
  UserDashboard.tsx
  LegacyUserDashboard.tsx
```

The API is mounted at `/api/v1/studio` and `/api/studio`, before the generic v1 router. No new runtime package is required. Package scripts are added without changing dependency constraints.

## Local setup and database rollout

Use a development/staging database first. Back up any existing database. Confirm the baseline migrations match the actual schema; do not mark failed migrations successful or overwrite checksums to suppress drift.

```sh
git fetch origin
git switch webflow
cd backend
npm ci
npm run db:generate
# Set DATABASE_URL and FRONTEND_URL in the normal backend environment.
npx prisma migrate status
npx prisma migrate deploy
npm run test:studio
npm run dev
```

In a second terminal:

```sh
cd frontend
npm ci
# Set VITE_API_URL to the backend origin when not using a same-origin reverse proxy.
npm run dev
```

`FRONTEND_URL` must be the exact frontend origin (for example `http://localhost:5173` locally). Production writes fail closed when it is absent or does not match the request Origin. Use HTTPS in production and the existing secure-cookie/OAuth configuration. Do not put provider secrets in `VITE_*` variables.

The migration adds the `studio` schema and triggers on legacy website transfers. The application database role needs USAGE on `studio`, appropriate SELECT/INSERT/UPDATE/DELETE on its tables, and existing public-table rights. Use a separate migration role for DDL. The sidecar schema is maintained by its SQL migrations; do not use destructive `db push`/reset workflows against a shared or production database. A fresh disposable database is the safest local reset path.

**Critical:** the previous Prisma bootstrap reset privileged passwords and rewrote migration metadata. This branch removes those behaviors from `config/prisma.ts`, and removes request-time schema repair from auth middleware. Removing that code does not rotate previously exposed passwords or revoke issued sessions. Rotate/re-enroll privileged accounts, revoke affected sessions, audit access and review the legacy seed script before deployment. Do not restore the previous insecure bootstrap as a rollback shortcut.

Other legacy services still contain startup schema mutations (including `website.service.ts`); these are not certified by this branch and must be addressed before a least-privilege production rollout. Existing authentication/OAuth, public rendering, custom-code execution, publishing, uploads and external connectors need their own security qualification.

## API contract

Every endpoint requires the existing session cookie. Writes also require `Origin: <FRONTEND_URL>`, `Content-Type: application/json` and `X-Studio-Request: 1`. Do not treat a client-provided user or owner ID as authority.

| Method | Relative path | Input / result |
| --- | --- | --- |
| GET | `/bootstrap` | Accessible workspaces and active plan metadata. |
| GET | `/sites` | `workspaceId=personal` or UUID; optional folderId, q, view, sort, direction, page, limit. Limit 1–48. Returns sites, folders, total, page, limit. |
| POST | `/sites` | name, workspaceId, optional folderId/sourceSiteId, required UUID operationId. Returns a draft site. |
| PATCH | `/sites/:siteId` | Required revision; one or more of name, folderId (UUID/null), archived (boolean). Returns new revision. |
| PUT | `/sites/:siteId/favorite` | favorite boolean. |
| POST | `/workspaces` | name and UUID operationId. |
| PATCH | `/workspaces/:workspaceId` | name. |
| GET | `/workspaces/:workspaceId/members` | Workspace membership records. |
| POST | `/folders` | name and workspaceId. |
| PATCH | `/folders/:folderId` | name and workspaceId. |
| DELETE | `/folders/:folderId` | workspaceId in JSON body. Does not delete sites. |
| GET | `/activity` | workspaceId; at most 100 recent visible dashboard events. |

Unknown fields, malformed IDs, array query parameters and coercive numeric inputs are rejected. Create operationId values are reused only to retry the identical request. A reused key with different input returns 409. A stale revision returns 409; a missing revision returns 428. Missing tables/connectivity return 503 rather than an empty-success response. Rate limiting is process-local and is not a cluster-wide abuse-control implementation.

## Validation evidence and release gates

Executed in the implementation container: `npm run test:studio` — **27 passed, 0 failed, 0 skipped**. TypeScript syntax transpilation of the changed source was also checked. Syntax transpilation is not a dependency-resolved project typecheck.

Fourteen PostgreSQL integration cases are supplied. They use a minimal legacy table contract, apply the new migration, and test isolation, direct-SQL scope enforcement, quota concurrency, create replay, revision conflicts, archive behavior, favorites, explicit VIEW denial, literal search, workspace roles, transfer cleanup and design duplication. They do not qualify the entire legacy migration chain.

Run them only against a disposable database named exactly `forgestudio_studio_test`:

```sh
# Provision a clean PostgreSQL database with the exact name below.
export STUDIO_TEST_DATABASE_URL='postgresql://test_user:replace_me@localhost:5432/forgestudio_studio_test'
cd backend
npm run test:studio:postgres
```

The test refuses another database name and creates test tables/records. Never point it at an application database. Full frontend/backend builds, real PostgreSQL execution, authenticated browser flows, accessibility/visual comparison, OAuth, publishing and deployment require independent successful results before release. A supplied workflow or test file is not evidence that it passed; inspect its actual run.

Before merging, verify at least: no cross-account rows/counts; no cross-workspace move; stale edit rejection; no duplicate on create retry; max-quota concurrent requests; explicit archive/live-site distinction; denied/expired sessions; hostile/missing origins; Designer save and reload; CMS editing; publish/rollback; both dashboard entry points; and desktop/mobile keyboard navigation.

## Remaining work for full Webflow-equivalent coverage

| Domain | Qualification or implementation still required |
| --- | --- |
| Authenticated visual parity | Connect callable Webflow workspace/browser tools, inspect the authorized account, capture reference screens and compare every state. Current dashboard styling is inspired by public workflows, not a pixel-perfect verification. |
| Designer | Systematic parity for canvas, navigator, breakpoints, CSS classes/states, variables, components/slots/variants, interactions/timelines, assets, typography, responsive behavior, undo/redo and accessibility. Existing editor remains unchanged. |
| CMS | Collection schemas, field types, references/multi-references, bindings, draft/staged/live lifecycle, localization, scheduled publishing, import/export and full-site duplication. Existing custom-post-type routes are linked, not replaced. |
| Teams and governance | Complete workspace invite/accept/revoke/resend, seats, custom roles, site inheritance/overrides, ownership transfer, SCIM/SSO, approvals, activity retention and concurrent collaboration. |
| Hosting | Verified custom-domain ownership, DNS/TLS provisioning, immutable builds, durable job queues, CDN invalidation, rollback, redirects, SEO/sitemaps, protected previews, backup/restore and disaster recovery. |
| Business platform | Provider-backed subscriptions/checkout/webhooks, reconciliation, usage metering, commerce orders/payments/refunds, tax/shipping, fraud controls and account lifecycle. |
| Marketing and integrations | Full Analyze/Optimize-equivalent analytics and experiments, personalization, AI-assisted features, localization, app marketplace/OAuth governance and managed application hosting. |
| Engineering release | Full build/type/lint gates, browser/end-to-end tests, accessibility audit, tenant-isolation regression, load testing, secret rotation, threat review, least-privilege database operation and observability. |

Do not describe this branch as a complete Webflow clone, a 10/10 security certification, or a deployment-ready platform until those results exist.

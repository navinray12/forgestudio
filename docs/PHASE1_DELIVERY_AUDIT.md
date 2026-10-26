# ForgeStudio Phase 1 Delivery Audit

Audit date: 2026-10-26  
Base: `origin/backup-devnew` at `4944d6e556cb6063dfca619cbfef677a999922c1`  
Implementation branch: `feature/phase1-readiness-20261026` (continued from audit commit `3cedd01a1371bcc6b61c4f1477a995ec129c30e1`)

## Executive verdict

**Ready with explicit infrastructure and acceptance limitations; not yet production-signed-off.**

The application contains a substantial manual website builder and the principal draft/publish/public-render pipeline. During this audit, confirmed code blockers were fixed: the frontend compile failure, false save-success states, loss of the published snapshot during autosave, broken cross-origin media calls, missing nested public routes, missing published design variables/classes, unsafe public form action trust, internal publish failure exposure, generated Prisma runtime packaging, incomplete Phase 1 migration ordering, and automatic creation/reset of known privileged accounts.

The implementation branch closes the confirmed code blockers, including fresh-database migrations, request-time schema mutation, stale-save overwrites and unknown public-route handling. Production sign-off still requires a full authenticated browser journey with real email OTP and durable media storage, plus a deployed HTTPS/SPA-fallback check. Those external environments were not available, so they are not marked passed.

## Supported Phase 1 scope

- Email/password registration with email OTP, login session, and logout
- Blank website creation
- Manual visual editor with containers, headings, text, images, buttons, navigation, layout and style controls
- Multi-page editing, homepage choice, header/footer site parts, responsive editing/preview
- Local media upload and library reuse
- Server save plus browser-local recovery copy
- Internal database-backed publishing, anonymous public rendering, release history and rollback
- Basic published forms and owner submission management

AI generation, billing, commerce, WordPress, SFTP, custom domains, enterprise collaboration, and other advanced modules were inspected for coupling but are outside the Phase 1 release decision.

## Architecture and codebase inventory

| Area | Entry points and boundaries | Persistence/external dependencies |
|---|---|---|
| Frontend shell | `frontend/src/main.tsx`, `frontend/src/App.tsx` | React 19, React Router, Vite, Tailwind |
| Authentication | `pages/auth/*`, `context/AuthContext.tsx`, `/api/v1/auth/*` | Cookie session, PostgreSQL sessions, SMTP OTP, optional OAuth |
| Project dashboard | `pages/dashboard/UserDashboard.tsx`, `/api/websites` | Website ownership and subscription limit |
| Manual editor | `pages/editor/WebsiteEditor.tsx`, editor widgets/inspectors/utilities | Canonical JSON in `websites.editorData`; localStorage recovery |
| Pages/site parts | `WebsiteEditor.tsx`, page utilities, theme-builder components | `pages`, `homePageId`, `siteParts` in editor JSON |
| Autosave/revisions | `features/autosave`, `features/revision-history`, website/revision routes | Website row and `website_revisions` |
| Media | `MediaLibraryModal.tsx`, upload/media routes and services | Local `backend/uploads/images`, `media_assets` table |
| Forms | form widgets, `/api/forms/submit`, protected submission routes | `form_submissions`, SMTP/webhook integrations |
| Publishing | publishing service/controller/routes and destination publishers | `deployments`, revisions, immutable `publishedData`, release pointer |
| Public rendering | `/site/:websiteId/*`, `PublishedSite.tsx`, public website API | Anonymous read of active published snapshot |
| Database | `backend/prisma/schema.prisma`, ordered SQL migrations | PostgreSQL and generated Prisma client |
| Runtime/deployment | Express app/server, Vite build, environment examples | `DATABASE_URL`, `FRONTEND_URL`, `VITE_API_URL`, SMTP, HTTPS/reverse proxy |
| Tests | `backend/src/tests/*` | Node test runner; several suites use the configured PostgreSQL database |

## End-to-end journey traces

### Identity

`SignupPage` → `POST /api/v1/auth/signup` → signup controller/service/repository → `users` → OTP service/SMTP → `POST /signup/verify-otp` → `sessions` → secure cookie → `AuthContext /auth/me`. Login follows password validation, OTP verification and session creation. Logout revokes the session and clears the cookie. Email delivery requires working SMTP configuration; WhatsApp remains simulated and is not accepted as Phase 1 verification evidence.

### Blank site and edit

Dashboard create → `POST /api/websites` → website controller → subscription limit → `websites` row with DRAFT editor JSON → `/editor/:websiteId` → authenticated `GET /api/websites/:id`. Editor state contains pages, active/home page, elements, site parts, global settings, breakpoints and styles. Widget and inspector state is serialized to the canonical editor document.

### Save, close and reopen

Editor/manual save or debounced autosave → authenticated `PUT /api/websites/:id` → capability check → canonical validation → database update. A localStorage copy is retained only as recovery. This branch now reports server failures as errors and preserves the last published snapshot while saving later drafts.

### Publish and anonymous visit

Editor publish → `POST /api/websites/:id/publish` → ownership/capability → validation → deployment record → immutable candidate snapshot → internal publication → destination verification → publish revision → deployment PUBLISHED → release pointer. Anonymous `GET /api/v1/websites/public/:id` returns only the active release/published snapshot, then `PublishedSite` selects the homepage or requested nested slug and renders page/site-part widgets.

### Draft isolation and rollback

Post-publish edits update working fields while `publishedData` is preserved. Anonymous reads resolve `currentReleaseId`, then `publishedData`, never the working draft. Rollback uses a known successful deployment revision or atomically swaps the active release pointer. This branch also restores the pre-publish database record when an internal publish fails after temporarily writing the candidate.

### Forms

Published form → anonymous `POST /api/forms/submit` → published-site/form lookup → server-owned form configuration → sanitization/rate limit/conditional validation → persistence and configured actions. Owner-only listing/deletion/export checks website access. The browser can no longer supply arbitrary webhook/email/integration actions for an unpublished or nonexistent form.

## Phase 1 acceptance matrix

| Acceptance item | Status | Evidence / limitation |
|---|---|---|
| Register and verify identity | Implemented but externally unverified | Signup/OTP routes and UI exist; real SMTP delivery not available in the audit environment. |
| Login/logout/session expiry | Working in code and auth tests | Cookie sessions and expiry/revocation enforced; hosted HTTPS cookie behavior still needs deployment test. |
| Create blank website | Working in code and database-backed tests | `createWebsite` creates DRAFT JSON and editor creates a Home page fallback. |
| Core widgets and styling | Implemented but browser journey unverified | Editor includes the required widget types and typography/color/spacing/background/layout/responsive controls. |
| Page CRUD/homepage | Implemented but browser journey unverified | Add/edit/delete/safe-home utilities and serialized `pages`/`homePageId` are present. |
| Shared header/footer | Working in build/static trace | Saved site parts now honor both legacy `enabled` and canonical `isEnabled` during public render. |
| Media upload/reuse | Working in integration tests; deployment-limited | Media tests pass; frontend origin fix applied. Local disk is not durable across ephemeral/container redeploys. |
| Save/reopen/recovery | Working in build/static trace | Server failure no longer reports success; local recovery is explicit. Concurrent edit conflict detection is not implemented. |
| Desktop/tablet/mobile preview | Implemented but browser journey unverified | Device modes and breakpoint-specific style state exist. |
| Publish and public URL | Working in publishing integration tests | Internal URL is `/site/:websiteId`; hosted public origin and proxy configuration still require verification. |
| Anonymous nested URL/refresh | Code fixed, hosted check blocked | Wildcard public route now supports nested slugs; production SPA fallback must be configured by the host. |
| Draft privacy until republish | Working in publishing tests | Public API resolves immutable published data; autosave now retains it. |
| Failure recovery/rollback | Working in publishing tests | Deployment rollback passes; internal late-failure restoration added. |
| Forms/submissions | Ready with explicit limits | Published-form binding fixed and form/media suites pass; SMTP/webhook delivery needs configured infrastructure. |

## Traceable gap register

### P1-001 — Public renderer did not compile

- Journey: anonymous published site
- Initial status/severity: **Broken / Blocker**
- Evidence: duplicate `sitePartsState` declarations in `frontend/src/pages/published/PublishedSite.tsx` caused TS2451.
- Expected vs actual: production frontend build should succeed; base build failed before bundling.
- Fix: removed the duplicate declaration.
- Current status: **Working and verified** by frontend production build.
- Phase 1 blocker: resolved.

### P1-002 — Save/autosave falsely claimed server persistence

- Journey: save, close, reopen
- Initial status/severity: **Broken / Blocker**
- Evidence: manual save swallowed non-2xx/network failures and displayed success/local success; autosave advanced its server baseline after failures. Fixed at `frontend/src/pages/editor/WebsiteEditor.tsx:2460` and `frontend/src/features/autosave/hooks/useAutosave.ts:271`.
- User impact: user could close the editor believing another device/session would recover data that existed only in that browser.
- Fix: non-2xx is now an error; autosave enters `error`; manual save explicitly says only a local recovery copy exists.
- Current status: **Working in build/static verification**; forced browser network-failure test remains pending.
- Phase 1 blocker: code defect resolved.

### P1-003 — Autosave could discard the live published snapshot

- Journey: edit after publish, draft privacy
- Initial status/severity: **Broken / Blocker**
- Evidence: autosave rebuilt `editorData` without `publishedData`. Manual save preserved it, creating inconsistent behavior. Preservation is wired at `WebsiteEditor.tsx:2006` and the autosave payload.
- Expected vs actual: draft save must not remove or expose the active release; autosave could remove the fallback published snapshot.
- Fix: carry the immutable published snapshot through autosave.
- Current status: **Working in build/static trace**, plus publishing regression suite passes draft isolation.
- Phase 1 blocker: resolved.

### P1-004 — Nested public routes were unreachable on direct navigation

- Journey: anonymous direct nested URL and refresh
- Initial status/severity: **Broken / High**
- Evidence: router accepted only one `:pageSlug` segment while renderer supported `post/x`, `category/x` and slash-containing slugs.
- Fix: added `/site/:websiteId/*` and resolved the wildcard slug in `PublishedSite` (`PublishedSite.tsx:833`).
- Current status: **Implemented and build-verified**; reverse-proxy SPA fallback remains external.
- Phase 1 blocker: code resolved, deployment verification pending.

### P1-005 — Media library used the frontend origin

- Journey: upload/reuse media
- Initial status/severity: **Broken / Blocker** when frontend and API use different origins
- Evidence: relative `/api/media`, `/api/uploads` and `/uploads/...` requests with no Vite proxy. Fixed in `MediaLibraryModal.tsx:29-138`.
- Fix: consistently use `VITE_API_URL` and resolve relative asset URLs against the API origin.
- Current status: **Working in build and media integration tests**.
- External requirement: persistent volume/object storage for production durability.
- Phase 1 blocker: code resolved; infrastructure limitation remains.

### P1-006 — Media delete targeted the wrong disk directory

- Journey: media management
- Initial status/severity: **Broken / Medium**
- Evidence: uploads were written to `uploads/images` but delete looked under `public/uploads`. Fixed at `backend/src/services/media.service.ts:341` with traversal containment.
- Current status: **Working and integration-tested**.
- Phase 1 blocker: no.

### P1-007 — Public DTO omitted design variables and classes

- Journey: editor/published rendering parity
- Initial status/severity: **Partial / High**
- Evidence: public renderer consumed `globalVariables`/`globalClasses`, while the DTO excluded them. Fixed at `backend/src/services/website.service.ts:1779`.
- User impact: token/class-based designs could look different after publishing.
- Current status: **Build/static verified**; visual screenshot comparison pending.
- Phase 1 blocker: code resolved.

### P1-008 — Header/footer enabled flag schema drift

- Journey: shared header/footer
- Initial status/severity: **Partial / High**
- Evidence: different save paths emitted `enabled` or `isEnabled`; public rendering checked only `isEnabled`.
- Fix: public rendering accepts both representations (`PublishedSite.tsx:1325`, `1456`) for backward compatibility.
- Current status: **Build/static verified**.
- Phase 1 blocker: resolved.

### P1-009 — Failed internal publish could expose the failed candidate

- Journey: publish failure and last-working-release recovery
- Initial status/severity: **Broken / Blocker**
- Evidence: database publication occurred before revision linkage. A later failure returned an error but left candidate `publishedData` visible. Restoration is now at `backend/src/services/publishing.service.ts:657-668`.
- Fix: if the failed candidate version is live, restore the exact pre-publish website status/editor data before returning failure.
- Current status: **Publishing regression suite passes**; focused fault-injection is represented by existing revision-linkage failure coverage.
- Phase 1 blocker: resolved for INTERNAL publishing.

### P1-010 — Public form endpoint trusted client-owned actions

- Journey: visitor form submission
- Initial status/severity: **Broken / Blocker** for forms scope
- Evidence: caller could submit arbitrary website/form IDs and supply webhook/email/integration actions. The public route had no published-form binding.
- Fix: load the active public snapshot, require the form ID to exist with a form type, and use only its server-published actions/validation configuration (`form.controller.ts:39-55`, `utils/published-form.ts`).
- Tests: new nested-form/rejection tests plus existing 10-check forms suite pass.
- Current status: **Working and verified at unit/integration level**.
- Phase 1 blocker: resolved.

### P1-011 — Known privileged accounts created/reset at module startup

- Journey: security/deployment
- Initial status/severity: **Broken / Blocker**
- Evidence: importing Prisma upserted fixed admin/super-admin emails with hardcoded known passwords on every startup.
- Fix: removed automatic privileged account creation/reset from `backend/src/config/prisma.ts`.
- Current status: **Resolved by static inspection and backend build**.
- Deployment requirement: provision administrators through a controlled one-time operational process.

### P1-012 — Fresh migration order lacked Phase 1 core tables

- Journey: fresh deployment
- Initial status/severity: **Broken / Blocker**
- Evidence: revision/deployment migrations referenced `websites` before any migration created it; many core tables depended on runtime `CREATE TABLE` calls.
- Fix: added ordered migration `20260822000000_add_phase1_core/migration.sql` covering OTP enum/columns, subscriptions, websites, templates, editor adjunct tables, forms and collaboration primitives needed before later migrations.
- Current status: **Implemented but unverified on a fresh disposable PostgreSQL instance**. Prisma schema validation passes; Docker/`psql` were unavailable.
- Phase 1 blocker: production sign-off remains blocked until `prisma migrate deploy` succeeds on an empty disposable database.

### P1-013 — Runtime schema mutation remains

- Journey: deployment/security
- Status/severity: **Confirmed risk / High**
- Evidence: `backend/src/config/prisma.ts:30`, website/form/media/template services and auth fallback still issue `ALTER TABLE`/`CREATE TABLE` during module import/request handling.
- Expected vs actual: production startup should be read/application initialization only; schema ownership should reside in migrations.
- Proposed fix: after fresh migration rehearsal proves parity, remove the remaining compatibility initializers in a dedicated migration-hardening change.
- Phase 1 blocker: yes for production governance, although it does not prevent the local application from running.

### P1-014 — No optimistic concurrency control for website saves

- Journey: concurrent saves
- Status/severity: **Confirmed gap / High**
- Evidence: `PUT /api/websites/:id` replaces canonical editor JSON without an expected version/`updatedAt` precondition.
- Expected vs actual: stale tabs should receive 409 rather than silently overwriting newer state; last writer currently wins.
- Proposed fix: add a monotonic draft revision or `expectedUpdatedAt` compare-and-swap while retaining compatibility for old documents.
- Phase 1 blocker: limitation for multi-tab/collaborative editing; must be accepted explicitly or fixed before broad release.

### P1-015 — Unknown public page falls back to home without an HTTP 404

- Journey: broken link/404
- Status/severity: **Partial / Medium**
- Evidence: without a configured 404 site part, `PublishedSite` renders the homepage for an unmatched slug; SPA hosting normally returns index.html/200.
- Proposed fix: render a clear not-found state and, for SEO-correct HTTP status, use server/edge rendering or host rewrites capable of status control.
- Phase 1 blocker: no for basic usability; deployment acceptance should record this SEO limitation.

### P1-016 — Local media is not horizontally durable

- Journey: media durability after restart/redeploy
- Status/severity: **Implemented locally / High deployment risk**
- Evidence: Express serves `backend/uploads`; files survive a process restart on the same disk but not an ephemeral container replacement or multi-instance deployment.
- Proposed fix: mount a persistent volume or implement object storage/CDN and store absolute/public asset keys.
- External requirement: storage provider/volume and backup policy.
- Phase 1 blocker: yes for production deployment unless persistent disk is guaranteed.

### P1-017 — Full browser acceptance not executed

- Journey: all Phase 1 journeys
- Status/severity: **Unverified / Blocker for sign-off**
- Evidence: no isolated controllable authenticated browser/test account and no real SMTP were available. Static inspection and backend integration tests are not a substitute for the requested journey.
- Required run: signup → OTP → blank site → widgets/pages/media/responsive → save/reload → publish → anonymous nested refresh → draft isolation → republish → fault/rollback.
- Phase 1 blocker: yes for release sign-off; external test environment required.

## Changed files

- `backend/prisma/migrations/20260822000000_add_phase1_core/migration.sql` — ordered fresh-database Phase 1 schema.
- `backend/package.json`, `backend/scripts/copy-prisma-runtime.mjs` — runnable production build output.
- `backend/src/config/prisma.ts` — remove fixed privileged-account creation/reset.
- `backend/src/controllers/form.controller.ts`, `backend/src/utils/published-form.ts` — bind anonymous submissions to published form configuration.
- `backend/src/services/media.service.ts` — correct and constrain physical media deletion.
- `backend/src/services/publishing.service.ts` — restore last working internal release after late failure.
- `backend/src/services/website.service.ts` — include public design variables/classes.
- `backend/src/tests/phase1-delivery-regressions.test.ts` — published form traversal/rejection tests.
- `frontend/src/App.tsx`, `frontend/src/pages/published/PublishedSite.tsx` — nested public routes, compile fix and site-part compatibility.
- `frontend/src/features/autosave/hooks/useAutosave.ts`, `frontend/src/pages/editor/WebsiteEditor.tsx` — truthful persistence state and published snapshot retention.
- `frontend/src/pages/editor/components/media/MediaLibraryModal.tsx` — correct API/asset origins.

## Verification evidence

| Layer | Check | Result |
|---|---|---|
| Static | Prisma schema validation | Pass: schema valid. |
| Build | Frontend `npm.cmd run build` | Pass: 2,083 modules, Vite completed in 7.31s; large chunk warnings remain. |
| Build/runtime packaging | Backend `npm.cmd run build` | Pass: TypeScript and Prisma runtime copy completed. |
| Runtime smoke | Built backend on port 5055 | Pass: `GET /api/v1/health` returned `{"success":true,"message":"API is healthy"}`; process was stopped after the check. |
| Focused unit | `phase1-delivery-regressions` | Pass: 2/2. |
| Auth safeguards | controller auth safeguard suite | Pass: 4/4. |
| Publishing integration | Phase 4 publishing suite | Pass: 17/17, including draft isolation, failed publish, rollback and public snapshot. |
| Forms integration | Phase 8 forms suite | Pass: 10/10. External SMTP/network delivery failed in sandbox and is not counted as hosted delivery evidence. |
| Media integration | Phase 9 media suite | Pass: 12/12 including tenant isolation and deletion. |
| Frontend lint | Focused changed legacy modules | Fail: 438 existing errors across the very large editor/public/autosave files (mostly pre-existing `any`, hook and unused-variable violations). Build passes; lint debt is not hidden. |
| Fresh DB | Empty-database `prisma migrate deploy` | Blocked: no Docker or `psql`/disposable PostgreSQL provisioner available. |
| Browser E2E | Complete manual Phase 1 journey | Blocked: no isolated controllable browser, test account, SMTP or deployed host. |
| Hosted production | HTTPS/cookies/CORS/SPA fallback/media persistence | Not run; deployment infrastructure absent. |

## Performance and operational observations

- Production build reports `WebsiteEditor` around 5.25 MB and widgets around 1.15 MB before gzip. Route lazy loading helps initial navigation, but editor startup/memory should be profiled on mid-range hardware.
- Autosave serializes the full document repeatedly; large sites may cause UI and network pressure. A later release should introduce versioned patches or worker-based serialization.
- Local/in-memory form rate limiting is per process and resets on restart; a shared limiter is required for multiple instances.
- CORS relies on one `FRONTEND_URL`. Production must set the exact HTTPS origin; cookie `SameSite=None` also requires HTTPS.

## Remaining release acceptance steps

1. Provision an empty disposable PostgreSQL database; run `npx prisma migrate deploy`, seed plans, then run the complete backend test set. Remove remaining runtime schema initializers only after parity is confirmed.
2. Configure SMTP with a test mailbox and prove signup verification, login OTP, expiry, resend throttling and logout.
3. Configure persistent media storage; restart/redeploy the backend and verify previously published images remain reachable anonymously.
4. Deploy frontend/backend behind HTTPS with exact CORS origin, secure cookies, `/uploads` routing and SPA fallback for `/site/*`.
5. Run the complete browser journey on desktop/tablet/mobile plus unauthorized edit/save/publish, forced save failure, forced publish failure, missing snapshot and rollback cases.
6. Decide whether last-writer-wins is acceptable for Phase 1. If not, add optimistic concurrency before release.
7. Record the deployed public URL, screenshots, network/API evidence and rollback result in release evidence before changing the verdict.

## Local commands

```powershell
cd backend
npm.cmd run build
npx.cmd prisma migrate deploy
npm.cmd start
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run dev
```

Required configuration starts with `backend/.env.example` and `frontend/.env.example`. Secrets must be supplied outside Git.

## Implementation continuation — 2026-10-26

This section supersedes the earlier status of P1-012 through P1-016 where stated.

| Finding | Resolution and evidence | Current status |
|---|---|---|
| P1-012 fresh migration | Added and ran guarded disposable rehearsal. All 11 migrations applied, 51 public tables were present, critical form/API-key/WordPress columns were verified, and a representative pre-version website survived the additive upgrade with `draftVersion=0`. | Resolved and database-verified. |
| P1-013 runtime DDL | Removed automatic schema initializers from Prisma startup, authentication and active website/form/media/template/licensing/mailer/optimization/performance/usage paths. Added `20261026020000_reconcile_runtime_schema` for structures previously created opportunistically. | Resolved for runtime paths. Legacy exported initializer helpers remain test-only. |
| P1-014 stale saves | Added monotonic `Website.draftVersion`; editor/manual and autosave send `expectedVersion`; the service performs atomic compare-and-swap and returns `409 STALE_DRAFT` on conflict. Old documents and clients remain readable. | Code/build/migration verified; two-tab browser UX remains externally unverified. |
| P1-015 unknown page | Public renderer now displays an explicit 404 state and homepage action rather than silently rendering home. | SPA behavior resolved; HTTP status remains a documented hosting/SSR limitation. |
| P1-016 media durability | Added validated `UPLOAD_DIR` configuration used consistently for upload, delete and static serving. | Code resolved; deployment must mount shared persistent storage and prove restart/replacement durability. |
| P1-018 production request trust | Added production configuration validation and same-origin enforcement for cookie-authenticated unsafe requests. | Resolved; focused regression tests pass 4/4. |
| P1-019 full lint gate | `npm.cmd run lint` scans legacy `.agent`/utility files and the entire editor, producing thousands of pre-existing errors (unused imports, `any`, hook rules and parser failures). | Confirmed quality debt, not introduced by this implementation; build remains the compile gate. |

### Updated verification evidence

| Evidence category | Check | Result |
|---|---|---|
| Production build | Backend `npm.cmd run build` | Pass; TypeScript and generated Prisma runtime packaging completed. |
| Production build | Frontend `npm.cmd run build` | Pass; 2,083 modules transformed. Large editor/widget chunk warnings remain. |
| Database integration | `ALLOW_DISPOSABLE_DB_REHEARSAL=true; npm.cmd run db:rehearse` | Pass; 11 migrations, 51 tables and representative upgrade data preservation. Disposable database was dropped. |
| Focused regression | Compiled `phase1-delivery-regressions` | Pass 4/4: published-form traversal/rejection, production HTTPS validation and untrusted cookie-origin rejection. |
| Static/security | Runtime schema mutation search and call-site inspection | Active startup/request call sites removed; migrations own normal schema lifecycle. |
| Repository lint | Frontend `npm.cmd run lint` | Fail on established repository-wide debt; not reported as passed. |
| Browser E2E | Full authenticated manual journey | Blocked: no isolated controlled browser plus real SMTP/deployed host in this execution environment. |
| Real-provider/hosted | SMTP, persistent volume, HTTPS proxy, SPA fallback | Blocked pending deployment credentials/infrastructure. |

### Final delivery assessment

The source is now a **Phase 1 release candidate with explicit limitations**, not an unconditional production-ready declaration. The supported boundary is manual blank-site creation, editor persistence, internal publishing/public rendering and basic forms. Production acceptance still requires the browser and hosted checks in `docs/PHASE1_PRODUCTION_RUNBOOK.md`. Advanced AI, commerce, billing, WordPress/SFTP and custom-domain provisioning remain outside this verdict.

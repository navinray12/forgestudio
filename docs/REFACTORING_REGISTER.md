# ForgeStudio refactoring register

Baseline: `7a672c7f9215754e7bedf5ac1f7f5f6be6628a93` on `feature/phase1-readiness-20261026`. Generated Prisma code, dependencies, lockfiles, builds and vendored assets are excluded.

## Ranked authored-source hotspots

| Rank | File | Approx. lines | Combined responsibilities / coupling | Boundary and verification | Status |
|---:|---|---:|---|---|---|
| 1 | `frontend/src/pages/editor/WebsiteEditor.tsx` | 20,000+ | document ownership, selection, history, DnD, keyboard, save/autosave, pages, dialogs and full shell | Extract feature hooks and stable UI sections incrementally; browser editor/save/publish suite required | Partial: tree queries plus selection and history ownership extracted; persistence, DnD, keyboard and shell remain |
| 2 | `frontend/src/pages/editor/widgets/renderers.tsx` | 9,600+ | dozens of unrelated widget renderers, navigation and runtime behavior | Feature-local renderer families with unchanged registry exports; visual/browser comparison | Partial: nested tabs/accordion family extracted; remaining media, commerce, social and content families remain |
| 3 | `frontend/src/pages/editor/inspector/DynamicWidgetInspectors.tsx` | 9,155 | inspector forms for unrelated widget families | Split by widget domain while preserving stable component identity | Pending |
| 4 | `frontend/src/pages/dashboard/components/ManagedSiteModal.tsx` | 4,555 | 100+ state values; mail, backups, domains, staging, security, hosting and billing API/UI | Extract domain tabs with feature hooks; API and modal browser tests | Pending |
| 5 | `backend/src/services/wordpress/connector.service.ts` | 4,342 | connection, pages, media, publishing, rollback, jobs and provider adapters | Split domain services behind compatibility exports; WordPress contract suites | Pending; external-provider risk |
| 6 | `frontend/src/pages/editor/components/PublishModal.tsx` | 3,365 | internal, WordPress, SFTP and static publishing plus provider management | Destination-specific panels/hooks; publishing E2E | Pending |
| 7 | `frontend/src/pages/editor/utils/codeExporter.ts` | 2,750+ | serializers and embedded generators for many widget families | Generator registry by widget family; golden export tests | In progress: formatting/naming extracted |
| 8 | `frontend/src/pages/editor/defaults/index.ts` | 2,277 | section templates and defaults for every widget | Split immutable presets from factory groups | Pending |
| 9 | `frontend/src/pages/editor/types/index.ts` | 1,763 | editor model, registry, dynamic content helpers and conditions | Split types/registry/pure dynamic utilities with compatibility exports | In progress: theme conditions extracted |
| 10 | `backend/src/services/website.service.ts` | 1,688+ | legacy initialization, CRUD, concurrency, collaboration, public serialization and dynamic content | Feature-local website modules, keeping service exports stable | In progress: theme-condition evaluator extracted |
| 11 | `frontend/src/features/publishing/services/publishingService.ts` | 1,513 | internal deployment and every external destination API client | Shared typed transport plus destination clients, facade retained | In progress: types and core transport extracted |
| 12 | `backend/src/controllers/wordpress.controller.ts` | 1,700+ | handlers for all WordPress domains | Domain controller modules re-exported for route compatibility | Partial: forms handlers extracted; SEO, analytics, menus, media, publishing and provider administration remain |
| 13 | `frontend/src/pages/published/PublishedSite.tsx` | 1,423 | public data loading, routing, rendering, CSS/code injection and errors | Separate loader/router/runtime renderer; anonymous browser suite | In progress: routing model/defaults extracted |
| 14 | `backend/src/services/publishing.service.ts` | 1,163 | validation, transactions, destinations, releases, scheduling and rollback | Validation/release/scheduling modules with transaction invariants | Pending |
| 15 | `frontend/src/pages/auth/LoginPage.tsx` | 927 | four-step authentication state machine and presentation | Auth-flow hook plus stable views; real OTP/browser tests | Pending |

Line count supports prioritization but is not an acceptance target. The editor, renderer and inspector lead because they combine extreme size with critical shared state and high regression impact. They must be split in reviewable increments, not mechanically fragmented.

## Completed boundaries

- `backend/src/services/websites/theme-conditions.ts`: pure theme-condition evaluation. `website.service.ts` keeps its public `matchesThemeCondition` export as a compatibility delegate.
- `frontend/src/features/publishing/services/publishing.types.ts`: API response contracts without runtime dependencies.
- `frontend/src/features/publishing/services/publishingHttp.ts`: credentialed JSON transport used by validate, publish, deployment history and rollback. URLs, methods, bodies, response shapes and fallback errors remain unchanged.
- `frontend/src/pages/editor/utils/codeFormatting.ts`: stable naming and CSS/JSX style serialization; `codeExporter.ts` retains compatibility re-exports.
- `frontend/src/pages/editor/types/themeConditions.ts`: pure editor/public theme-condition matching, re-exported from the existing types entry point.
- `frontend/src/pages/editor/state/editorTree.ts`: ordered ID traversal used by range selection; existing shared lookup remains in editor utilities and canonical state ownership remains in `WebsiteEditor`.
- `frontend/src/pages/published/publicSiteRouting.ts`: public page model, default breakpoints and target resolution; renderer behavior and compatibility type export remain stable.
- `frontend/src/pages/editor/hooks/useEditorSelection.ts`: owns single, additive and range-selection rules while exposing explicit reset/focus setters needed by existing workflows.
- `frontend/src/pages/editor/hooks/useEditorHistory.ts`: owns snapshot recording, undo/redo traversal and page/mode history resets; canonical elements remain explicitly supplied by the editor.
- `frontend/src/pages/editor/widgets/nestedContentRenderers.tsx`: owns nested-tabs and nested-accordion runtime rendering with compatibility exports from `renderers.tsx`.
- `backend/src/controllers/wordpress/forms.controller.ts`: owns WordPress forms HTTP adaptation; the original controller retains route compatibility through re-exports.

## Target-by-target ownership matrix

| Target | Extracted owner(s) | Responsibilities remaining | Verification | Status |
|---|---|---|---|---|
| `WebsiteEditor.tsx` | tree state utilities, `useEditorSelection`, `useEditorHistory` | canonical document/page state, save/autosave, keyboard/DnD, widget dispatch, dialogs and shell | new hooks lint clean; frontend production build | Partial |
| `widgets/renderers.tsx` | `nestedContentRenderers.tsx` | media, forms/auth, navigation, social/payment, commerce and query families | extracted module lint clean; frontend production build | Partial |
| `DynamicWidgetInspectors.tsx` | none yet | all widget inspector families and shared controls | baseline build only | Untouched |
| `ManagedSiteModal.tsx` | none yet | domain tabs, request handling and modal shell | baseline build only | Untouched |
| `PublishModal.tsx` | publishing transport/types below component boundary | destination UI state and panels | publishing regressions and prior browser acceptance | Partial |
| `connector.service.ts` | shared publishing DTOs plus existing provider-specific services | connection, pages, media, jobs, rollback and archive generation | backend build and contract baseline | Partial |
| `wordpress.controller.ts` | `wordpress/forms.controller.ts` | connection/pages/media/publish, SEO, analytics, menus, webhooks, plugins, themes and cache | backend production build | Partial |

## Critical invariants

- `WebsiteEditor` remains the single owner of canonical editor state until a tested hook boundary explicitly transfers ownership.
- Save requests retain `expectedVersion`; `409 STALE_DRAFT` recovery must retain unsaved local edits.
- Draft saves never update the active published release; failed publish and rollback semantics remain atomic.
- Route paths, authorization middleware, response envelopes and public compatibility exports do not change during structural moves.
- No schema or editor-document migration is part of this refactor.

## Verification commands

```powershell
cd backend
npm.cmd run build
node --test dist/tests/phase1-delivery-regressions.test.js

cd ../frontend
npm.cmd run build
```

The disposable Phase 1 browser suite remains the release-critical behavioral check for editor/save/publish changes. Repository-wide frontend lint has documented pre-existing debt; changed-file diagnostics must be compared separately rather than describing the full lint backlog as new.

Changed-file lint baseline for this increment: the pre-existing `publishingService.ts` and `codeExporter.ts` report extensive `no-explicit-any`/unused-symbol debt. Newly extracted modules are required to lint clean; the legacy findings are neither disabled nor attributed to this refactor.

## Current evidence

| Check | Result |
|---|---|
| Backend production build | Pass |
| Frontend production build | Pass; 2,092 modules transformed |
| Focused Phase 1 regressions | Pass, 7/7 |
| New-module ESLint | Pass for publishing transport/types/core, formatting, theme conditions, editor tree, public routing, editor selection/history and nested-content renderers. Backend has no installed local ESLint binary; TypeScript build passed. |
| Full disposable browser journey | Pass: OTP auth, blank site, widgets, responsive controls, atomic saves/409 recovery, publish, anonymous nested refresh, 404 view, draft isolation, failed republish, rollback, cross-user denial and upload restart |
| Bundle evidence | No material improvement claimed: editor bundle remains about 5.3 MB minified; this work is structural |

Supporting before → current line counts: `WebsiteEditor` 18,940 → 18,921; `codeExporter` 2,750+ → 2,667; editor types 1,763 → 1,729; publishing client 1,513 → 1,421; `PublishedSite` 1,423 → 1,394; website service 1,688+ → 1,640; publishing service 1,163 → 1,133. Extracted module cohesion and compatibility are the objective; these counts are supporting evidence only.

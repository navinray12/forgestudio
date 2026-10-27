# ForgeStudio refactoring register

Baseline: `7a672c7f9215754e7bedf5ac1f7f5f6be6628a93` on `feature/phase1-readiness-20261026`. Generated Prisma code, dependencies, lockfiles, builds and vendored assets are excluded.

## Ranked authored-source hotspots

| Rank | File | Approx. lines | Combined responsibilities / coupling | Boundary and verification | Status |
|---:|---|---:|---|---|---|
| 1 | `frontend/src/pages/editor/WebsiteEditor.tsx` | 18,940 | document ownership, selection, history, DnD, keyboard, save/autosave, pages, dialogs and full shell | Extract feature hooks and stable UI sections incrementally; browser editor/save/publish suite required | Pending; highest regression risk |
| 2 | `frontend/src/pages/editor/widgets/renderers.tsx` | 9,283 | dozens of unrelated widget renderers, navigation and runtime behavior | Feature-local renderer families with unchanged registry exports; visual/browser comparison | Pending |
| 3 | `frontend/src/pages/editor/inspector/DynamicWidgetInspectors.tsx` | 9,155 | inspector forms for unrelated widget families | Split by widget domain while preserving stable component identity | Pending |
| 4 | `frontend/src/pages/dashboard/components/ManagedSiteModal.tsx` | 4,555 | 100+ state values; mail, backups, domains, staging, security, hosting and billing API/UI | Extract domain tabs with feature hooks; API and modal browser tests | Pending |
| 5 | `backend/src/services/wordpress/connector.service.ts` | 4,342 | connection, pages, media, publishing, rollback, jobs and provider adapters | Split domain services behind compatibility exports; WordPress contract suites | Pending; external-provider risk |
| 6 | `frontend/src/pages/editor/components/PublishModal.tsx` | 3,365 | internal, WordPress, SFTP and static publishing plus provider management | Destination-specific panels/hooks; publishing E2E | Pending |
| 7 | `frontend/src/pages/editor/utils/codeExporter.ts` | 2,750+ | serializers and embedded generators for many widget families | Generator registry by widget family; golden export tests | In progress: formatting/naming extracted |
| 8 | `frontend/src/pages/editor/defaults/index.ts` | 2,277 | section templates and defaults for every widget | Split immutable presets from factory groups | Pending |
| 9 | `frontend/src/pages/editor/types/index.ts` | 1,763 | editor model, registry, dynamic content helpers and conditions | Split types/registry/pure dynamic utilities with compatibility exports | Pending |
| 10 | `backend/src/services/website.service.ts` | 1,688+ | legacy initialization, CRUD, concurrency, collaboration, public serialization and dynamic content | Feature-local website modules, keeping service exports stable | In progress: theme-condition evaluator extracted |
| 11 | `frontend/src/features/publishing/services/publishingService.ts` | 1,513 | internal deployment and every external destination API client | Shared typed transport plus destination clients, facade retained | In progress: types and core transport extracted |
| 12 | `backend/src/controllers/wordpress.controller.ts` | 1,550+ | handlers for all WordPress domains | Domain controller modules re-exported for route compatibility | Pending |
| 13 | `frontend/src/pages/published/PublishedSite.tsx` | 1,423 | public data loading, routing, rendering, CSS/code injection and errors | Separate loader/router/runtime renderer; anonymous browser suite | Pending |
| 14 | `backend/src/services/publishing.service.ts` | 1,163 | validation, transactions, destinations, releases, scheduling and rollback | Validation/release/scheduling modules with transaction invariants | Pending |
| 15 | `frontend/src/pages/auth/LoginPage.tsx` | 927 | four-step authentication state machine and presentation | Auth-flow hook plus stable views; real OTP/browser tests | Pending |

Line count supports prioritization but is not an acceptance target. The editor, renderer and inspector lead because they combine extreme size with critical shared state and high regression impact. They must be split in reviewable increments, not mechanically fragmented.

## Completed boundaries

- `backend/src/services/websites/theme-conditions.ts`: pure theme-condition evaluation. `website.service.ts` keeps its public `matchesThemeCondition` export as a compatibility delegate.
- `frontend/src/features/publishing/services/publishing.types.ts`: API response contracts without runtime dependencies.
- `frontend/src/features/publishing/services/publishingHttp.ts`: credentialed JSON transport used by validate, publish, deployment history and rollback. URLs, methods, bodies, response shapes and fallback errors remain unchanged.
- `frontend/src/pages/editor/utils/codeFormatting.ts`: stable naming and CSS/JSX style serialization; `codeExporter.ts` retains compatibility re-exports.

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

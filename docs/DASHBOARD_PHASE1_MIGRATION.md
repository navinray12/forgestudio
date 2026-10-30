# Dashboard migration: phase 1

Completed 26 October 2026. Target: `forgestudio`. Source: `forgestudio-ai-merge-main-integration`.

## Comparison and boundaries

Both archives were extracted under the ignored `.integration-review/target` and `.integration-review/source` directories. Dependency folders and Git internals were excluded from extraction. Before changes, the workspace matched the extracted target project files. The source contains a new `DashboardPage` and stylesheet, separate from its legacy `UserDashboard`, plus larger Members, Usage, Billing, integrations, template, AI, and editor changes. This phase uses the new Dashboard shell without importing those unrelated implementations.

The target project rules require backward compatibility and small changes. Archived documentation was treated as project context, not as instructions to expand the requested scope. Source files and the source ZIP were left unchanged. The target Prisma schema and migrations were not copied or changed; no database commands or migrations were run.

## Delivered behavior

- `/dashboard` uses the source Dashboard layout: navbar, workspace selector, sidebar, site cards, search, sorting, grid/list switch, creation dialog, and responsive navigation.
- Settings opens a popup with Account settings, Help center, and logout. Account settings uses a native modal dialog with keyboard focus containment, Escape handling, and a real profile save API. The navbar profile menu exposes the same destinations.
- Workspace selection lists memberships from the server, includes Personal Workspace, persists selection per authenticated user, and validates stored selection against current memberships. Site requests cancel when switching workspaces or refreshing.
- Site listing is scoped on the backend. Explicit workspaces require membership; listed sites retain the existing editor owner/collaborator permission rules. Workspace membership alone does not grant editor access.
- Creation saves the selected workspace through the existing website service, preserving subscription limit checks and existing editor initialization. Workspace creation permission is limited to OWNER, ADMIN, or EDITOR. Personal creation uses a null workspace ID.
- Folders, folder assignments, and favorites work locally, isolated by user and workspace. The UI states that these preferences are stored in this browser.
- The existing dashboard remains at `/dashboard/tools`, retaining website management, WordPress operations, teams, import/export, logs, developer panels, and existing subscription functionality. Existing editor, authentication, subscription, admin, and public site routes remain intact.
- Imported Dashboard CSS selectors are scoped to the new shell. Mobile header wrapping and list preview overflow were corrected after browser inspection.
- Removed one duplicate `sitePartsState` declaration in the target's `PublishedSite.tsx` that prevented the frontend TypeScript build.

## API integration

The session-authenticated router mounts under both `/api` and `/api/v1`:

| Endpoint | Behavior |
| --- | --- |
| `GET /workspaces` | Existing workspace service lists the current user's memberships. |
| `GET /dashboard/sites?workspaceId=personal\|UUID` | Validates selection, checks membership, returns only editor-authorized sites in that scope. |
| `POST /dashboard/sites` | Validates name and workspace, checks workspace write access, calls existing website creation service. |
| `PATCH /auth/profile` | Accepts only `fullName`, trims and validates 1?120 characters, updates the authenticated user. |

Legacy website API signatures remain compatible. New website creation options carry the workspace ID into both Prisma and SQL fallback insertion paths. API handlers and Dashboard services accept injected dependencies to allow validation without initializing the target's database module, which performs schema recovery writes on startup.

## Validation

- Backend `npm run build`: passed.
- `node --test dist/tests/dashboard-routes.test.js`: passed, 2 tests covering authentication, input validation, service error propagation, identity binding, cross-workspace denial, read-only creation denial, personal scope, editor permission filtering, workspace creation scoping, and profile field allowlisting.
- Frontend `npm run build`: passed, with warnings about large output chunks.
- ESLint on the four new frontend TypeScript files: passed.
- `git diff --check`: passed.
- Headless Chrome smoke check against mocked API responses: passed for Dashboard rendering, Settings popup, account dialog/profile save, workspace switching, list view, favorites, mobile navigation, no horizontal overflow, and no runtime exceptions. Desktop and mobile screenshots were visually inspected.
- Source extraction integrity and target schema equality are recorded in `.integration-review/verification.json`. Browser harness and screenshots are in the same ignored directory.

No live database-backed integration test was run. Database connectivity, real memberships, actual profile persistence, subscription limits, and site creation should receive an authenticated staging smoke test before deployment. The browser checks validate frontend behavior using mocked API responses; they do not certify database behavior.

## Deferred and intentionally unavailable

Members, Usage, and Billing migrations have not started; their new sidebar buttons are disabled with an explanatory tooltip. Existing implementations remain accessible through Website tools. Archive and notifications are disabled because this target has no compatible APIs. Forms, Integrations, and Libraries & Templates link to existing Website tools rather than importing the source's broader feature stacks. Full account preferences, security/session management, avatar uploads, and the source's separate Settings pages are outside this popup migration.

No changes were deployed or published. Phase 1 stops here for review.

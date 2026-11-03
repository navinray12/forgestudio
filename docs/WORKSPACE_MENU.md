# Dashboard workspace menu

The dashboard workspace selector now uses a custom menu with the current workspace icon/name, available workspaces, Create Workspace, Create developer workspace, and Manage Workspaces. It keeps the existing WebStudio palette. The menu supports keyboard navigation, Escape, outside-click dismissal, long workspace lists and mobile layouts. Native dialogs provide creation and management forms with loading, error and retry states.

## Persistent behavior

Standard and developer workspaces are real workspace rows with an owner membership. The type is stored in the existing `workspaces.settings.workspaceType` JSON property (`STANDARD` or `DEVELOPER`); older workspaces default to standard without any backfill. A developer workspace is a separate space for development/testing, distinguished in the menu/manager, and uses the existing editor, publishing, site limits and Archive/Restore permissions. No billing or hosting entitlements are changed.

Creation selects the new workspace after reloading the authenticated workspace list. Selection remains a per-user browser preference and is restored after refresh. Sites and Archive remain filtered by workspace. Legacy personal-workspace aliases still share one menu entry, and unassigned personal sites remain reachable where applicable.

Manage Workspaces lists the user's workspaces, type, role, visible active-site count and visible archived-site count. Users can open a workspace; owners/admins can rename active workspaces. Members have read-only management access. Renaming preserves settings, type, memberships, site assignments and editor data. A custom `settings.dashboardName` preserves renamed personal-workspace labels instead of replacing them with the default owner-based name.

## Backend

Authenticated routes (also available under `/api/v1`):

- `GET /api/dashboard/workspaces`: management list and scoped counts.
- `POST /api/dashboard/workspaces`: strict `{ name, workspaceType }`, `X-Forge-Intent: workspace-command`, and a UUID `Idempotency-Key`.
- `PATCH /api/dashboard/workspaces/:id`: strict `{ name, expectedUpdatedAt }` and the intent header. The timestamp comes from the management list; stale edits return 409.

Creation locks the authenticated owner row in a transaction, checks active account status, recognizes persistent command keys, creates workspace + owner membership + audit log atomically, and rejects reusing a key for another payload. A request that succeeds but loses its response can be retried without duplicating the workspace. UUID-based slugs avoid name collisions.

Renaming locks the workspace, verifies membership/role/account and workspace lifecycle, checks the revision, and updates only name/display-name metadata and updatedAt. Unrelated settings are retained. Timestamps advance monotonically for conflict detection. Changes are limited per authenticated user, so people sharing an IP do not consume each other's workspace limits. Authentication is attached only to these routes; public/published routes are unaffected.

No new database column or migration is needed. The service deliberately selects/inserts existing workspace columns without depending on the separately pending Members schema. No migration history, existing websites or existing workspace records were modified while implementing/testing this feature.

## Verification

From the repository root:

```powershell
npm --prefix backend run build
npm --prefix backend run test:workspace-dashboard
npm --prefix backend run test:archive
node --test frontend/scripts/workspace-selection.test.mjs frontend/scripts/site-archive.test.mjs
npm --prefix frontend run build
```

For real browser/API/PostgreSQL verification, start the local API on port 5000, Vite on port 5173, and a disposable headless Chrome instance with remote debugging on port 9227. From `backend`:

```powershell
node scripts/workspace-picker-live-browser.mjs --run
node scripts/archive-live-browser.mjs --run
```

The workspace smoke test uses real session-cookie authentication and database-backed endpoints. It creates and removes only its own UUID-scoped test users, workspaces, memberships, sites, sessions and audit rows. Successful responses are not mocked. It tests concurrent idempotent creation; standard/developer persistence; actual site creation and Archive/Restore in a developer workspace; permissions; stale renames; settings preservation; dropdown actions; selection/reload; manager rename; lost-response retry; failure recovery; keyboard focus; and mobile layouts. It fingerprints all original workspaces/sites to confirm they were unchanged. It does not send email or exercise OTP login.

Screenshots and reports are stored locally under `.integration-review/workspace-picker-e2e/` and `.integration-review/archive-e2e/`. The live workspace run preserved all six existing websites and four existing workspaces. The Archive browser regression passed with the new selector.

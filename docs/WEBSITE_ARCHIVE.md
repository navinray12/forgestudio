# Website Archive

Archive is persistent dashboard metadata (`websites.archivedAt`, nullable timestamp). It does not change status, editorData, revisions, deployments, domains or public runtime access. Restore clears the timestamp. Existing sites default to active. Folder/favorite assignments are retained.

The dashboard requests `GET /api/dashboard/sites?workspaceId=...&includeArchived=true` and partitions the scoped response. Omitting `includeArchived` returns active sites only. `PATCH /api/dashboard/sites/:id/archive` accepts exactly `{ workspaceId, archived: boolean }`. Both routes use existing session authentication. Mutations require workspace write access and website ownership; collaborators retain existing read/editor access. Conditional updates make repeated archive/restore requests idempotent.

## Missing-column repair — applied 28 October 2026

The initial implementation shipped application code without applying its additive database change. The connected database lacked `websites.archivedAt`, causing both Archive and All Sites to fail with a generic 500. The exact archive migration has now been applied using the targeted repair below. Verification retained all six existing website rows, including all original column values, and left migration history unchanged. A repeat readiness check reports `ready: true, changed: false`.

If the column is missing in another environment, the API now responds with `503 ARCHIVE_STORAGE_NOT_READY` and an actionable migration message instead of the unexplained generic error. Archive state never falls back to browser storage.

## Targeted database rollout

From `backend`:

```powershell
npm run check:archive
npm run db:archive
```

`check:archive` is a read-only readiness probe. `db:archive` runs only `prisma/migrations/20261028090000_website_archive/migration.sql` inside a transaction. It verifies the nullable timestamp definition, fingerprints all original website column values and migration history, and rolls back on any mismatch. It has bounded lock/statement timeouts, rejects incompatible existing columns, and is idempotent. No seed, global migration deploy, db push/reset or row deletion is used.

The earlier migration-history reconciliation requirements in `PHASE2_DATABASE_RECONCILIATION_PLAN.md` still apply to general deployments. The targeted additive repair did not resolve, delete, insert or rewrite any historical ledger entry. Include this migration in the reviewed deployment history when reconciliation is completed; its `IF NOT EXISTS` statement safely handles the already-created column. Unconditional migration-history rewriting and admin password resets during database-client import were disabled, so backend restarts do not perform those unrelated mutations. Explicit provisioning/seed workflows remain separate.

## Validation

From the repository root:

```powershell
npm --prefix backend run build
npm --prefix backend run test:archive
npm --prefix frontend run test:archive
npm --prefix frontend run build
```

Backend route/service tests cover authentication, validation, isolation, permissions, idempotency, failures, content preservation and the missing-migration regression. The storage test uses a uniquely named disposable PostgreSQL schema to reproduce a missing column, apply the repair, verify content/history preservation, repeat it and reject an incompatible column. It uses `ARCHIVE_TEST_DATABASE_URL` or the configured `DATABASE_URL`, and removes only its own schema. Frontend tests cover active/archive counts, restore, legacy metadata and workspace selection.

`backend/scripts/archive-live-browser.mjs --run` additionally exercises the running local dashboard/API with real PostgreSQL storage and session-cookie authentication, without mocked backend responses. It creates unique disposable users/workspaces/sites/sessions, and removes only those exact fixture UUIDs afterward. It requires a disposable Chrome instance on `CHROME_DEBUG_URL` (default port 9227), frontend port 5173 and API port 5000; URL overrides are supported. Run from `backend`. It does not send email or test OTP login.

The live checks passed: All Sites and Archive loading; archive/restore; counts; persistence after reload; personal, team and legacy-alias scope; ownership/read-only restrictions; list/mobile views; folder/favorite retention; mutation/load failure recovery; stale-response isolation; editor API access; published API availability while archived; and preservation of editor data, revisions, deployments and all six original websites. Screenshots and the report are stored locally under `.integration-review/archive-e2e/`.

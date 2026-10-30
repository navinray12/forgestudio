# Phase 2 database reconciliation and activation plan

Prepared 27 October 2026. **The additive database change is validated, but Phase 2 is not safe to activate now.** No shared schema, data or migration records were changed by this work. The interrupted rehearsal completed successfully; its results were reused rather than repeated during continuation.

## Findings and resolution

| Finding | Evidence and proposed action |
| --- | --- |
| Unfinished `20260929000000_complete_legacy_core` | Exact historical SQL recovered with the recorded checksum (CRLF). All 19 intended tables, every intended column/type/nullability/default, and all named constraints/index definitions already match. Replaying it fails with `42P07: subscription_plans already exists`. After fresh preflight and explicit authorization, resolve **applied**; do not replay or resolve rolled back. |
| Missing historical workspace-lifecycle file | Recovered from source commit `397b56e13a16a074a55a2e4382453a27126276ba`, Git blob `8b2611eb013bf6ae936d9882b2e924b92c4e6453`. LF bytes hash to `51a67a2d4395cb9b1c6e1304a9dd4fcf448df3b03088efd84afe28a00fcb182e`, exactly matching both its rolled-back attempt and successful record. Staged unchanged in the local plan. This artifact blocker is resolved. |
| Two lifecycle records | One rolled-back attempt and one successful attempt are legitimate retry history. Retain both. Neither needs to be updated or re-resolved. The archive's newer, edited lifecycle SQL is not the historical file and must not replace its recorded checksum. |
| Incomplete checkout history | Curated 18-file package contains all 17 distinct historical migration names plus Phase 2, with exact bytes/checksums. Includes recovered historical files and the correct line endings, without copying unrelated pending source migrations. |
| Schema differences | After Phase 2, all 51 target model tables are represented. No missing target columns, constraints, indexes or enum labels; no differing target constraint/index definitions. The 178 extra tables (including the ledger) belong to existing database capabilities and are retained. Twenty-six column-default differences are 25 equivalent `now()`/`CURRENT_TIMESTAMP` defaults plus the new invitation ID's additional server UUID default. They require no destructive alignment. |

Original lifecycle SQL: [historical source file](https://github.com/navinray12/forgestudio-ai/blob/397b56e13a16a074a55a2e4382453a27126276ba/backend/prisma/migrations/20260928122000_workspace_lifecycle/migration.sql). No source repository file, branch, commit or archive was modified.

The regular checkout migration directory is still not the complete historical deployment authority. Do not run a general source migration deploy or use Prisma db push/reset to make the shared database resemble this smaller checkout. Use the curated config explicitly after approval, or promote its exact reviewed history into the authoritative deployment directory first.

## Existing rehearsal evidence ? not rerun during continuation

A consistent exported snapshot was dumped and restored into a disposable database, separately from the shared database. A reference database ran the exact unfinished legacy SQL to establish its intended contract. A third database instantiated the target Prisma schema for compatibility comparison.

- `migrate deploy` initially failed with P3009 on the clone, as expected.
- Resolving the already-satisfied legacy migration as applied **on the clone only** allowed deploy to apply exactly the Phase 2 migration.
- A second deploy was a no-op; migration status reported up to date. Prisma status was green even before the missing lifecycle artifact was recovered, demonstrating why the additional checksum/history gate matters.
- Fingerprints of original-column values in all 228 original tables were unchanged after Phase 2. Preserved snapshot included 11 users, 6 websites, 4 workspaces, 4 memberships and 2 source-system invitations. Existing triggers and RLS policies were unchanged.
- Fourteen backend/PostgreSQL/SMTP tests passed using the disposable clone and isolated fixture schemas. Production runtime credentials, external email delivery and real production authentication were not exercised.
- Shared history, schema and row fingerprints matched the snapshot when the original rehearsal completed. All disposable databases and the sensitive dump were removed afterward.
- Prior browser results for the Members UI and signup/login acceptance paths remain valid; those API/auth/OTP responses were mocked, as recorded in the Phase 2 implementation report.

Evidence retained under ignored `.integration-review/migration-audit/`: `rehearsal.json`, `prisma-rehearsal.log`, `backend-tests.log`, catalog/fingerprint summaries, `lifecycle-recovery.json` and `history-freshness.json`. No fresh clone, deployment or record resolution was run during continuation.

## Remaining blockers and safety checks

1. **Import-time writes remain enabled in the application.** `backend/src/config/prisma.ts` calls `ensureDbSchema()` and `ensureAdminAccounts()` unconditionally. These can rewrite migration metadata, change schema, and reset seeded admin passwords. The prepared `startup-no-writes.patch` removes those automatic calls, but has not been applied. Review/apply it to the release branch, build, and verify on staging that importing/starting the application does not change historical records or existing credential hashes. Merely setting an environment flag will not disable the current code; no such guard exists yet.
2. **The shared environment is not frozen.** Between the saved audit and continuation, only `20260819115056_init_auth.finished_at` changed: from `2026-10-26T15:50:46.769Z` to `2026-10-27T07:42:17.609Z`. All 18 ledger rows, their checksums and other fields were retained. This is consistent with the startup repair code, but the responsible process is not proven. Our continuation performed only read-only shared queries. Stop existing API/worker processes and any migration/seed jobs before the approved maintenance window; take a fresh cutover snapshot rather than treating the old data fingerprints as the current baseline.
3. **Live reconciliation and Phase 2 SQL are still unapplied.** The unfinished legacy record remains untouched, and the public Phase 2 table and Members counter are absent. Reconciliation preflight now passes; application readiness intentionally remains false.
4. **Email configuration is absent.** Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and sender (SMTP_FROM, or configured SMTP_USER fallback), plus a stable 32-byte/64-hex WORKSPACE_INVITATION_TOKEN_KEY shared by API and worker instances. Production FRONTEND_URL must be the correct HTTPS origin and match credentialed CORS. The current development URL passes development validation, not production certification.
5. **Production-role and live-flow certification remains required.** The rehearsal used the configured superuser/BYPASSRLS identity. Existing policies were preserved, but grants and actual production runtime-role behavior still need staging verification. The rehearsal dump omitted owner/ACL restoration for isolation; it was not a disaster-recovery backup. Validate a cutover backup including ownership/grants/required roles, and a real approved test-email invite ? login/signup ? accept ? Active membership before release acceptance.

## Exact activation sequence ? future approved maintenance only

**None of the write commands below have been run against the shared database. Stop if any gate fails.**

1. Review the prepared startup patch on the release branch. From the repository root, dry-run and, only when approved, apply it:

   ```powershell
   git apply --check backend/migration-plan/startup-no-writes.patch
   # Future approved release-code change only:
   git apply backend/migration-plan/startup-no-writes.patch
   npm --prefix backend run build
   ```

   Certify import/startup on staging before proceeding. Configure SMTP, signing key and deployment origin. Do not launch the current unpatched backend against the shared database during planning or preflight.

2. Pause existing writers and take a fresh backup under the maintenance identity. With PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE securely set to the approved database and MIGRATION_BACKUP_FILE set to a secure destination:

   ```powershell
   & 'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe' --format=custom --file $env:MIGRATION_BACKUP_FILE
   ```

   Do not omit owners/ACLs from the cutover backup. Preserve required cluster-role definitions using the organization's approved backup process. Verify restoration, record original-column data hashes/counts, full migration rows/checksums, existing policies/triggers and sequence state. Confirm no writers remain. This is a new cutover baseline; the earlier rehearsal need not be repeated for unchanged SQL.

3. From `backend`, set the explicit reviewed datasource and run the read-only reconciliation preflight:

   ```powershell
   $env:MIGRATION_PLAN_DATABASE_URL = $env:DATABASE_URL
   node scripts/verify-migration-plan.mjs
   if ($LASTEXITCODE -ne 0) { throw 'Reconciliation preflight failed' }
   ```

   Expect `readyToReconcile: true`, with no blockers. Reconfirm the datasource is the approved deployment database. The gate verifies exact staged files, ledger checksums, legacy objects, and absence of unexpected partial Phase 2 schema. It does not certify SMTP or application startup safety.

4. **Only after explicit live-write approval**, mark the already-satisfied legacy migration applied. Do not run its CREATE TABLE SQL and do not resolve the successful lifecycle migration again:

   ```powershell
   node node_modules/prisma/build/index.js migrate resolve --applied 20260929000000_complete_legacy_core --config migration-plan/reconciliation.config.ts
   if ($LASTEXITCODE -ne 0) { throw 'Legacy resolution failed; stop' }
   ```

5. Apply only the reviewed Phase 2 migration using the curated history:

   ```powershell
   node node_modules/prisma/build/index.js migrate deploy --config migration-plan/reconciliation.config.ts
   if ($LASTEXITCODE -ne 0) { throw 'Migration failed; keep writers stopped' }
   node node_modules/prisma/build/index.js migrate status --config migration-plan/reconciliation.config.ts
   if ($LASTEXITCODE -ne 0) { throw 'Migration status failed' }
   node scripts/verify-migration-plan.mjs
   if ($LASTEXITCODE -ne 0) { throw 'Post-deploy preflight failed' }
   npm run check:workspace-members
   if ($LASTEXITCODE -ne 0) { throw 'Members readiness failed' }
   ```

   Expected deploy output: only `20261026190000_workspace_members_email_invites`. The SQL is transactional, has a five-second lock timeout and sixty-second statement timeout, and rejects an incompatible pre-existing lifecycle column. On this audited database it adds only `workspaces.membersVersion` and the target-owned `workspace_email_invitations` table/indexes/constraints; the existing lifecycle column and source invitation/outbox tables remain intact.

6. Before resuming traffic, compare fresh original-column hashes, counts, existing policies/triggers, ownership/grants and sequence state against the maintenance snapshot. All existing application data must match. Ledger differences must be limited to satisfying the one legacy migration and recording the new Phase 2 migration; retain the original rolled-back lifecycle attempt and successful lifecycle record. Check no schema changes outside the reviewed additive objects occurred.

7. Start the patched API and invitation worker with configured secrets and the tested runtime identity. Verify existing login, websites/editor, Phase 1 Dashboard, workspace selection and existing features. Using explicitly approved test accounts/addresses, exercise invitation email, login/signup return, acceptance to Active membership, role restrictions, resend and revoke. Confirm startup did not rewrite earlier migration timestamps or existing password hashes, then resume traffic.

## Failure and rollback

- Do not rerun the unfinished legacy SQL; its tables already exist. Do not edit shared checksums, erase failed rows, or use direct UPDATE/DELETE against the migration ledger.
- A lock timeout or Phase 2 SQL error rolls back its transaction. Keep writers stopped and inspect the actual schema and failed Phase 2 record before deciding whether an approved `migrate resolve --rolled-back 20261026190000_workspace_members_email_invites` and retry is justified. Do not change SQL or mark it applied merely to bypass the error.
- If the additive SQL succeeds but the release fails, retain the additive table/counter and return to a tested compatible application release. Do not run a destructive down migration. Restore the verified backup/PITR only under a separately approved recovery procedure if data integrity actually requires it.
- `migration-plan/migrations` is an existing-installation upgrade package, not a proven empty-database bootstrap. Do not introduce unrelated source migrations or drop extra tables to manufacture schema equality.

**Verdict:** the historical-artifact blocker is resolved and the reconciliation/additive SQL path is validated. Shared activation remains **NO-GO** until startup writes are disabled, a frozen fresh backup exists, email/runtime gates pass, and live-write approval is given. The shared database and migration records were not modified by this work.

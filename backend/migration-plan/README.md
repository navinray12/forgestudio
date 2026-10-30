# Reviewed existing-installation migration plan

This directory is a prepared plan, not permission to change the shared database.
Read [the reconciliation runbook](../../docs/PHASE2_DATABASE_RECONCILIATION_PLAN.md) before use.

- `manifest.json`: exact SHA-256/provenance for 17 historical migrations and the proposed Phase 2 migration. All historical artifacts are recovered.
- `migrations/`: curated history; excludes unrelated, unapplied source migrations. Byte-preserving Git attributes protect historical checksums.
- `legacy-contract.json`: catalog contract of the unfinished legacy migration, derived from checksum-verified SQL in a disposable reference database.
- `reconciliation.config.ts`: explicit `MIGRATION_PLAN_DATABASE_URL`; does not silently choose the shared database.
- `validation-summary.json`: outcome and remaining operational gates.
- `startup-no-writes.patch`: reviewed/apply-checkable proposal to disable import-time schema/history repair and password seeding. **Not applied.**

Read-only preflight, from backend:

```powershell
node scripts/verify-migration-plan.mjs
```

Passing this preflight means the migration history and legacy object contract are eligible for the documented reconciliation. It does not mean the unfinished record has been resolved, Phase 2 has been deployed, SMTP is configured, or the running application is safe to activate.

`--rehearsal` is restricted to randomly named disposable clone databases. Do not use it for a shared deployment.

This package is qualified for the audited existing database upgrade. It is not a fresh-install baseline. The regular `prisma/migrations` directory remains incomplete for this shared database; any approved upgrade must use this explicit reviewed config or first promote this exact history into the deployment's authoritative migration directory.

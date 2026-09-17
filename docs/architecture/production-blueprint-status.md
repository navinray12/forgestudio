# Production blueprint v4 implementation status

The supplied final blueprint is the target specification. **Its full implementation is not complete.** The repository now has an executable draft-save compatibility slice, a [shared TypeScript/PHP document contract](document-contract-status.md), and [consolidated account/workspace membership authority](tenancy-status.md) in addition to the previously verified foundation. No native WordPress, connected publishing, infrastructure capacity or production readiness claim follows from these components.

The extracted source is [production-blueprint-v4.txt](production-blueprint-v4.txt). All 88 work packages, their prerequisites and their required evidence are tracked in [implementation-register.json](implementation-register.json). The referenced companion engineering pack was not among the supplied files; this register was extracted from Appendix A of the DOCX.

## Implemented behavior

- Existing editor autosave and manual save share `packages/editor-persistence/src/save-coordinator.ts`. One immutable mutation is in flight. New edits coalesce; an uncertain response retries the original mutation and precondition before newer work.
- `POST /api/v1/websites/{id}/draft-saves` commits the draft, immutable snapshot/receipt and audit together. Website/actor/mutation uniqueness prevents duplicate intents. Current access is checked before receipt replay; revoked sessions and inactive accounts cannot save.
- `websites.draftRevision` is a host revision token. A migration trigger makes legacy/SDK/restore draft changes invalidate outstanding modern preconditions. Publishing changes only live fields and leaves the draft token intact.
- A stale save returns `409 DRAFT_REVISION_CONFLICT`. Changes removed by the existing permission-aware merger cause a rejected transaction instead of a falsely successful partial save. Protected descendants remain protected through parent updates.
- The browser distinguishes unsaved, saving, host saved, failed and conflict states. Recovery copies use bounded IndexedDB storage scoped to the signed-in legacy user, website and tab. Recovery provides separate downloads of local, host and stored copies. No automatic overwrite or conflict merge is performed.
- Failed host loads do not substitute an unscoped localStorage document. Original old localStorage entries are not deleted. Owner saves preserve unknown widgets, page fields, node order and new popups. Revision selection loads source into the editor and uses the same save coordinator.
- The compatibility request is capped at 3 MiB, the complete legacy website document at 2 MiB, a page tree at 5,000 nodes/50 levels, and JSON nesting at 100 levels. Duplicate object keys and malformed UTF-8 are rejected before recursive validation. These whole-website compatibility limits are **not** the future per-page API.
- Request receipts have a seven-day engineering replay horizon. The worker prunes expired non-head receipts in batches of at most ten; current drafts, release snapshots and manual revisions use separate storage. This is not a legal retention policy or a storage-capacity certification.
- Application routes load lazily and a route error boundary contains render failures. The initial static JavaScript dependency graph has a 300 KiB gzip budget; CSS has a 75 KiB gzip budget. Editor and widget chunks are measured separately and remain large.
- CI includes reproducible builds, source boundaries, database migration/failure tests, dependency audit, browser save tests and the initial bundle budget. Existing frontend lint debt remains an explicit nonblocking report.
- [Consolidated account/workspace membership authority](tenancy-status.md) (FS-040): every website belongs to exactly one workspace (backfilled for existing rows); a workspace role (`OWNER`/`ADMIN`/`MEMBER`) grants the equivalent site capability without requiring a separate `WebsiteCollaborator` row; membership revocation, single-use bound invitations, and time-limited admin-approved support grants are enforced with the same fail-closed-on-lookup-error contract FS-003 established. `Team`/`TeamMember` remain live but unmigrated and still grant no site permission (unchanged from before this work; see the linked status for the exact scope).

## Executed checks

See [the draft-save evidence](../evidence/v4-draft-save-slice.json), [the subsequent document-contract evidence](../evidence/v4-document-contract.json), and [the tenancy status](tenancy-status.md) for command results and evidence at each implementation stage. Browser tests run the actual React editor in Chromium with controlled HTTP responses; PostgreSQL tests independently exercise real transactions. This is not a complete browser-to-database journey or a WordPress host test.

## Still required by the final plan

1. ~~Consolidated account → workspace → site → page authority~~ Established for the FS-040 evidence scope (see [tenancy-status.md](tenancy-status.md)); still open: migrating or retiring `Team`, row-level security as defense-in-depth, and extending granular per-resource overrides to workspace-derived members.
2. Portable page persistence/cutover using the shared TypeScript/PHP contract, selector stores, bounded command history, browser-worker stale-response handling, renderer/interaction parity and full existing-feature capability fixtures.
3. PostgreSQL operation journal/outbox, BullMQ and separate Redis roles, guarded leases, fair admission, independent reconciliation, and durable publish/rollback operations.
4. Independent immutable public serving, object-store conditional activation, incremental dependency builds, domain ownership, isolated previews and real release verification.
5. An installable native WordPress plugin using the shared editor, local PHP storage/rendering/tasks, cloud-blocked tests, real connected transfer, authority handoff and destination receipts.
6. Media quarantine/processing/pins, bounded imports, public form contracts, commercial reservations/events where enabled, privacy deletion/suppression, telemetry and operational controls. (Workspace-scoped support grants themselves are implemented; see item 1.)
7. Container/artifact provenance, security and compatibility matrices, load/soak/fairness benchmarks, restore/fencing drills and supported operating policies. Kubernetes/Kafka/AI remain separately gated optional projects as the blueprint specifies.

Legacy PUT/SDK save routes still exist for compatibility and are not yet all forced through the new receipt contract. Legacy publication remains synchronous and public serving still depends on existing APIs. Do not advertise these as the completed v4 pipeline. The authority epoch `1` in the compatibility save command is local to the legacy cloud editor; it is not the connected authority protocol.

## Developer commands and migration

From the repository root: `npm ci`, `npm run check`, `npm run test:integration`, and `npm run test:journeys`. Install the pinned browser once using `npx playwright install chromium --only-shell` (Linux CI also uses `--with-deps`). Regenerate discovery using `npm run inventory`; discovery is not feature certification.

Apply `20260916000000_draft_mutation_receipts` and `20260917000000_workspace_authority` through the existing controlled migration command after following [database migration guidance](../database-migrations.md). The API readiness probe requires this schema. Only disposable databases were migrated during implementation; the user's configured database was not modified.

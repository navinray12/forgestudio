# Foundation implementation status

Starting checkout: `3256f8a` (different from the report's reviewed `e6e126f`).
The supplied [source blueprint](source-implementation-plan.md) is retained as a
reference; its proposals and historic observations are distinct from implemented code.
Scope: the blueprint's first foundation milestone, plus adjacent draft/publication
correctness repairs required to make that baseline useful. This does not implement
the complete multi-release WordPress/cloud roadmap.

## Implemented

| Area | Implementation and evidence |
| --- | --- |
| Reproducible workspace | One npm workspace/lockfile; Node 24.18.0, npm 11.16.0, TypeScript 6.0.2 in both apps; `npm ci` |
| Runtime dependencies | Generated Prisma runtime rebuilt and copied into compiled backend; no generated SDK committed |
| Test safety | Local disposable Docker PostgreSQL, dedicated database names/role, production refusal, no `.env` test target; legacy scripts guarded and create their own users |
| Simulated destinations | WordPress connect/verify/publish and SFTP transfer/verify unavailable; stored configuration retained; no invented IDs |
| Authorization | Policy lookup failure returns 503; missing resource context rejected; regression coverage for explicit denies |
| Webhooks | Exact-byte HMAC, mandatory timestamp/event ID, separate signing secrets, durable deduplication, transactional worker effects, bounded retries |
| Migrations | Missing core-table migration restored; auth schema and inbox migrated explicitly; no service-import DDL; fresh/upgrade/schema-diff tests |
| Deployment states | Database compare-and-swap transitions; terminal error preservation; uncertain activation remains reconciling |
| Candidate durability | Revision committed and linked before activation; failure injection confirms no live mutation if revision cannot be saved |
| Draft/live boundaries | Guarded live activation; draft/API/restore paths preserve current live fields; rollback keeps newer draft edits |
| Exports | Actual disk persistence, immutable operation directories, path validation, checksum read-back, downloadable file contents |
| Worker separation | API no longer starts periodic jobs; independent bounded worker processes inbox/scheduled snippets |
| Operations | Separate liveness/readiness, startup schema probe, API shutdown handling, migration/recovery guides |
| CI | Pinned GitHub Actions run install, source boundaries, type checks, maintained tests, builds, database integration and dependency audit |

## Verification record

Executed on Windows with Node 24.18.0/npm 11.16.0: clean `npm ci`, type checks and
production builds for both apps, 30 unit regression tests, 16 PostgreSQL integration
tests, fresh and upgrade migrations, zero Prisma schema drift, and zero reported
dependency vulnerabilities. `npm run check` and `npm run test:integration` are the
repeatable verification entry points. Tests cover
actual PostgreSQL transactions and injected database failures, not a live WordPress
installation. The restricted-role smoke check starts the compiled backend and
queries readiness, catching missing runtime artifacts and import-time DDL.

The existing frontend lint command reports **1,100 errors and 30 warnings**. It is
reported as an explicit nonblocking CI step while the maintained correctness checks
remain required. No lint rules were disabled to make this debt disappear. The
production editor bundle is approximately **6.22 MB minified / 1.57 MB gzip** and
Vite reports its existing large-chunk warning. These remain editor-extraction and
cleanup work; this milestone does not claim a clean full lint report or a small
public/editor bundle. The checked-in CI workflow has been validated locally but has
not been run by GitHub until the user pushes the changes.

Dependency audit initially reported vulnerable transitive packages. The lockfile
now resolves patched Vitest and explicit Prisma/Monaco transitive overrides;
`npm audit --audit-level=high` reported zero vulnerabilities during implementation.
The override of `deepmerge-ts` crosses a major version and is exercised through
Prisma generation, migration, and schema-diff tests. Reassess overrides when upstream
dependencies adopt patched versions. Argon2 0.44.0 supplies a working Windows native
prebuild; the original 0.45.1 install attempted a local native build on this machine.

## Still outstanding

- Full document schema, legacy reader/converter, shared host-adapter packages, and editor extraction.
- Native WordPress bootstrap, PHP rendering, local editor/media, plugin packaging and compatibility certification.
- Actual authenticated WordPress connection, authority epochs, media transfer and remote publication receipts.
- Cloud publishing outbox/BullMQ leases, immutable object-storage/CDN releases and automatic reconciliation.
- Page-level draft concurrency, tenant hierarchy/RLS migration, approval binding to exact candidate hashes.
- Complete public/editor renderer separation and widget parity; the existing public path still reads the API/database.
- High-traffic benchmarks, disaster-recovery drills, infrastructure sizing and production deployment.
- Full migration certification against an actual existing installation and its possible schema drift.

The in-memory job runner named in finding F05 does not exist in this checkout.
The current background-job model is not evidence of a complete durable publishing queue.
No cloud acceptance response has been added for an in-memory publishing job.

## Repository artifact policy

`backend/src/generated/prisma` is generated build output and is now ignored.
Root command-output-like files, existing `.rej` files, and historical editor patch
artifacts are preserved because they may contain another developer's unapplied work.
They should be reviewed before archival/deletion. No history was rewritten.
Only temporary scripts created during this implementation were removed.

The existing `frontend/` and `backend/` directories remain the workspace packages.
Relocation to `apps/` belongs with the next mechanical migration, separately from
behavior changes. Human-readable repositories and worker modules provide the new
boundaries without moving the large editor during correctness repairs.

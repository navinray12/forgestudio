# Database migration guide

The application no longer creates or alters tables on import. The migration history
under `backend/prisma/migrations` is the only schema authority.

## Fresh development database

Use the local Compose database described in the README. Run `npm run db:migrate`
with `backend/.env` pointing to it, then `npm run db:generate`. Readiness checks the
database and required schema without modifying them.

The original history omitted core tables referenced by later migrations. The new
`20260914000000_restore_missing_core_tables` fills that gap before the dependent
migrations. Historical migration files are unchanged. The September 15 migration
moves email/OTP schema changes into the history and adds the durable webhook inbox.
Prisma UUID defaults now reflect the database-generated defaults already present in
historical migrations, rather than proposing destructive default changes.

## Existing installations

Do not reset or `db push` an existing database. Back it up and restore a disposable
clone first. Inventory `_prisma_migrations`, tables, constraints and data drift.
Sites created by startup SQL or `db push` may differ from the checked-in schema.
For example, old form tables may contain a different set of columns. The additive
repair cannot infer how custom production data should be converted.

Run `prisma migrate status` and a read-only `prisma migrate diff` against the clone.
If the database has no migration history, explicitly baseline only migrations whose
effects have been verified to exist. Do not mark unverified migrations applied.
Test pending migrations on the clone, verify document and asset counts/checksums,
then schedule the production migration as its own controlled release job.

The integration runner covers both an empty database and a representative existing
installation whose core tables existed without the restored migration entry. It
checks that migration preserves a draft, an unknown widget, and published content.
This is not a certification of every existing production schema.

## Separate credentials

The migration job uses a schema-owner credential. API/worker roles get database
connect, schema usage, and required table read/write privileges, but no ownership,
superuser, or schema-alter privileges. Provision future-table grants using the
migration owner's default privileges. Keep the migration credential out of runtime
containers. Integration tests verify that a restricted runtime role can read the
inbox but cannot alter `websites`.

Prisma runtime generation uses a nonconnecting placeholder URL, so builds do not
need database credentials. No migration was applied to a customer database as part
of this foundation implementation.

# ForgeStudio

The final v4 blueprint is tracked in [implementation status](docs/architecture/production-blueprint-status.md) and its [88-work-package register](docs/architecture/implementation-register.json). The full blueprint is not yet implemented. Current work includes shared TypeScript/PHP document contracts, guarded saves, browser recovery and a [container application pipeline](infrastructure/README.md).

ForgeStudio is a visual website builder. The existing React editor and Express API
are being hardened before extracting a shared editor and building the native
WordPress plugin. WordPress and SFTP remote publishing are intentionally unavailable
until real delivery and destination verification exist.

## Start developing

Use Node **24.18.0** and npm **11.16.0** (the exact toolchain used for this baseline).
Run commands from the repository root unless a guide states otherwise.

For the complete local container profile, run `npm ci` followed by
`npm run containers:up`, then open **http://localhost:8080**. It builds the frontend,
API and worker, initializes isolated data services and applies controlled migrations.
`npm run containers:down` preserves local data. See the [container guide](infrastructure/README.md).
The following commands remain available for editing code with host-based Vite/Node.

```sh
npm ci
npm run db:generate
docker compose -f infrastructure/compose.development.yml up -d
```

Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to
`frontend/.env`. Then apply migrations to that development database:

```sh
npm run db:migrate
npm run dev:backend
```

In separate terminals, run `npm run dev:frontend` and `npm run dev:worker`.
The builder runs at http://localhost:5173 and the API at http://localhost:5000.
OAuth providers are optional; email delivery requires the relevant mail configuration.

## Verify a change

```sh
npm run check
npm run test:integration
npm audit --audit-level=high
```

`check` generates the Prisma client, enforces source boundaries, type-checks both
apps, runs maintained regression tests, and builds both apps. Integration tests
create their own disposable Docker PostgreSQL instance, check fresh installation
and upgrades, inject failures, and remove the instance. They do not use your `.env`
database. Docker must be running.

## Find the code

| Directory | Purpose |
| --- | --- |
| `frontend/src/features/` | Existing editor capabilities and feature UI |
| `frontend/src/pages/editor/` | Current editor shell, widgets and panels |
| `backend/src/modules/` | Business modules, each containing its routes, controllers, services and data access |
| `backend/src/platform/` | Shared database, HTTP and authentication infrastructure |
| `backend/src/compatibility/` | Transitional exports for older internal imports |
| `backend/src/workers/` | Independently started background processes |
| `backend/prisma/` | Canonical schema and migration history |
| `backend/tests/unit/` | Maintained regression tests with no application database |
| `backend/tests/integration/` | Maintained tests against disposable PostgreSQL |
| `backend/src/tests/` | Guarded historical diagnostic scripts; not release certification |
| `scripts/` | Maintained build and verification entry points |
| `docs/` | Development, migration, recovery and architecture guides |

Start with the [code navigation guide](docs/code-navigation/README.md). It includes
feature locations, naming conventions, the save pipeline and links to module indexes.
The [backend move map](docs/code-navigation/backend-file-moves.json) locates files
mentioned in older issues. Editor entrypoints retain compatibility exports while
individual widget implementations live in named files. Generated Prisma code is
rebuilt, not maintained by hand or committed.

Read [the foundation status](docs/architecture/foundation-status.md),
[database migration guide](docs/database-migrations.md), and
[deployment and recovery guide](docs/deployment-and-recovery.md) before rollout.

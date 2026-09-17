# Configuration and non-source files

| File or directory | Meaning and editing rules |
| --- | --- |
| Root `package.json` | Workspace membership, supported Node/npm versions and development/check commands. `private` prevents accidental root package publication. |
| Root `package-lock.json` | Resolved dependency graph. Let npm update it; do not annotate or hand-edit it. |
| `backend/package.json` | API and worker startup, Prisma generation and server build commands. |
| `frontend/package.json` | Vite development/build and frontend checks. |
| `packages/editor-persistence/package.json` | Public entrypoints for the shared persistence package; build before consuming its compiled exports. |
| `backend/tsconfig.json` | Strict server compilation; `rootDir` identifies authored input and `outDir` identifies generated output. |
| `frontend/tsconfig*.json` | Browser and build-tool TypeScript environments, JSX settings and module resolution. |
| `backend/.env.example` | Supported server environment variables and example values. Copy locally and supply real credentials outside Git. |
| `frontend/.env.example` | Public browser configuration. Browser-exposed values are not a place for secrets. |
| `backend/prisma/schema.prisma` | Database models and generated client configuration; change with a new migration. |
| `backend/prisma/migrations/` | Ordered SQL history. Do not rewrite an already-applied migration to add comments or rename database fields. |
| `infrastructure/compose.development.yml` | Local service images, ports, volumes and health checks. This is development configuration, not a capacity proof. |
| `infrastructure/compose.application.yml` | Complete local application processes, controlled migrations, two Redis services and isolated data networking. |
| `infrastructure/environment-manifest.json` | Declared development/test settings and explicit unconfigured staging/production decisions. |
| `.dockerignore` | Build-context allowlist excluding developer environments, dependencies and local data. |
| `.github/workflows/verify.yml` | Automated installation, build, tests and verification steps for changes. |
| `playwright.config.ts` | Browser journey configuration and test application server. |
| `vitest.config.ts` | Maintained unit-test selection and runtime settings. |
| `docs/architecture/implementation-register.json` | Blueprint requirement status and evidence references. Planned entries remain planned until verified. |

JSON files intentionally remain valid JSON. The table explains their parameters
at the ownership level; executable configuration files also carry source headers.
See [database migrations](../database-migrations.md) and
[deployment and recovery](../deployment-and-recovery.md) for operational steps.

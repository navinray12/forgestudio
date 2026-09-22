# Shared backend infrastructure

| Folder | Responsibility |
| --- | --- |
| `database/` | Prisma connection, environment configuration and read-only schema readiness. |
| `http/` | Shared body parsing, webhook request handling, security middleware and API errors. |
| `authentication/` | Passport setup and common authentication configuration. |
| `configuration/` | Existing configuration exports for application composition. |

Business rules belong in `../modules/`. Database schema changes belong in a new
Prisma migration. `app.ts` composes HTTP behavior; `server.ts` starts the API process;
workers start independently. See the [navigation guide](../../../docs/code-navigation/README.md).

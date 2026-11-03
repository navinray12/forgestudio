# ForgeStudio Phase 13: Developer API v1, API Keys, Scopes, Distributed Rate Limiting & SDK

## 1. Executive Summary
Phase 13 establishes ForgeStudio's programmatic integration surfaces to production-grade SaaS quality:
1. **Additive Prisma Production Migration:** Migration `20261030000000_add_developer_api_key_fields` providing additive PostgreSQL schema alterations for `DeveloperApiKey.maskedKey`, `expiresAt`, and the shared atomic `api_rate_limits` table with performance index `idx_api_rate_limits_reset`. Tested on fresh disposable and existing compatible databases without `db push`.
2. **Mandatory Disposable Database Verification:** Mandatory pre-execution safety gates validating `TEST_DATABASE_URL`, rejecting empty or non-disposable production/dev databases, verifying active Prisma URL isolation, and asserting connected database identity prior to any test record mutations.
3. **Cryptographically Secure API Key Lifecycle:** Key generation with the canonical `fsk_` prefix and 24 bytes of entropy, SHA-256 one-way hashing, masked key identifiers (`fsk_live_...a1b2`), one-time raw secret display, strict scope validation, strict expiration bounds (1–365 days or null), and audit logging.
4. **Transactional API Key Rotation:** Atomic key rotation using `prisma.$transaction`, ensuring new-key creation and old-key revocation succeed or roll back together. Validated with failure-injection tests.
5. **Hardened Multi-Tenant Authentication & CSRF Protection:** Fail-closed authentication denying revoked, expired, or suspended account credentials. Explicit invalid Bearer tokens are denied with 401 without silently falling back to privileged cookie sessions. Cookie-based mutations require custom headers (`x-requested-with` / `x-forgestudio-client`) or valid origins to prevent cross-site request forgery.
6. **Shared Atomic PostgreSQL Distributed Rate Limiting:** Process-local memory rate limiters are replaced with an atomic PostgreSQL-backed distributed limiter utilizing `INSERT ... ON CONFLICT ("key") DO UPDATE` with TTL calculation, returning RFC headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After` on 429). Verified under concurrent parallel requests.
7. **Granular Canonical Scopes & Workspace RBAC:** Dual-layer security enforcing key capability scopes (`websites:read`, `websites:write`, `publish:write`) and workspace RBAC (`VIEW`, `EDIT`, `PUBLISH`, `ROLLBACK`).
8. **Optimistic Version Concurrency:** State-mutating endpoints enforce Compare-And-Swap (CAS) optimistic locking, returning HTTP 409 `STALE_VERSION_CONFLICT` on version mismatch.
9. **Standalone TypeScript SDK Package (`@forgestudio/sdk`):** Independent package in `sdk/` with `package.json`, `tsconfig.json`, build script, `dist/` declarations and CommonJS/ESM exports, complete type definitions, safe retry loops on 429, AbortSignal support, and standalone consumer test verification.
10. **Real Playwright Chromium Browser E2E:** Full browser automation testing `DeveloperApiSettings.tsx`: authenticated login, key generation, secret alert with copy token button, live API verification, key rotation with confirm dialog handling, key revocation, and subsequent permission denial.
11. **OpenAPI 3.0 Documentation:** Interactive JSON specification served at `/api/v1/docs` documenting all endpoints, schemas, authentication, and headers.

---

## 2. Canonical Scope Registry & RBAC Mapping

ForgeStudio enforces a strict least-privilege scope model:

| Canonical Scope | Allowed API Operations | Required Resource RBAC |
|:---|:---|:---|
| `websites:read` | `GET /api/v1/websites`<br>`GET /api/v1/websites/:id`<br>`GET /api/v1/websites/:id/pages`<br>`GET /api/v1/websites/:id/deployments` | `VIEW` permission on website |
| `websites:write` | `POST /api/v1/websites`<br>`PUT /api/v1/websites/:id`<br>`PUT /api/v1/websites/:id/pages` | `EDIT` / `EDIT_CONTENT` / `EDIT_DESIGN` |
| `publish:write` | `POST /api/v1/websites/:id/publish`<br>`POST /api/v1/websites/:id/deployments/:id/rollback` | `PUBLISH` / `ROLLBACK` |

### Security Invariants
- An API key with `websites:write` implicitly satisfies `websites:read` for idempotent data inspection.
- An API key with `websites:read` is strictly forbidden from mutations, returning `403 FORBIDDEN`.
- Scope input is validated strictly upon creation: empty arrays or non-canonical strings throw validation errors (HTTP 400).
- Expiration input is bounded between 1 and 365 days; unbounded or negative values are rejected (HTTP 400).
- Wildcard scopes (`*` or `all`) are restricted strictly to platform Super Admins.
- Cross-tenant requests are denied immediately with `403 FORBIDDEN` or `404 NOT_FOUND`.

---

## 3. Distributed Rate Limiting Architecture

The rate limiting engine (`backend/src/middlewares/api-v1.rateLimiter.ts`) calculates atomic quotas in the PostgreSQL `api_rate_limits` table:

```sql
INSERT INTO "api_rate_limits" ("key", "count", "reset_at")
VALUES ($1, 1, NOW() + ($2 || ' milliseconds')::interval)
ON CONFLICT ("key") DO UPDATE
SET 
  "count" = CASE 
    WHEN "api_rate_limits"."reset_at" <= NOW() THEN 1 
    ELSE "api_rate_limits"."count" + 1 
  END,
  "reset_at" = CASE 
    WHEN "api_rate_limits"."reset_at" <= NOW() THEN NOW() + ($2 || ' milliseconds')::interval 
    ELSE "api_rate_limits"."reset_at" 
  END
RETURNING "count", EXTRACT(EPOCH FROM ("reset_at" - NOW()))::int AS "ttl_seconds";
```

| Tier | Window | Max Requests | Key Prefix | Target Endpoints |
|:---|:---:|:---:|:---|:---|
| **Standard Reads** | 60s | 120 | `api-v1:general` | `GET /websites`, `GET /pages`, `GET /deployments` |
| **Mutations** | 60s | 30 | `api-v1:mutation` | `POST /websites`, `PUT /websites/:id`, `PUT /pages` |
| **Publish Operations** | 60s | 10 | `api-v1:publish` | `POST /websites/:id/publish`, `POST /rollback` |
| **Key Management** | 60s | 15 | `api-v1:keys` | `POST /apikeys`, `POST /revoke`, `POST /rotate` |

### Headers Emitted
- `RateLimit-Limit`: Maximum requests permitted within window.
- `RateLimit-Remaining`: Remaining allowance in current window.
- `RateLimit-Reset`: Seconds remaining until window reset.
- `Retry-After`: Returned on HTTP 429 indicating seconds to wait.

---

## 4. Standalone TypeScript SDK Architecture

Located in `sdk/` and published as `@forgestudio/sdk`:

```typescript
import { ForgeStudioClient } from "@forgestudio/sdk";

const client = new ForgeStudioClient({
  baseUrl: "https://api.forgestudio.io/api/v1",
  apiKey: process.env.FORGESTUDIO_API_KEY!,
  timeout: 15000,
  maxRetries: 2,
});

// 1. List websites
const websites = await client.websites.list({ page: 1, limit: 10 });

// 2. Async generator for pagination
for await (const site of client.websites.iterate({ limit: 50 })) {
  console.log("Managed site:", site.name);
}

// 3. Update pages with optimistic version concurrency
await client.pages.update(websiteId, updatedPages, { expectedVersion: 3 });

// 4. Trigger publish
const deployment = await client.publishing.publish(websiteId, { environment: "PRODUCTION" });
```

---

## 5. Verification & Test Suite Summary

- **Phase 13 Comprehensive Suite (`backend/tests/phase13-developer-api.test.ts`):** **43 PASSED | 0 FAILED**
  - **Gate 1: Negative Safety Checks (2/2)**: Empty database URL rejected, production/dev `elementor_saas` DB rejected.
  - **Gate 2: Target Disposable Database Target (2/2)**: Dedicated disposable test database target verified, active Prisma connection verified against target, connected DB identity asserted.
  - **Group 1: API Key Lifecycle & Security (10/10)**: Scope validation, expiration bounds, random prefix, SHA-256 tokenHash, masked identifier, list masking, expiration detection, transactional failure injection rollback, atomic rotation, audit logging.
  - **Group 2: API v1 Authentication & Multi-Tenancy (9/9)**: Missing auth 401, invalid Bearer 401, valid Bearer 200, X-Request-Id correlation, invalid Bearer refusal of cookie fallback, CSRF rejection without client header, CSRF acceptance with `x-requested-with`, multi-tenant 403 isolation, suspended account 403.
  - **Group 3: Granular Scope Enforcement (3/3)**: Read-only key allowed to read, write strictly denied (403), publish strictly denied (403).
  - **Group 4: Distributed Rate Limiting (3/3)**: RFC headers returned, 8 concurrent parallel requests atomic counting, 429 rate limit exceeded with Retry-After header.
  - **Group 5: Optimistic Concurrency (1/1)**: CAS version conflict returns 409 STALE_VERSION_CONFLICT.
  - **Group 6: Official TypeScript SDK (7/7)**: `client.websites.list()`, `client.websites.get()`, `client.pages.get()`, async generator iteration, typed `ForgeStudioApiError`, `AbortSignal` cancellation mapping, standalone consumer package execution from `sdk/dist/index.js`.
  - **Group 7: OpenAPI 3.0 Documentation (1/1)**: Valid OpenAPI 3.0 specification served at `/api/v1/docs`.
  - **Group 8: Playwright Developer API Settings E2E (7/7)**: Dashboard settings loaded with session, UI key generation with 30-day expiration, copy button presence, live API verification with generated secret, UI key rotation with browser dialog confirm, UI key revocation badge update, and subsequent 401 denial.
- **Phase 7 Safe Regression Suite (`backend/tests/phase7-theme-cms.test.ts`):** **22 PASSED | 0 FAILED**
- **Build Status:**
  - Backend `npm run build` (`tsc`): PASSED (code 0)
  - Frontend `npm run build` (`vite build`): PASSED (code 0 in 27s)
  - SDK `npm run build` (`tsc -p tsconfig.json`): PASSED (code 0)

# ForgeStudio Phase 13: Developer API v1, API Keys, Scopes, Rate Limiting & SDK

## 1. Executive Summary
Phase 13 promotes ForgeStudio's programmatic integration surfaces to production-grade SaaS quality:
1. **Cryptographically Secure API Key Lifecycle:** Key generation with the canonical `fsk_` prefix, SHA-256 one-way hashing, masked key identifiers, one-time raw secret display, optional duration expiration, atomic rotation, and audit logs.
2. **API v1 Authentication & Multi-Tenancy:** Hardened Bearer authentication with automatic account suspension enforcement, expired key rejection, revocation checks, and multi-tenant scoping.
3. **Canonical Scope Model & Granular RBAC:** Dual-layer security enforcing both key-level capability scopes (`websites:read`, `websites:write`, `publish:write`) and workspace RBAC (`VIEW`, `EDIT`, `PUBLISH`, `ROLLBACK`).
4. **RFC Rate Limiting & Abuse Protection:** Atomic tier-based rate limiters (General: 120 req/min, Mutations: 30 req/min, Publishing: 10 req/min, Key Management: 15 req/min) returning RFC-standard `RateLimit-*` and `Retry-After` headers on HTTP 429.
5. **Standardized API v1 Contract:** Consistent `{ success: true, data, meta, requestId }` envelopes, `X-Request-Id` correlation, and HTTP 409 `STALE_VERSION_CONFLICT` optimistic concurrency protection.
6. **Official TypeScript SDK:** Type-safe isomorphic client supporting API keys, sessions, request timeouts, `AbortSignal`, 429 backoff retry loops for safe requests, and async generator pagination.
7. **OpenAPI 3.0 Documentation:** Interactive JSON specification served at `/api/v1/docs` documenting all routes, authentication, schemas, and rate limits.
8. **Developer Dashboard UI:** Full management integration in `DeveloperApiSettings.tsx` with expiration options, key rotation, masked key display, copy-to-clipboard secret alerts, and SDK usage snippets.

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
- Wildcard scopes (`*` or `all`) are restricted strictly to platform Super Admins.
- Cross-tenant requests are denied immediately with `403 FORBIDDEN` or `404 NOT_FOUND`.

---

## 3. Rate Limiting Architecture

The rate limiting engine (`backend/src/middlewares/api-v1.rateLimiter.ts`) calculates atomic quotas per authenticated entity:

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

## 4. TypeScript SDK Architecture

Located in `backend/src/sdk/client.ts` and re-exported at `sdk/client.ts`:

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

- **Phase 13 Suite (`backend/tests/phase13-developer-api.test.ts`):** **28 PASSED | 0 FAILED**
  - Group 1: API Key Lifecycle & Security (8/8)
  - Group 2: API v1 Authentication & Multi-Tenant Isolation (6/6)
  - Group 3: Granular Scope Enforcement (3/3)
  - Group 4: Rate Limiting & RFC Headers (3/3)
  - Group 5: Optimistic Concurrency & CAS Conflicts (1/1)
  - Group 6: TypeScript SDK, Namespaces, AbortSignal, Errors (6/6)
  - Group 7: OpenAPI 3.0 Documentation Endpoint (1/1)
- **Phase 7 Regression (`backend/tests/phase7-theme-cms.test.ts`):** **22 PASSED | 0 FAILED**
- **Build Status:**
  - Backend `npm run build` (`tsc`): PASSED (code 0)
  - Frontend `npm run build` (`tsc -b && vite build`): PASSED (code 0)

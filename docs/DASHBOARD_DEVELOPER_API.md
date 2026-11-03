# Developer API dashboard

The Developer API.pdf is the visual reference for `/dashboard/tools` (also `?tab=developer-api`). Other developer panels keep their existing routes and implementations. Navigation from these panels stays under `/dashboard/tools?tab=...`.

The page uses existing authenticated `/api/v1/apikeys` endpoints and the existing `developer_api_keys` Prisma model. No existing key or website data is migrated, deleted, or rewritten. Keys belong to the signed-in account, rather than a selected workspace. Revocation only sets revokedAt; it does not affect deployed websites.

## Key management

- Session authentication and active account required, including SDK download. API keys cannot create more keys.
- POST accepts a strict label (trimmed 1-50 characters) and 1-3 distinct recognized scopes: websites:read, websites:write, publish:write. Extra properties and arbitrary elevated scopes rejected.
- New keys use the existing service: cryptographically random fsk_ token, only SHA-256 hash stored. Older unprefixed tokens remain compatible. Secret returned only at creation; UI holds it in component memory and never persists it in browser storage or includes it in quickstart snippets. Dismissing/reloading removes it.
- Lists omit both raw secret and hash. Cache-Control private/no-store on management responses.
- Revocation validates UUID and ownership, preserves the first revocation timestamp, retains the key record. Other users receive 404.
- Writes enforce configured frontend Origin when present, JSON creation, and 20 requests per minute per authenticated account.
- Suspended/deleted account tokens are rejected through both existing API-key authentication paths. Existing website capability and scope checks remain in place. Existing v1 scope behavior grants read access for the corresponding write scope.

## Resources and UI

Responsive PDF layout includes header, six developer navigation entries, hero, scope cards, real account key table, quickstarts, and help panel. Loading failures have retry, mutations show errors and pending states, empty lists have no sample keys, clipboard failure supports manual copy. Resource dialogs support Escape, keyboard focus containment, and close.

The URL and fetch tabs use the actual configured API base URL. SDK tab uses a local import of the real bundled client; it does not claim an npm package is published. Authenticated GET /api/v1/apikeys/sdk downloads client.ts. The backend build copies its source beside the compiled SDK for production downloads. Documentation lists existing v1 routes. Status checks the real health endpoint. Contact Support opens the existing Help & Support page. A public GitHub repository is not configured, so that resource explains availability and offers SDK download instead of inventing a link. Header notification bell and profile menu reuse existing implementations; editor undo/redo are disabled outside the editor.

## Verification

- `cd backend; npm run build`
- `cd frontend; npm run build`
- With local API running: `cd backend; npm run test:developer-api-dashboard`
- With local API/Vite and a disposable Chrome CDP instance on 9227: `cd backend; npm run test:developer-api-browser`

Tests use disposable example.invalid accounts and sessions, clean them up, verify existing key rows and website content fingerprints are unchanged, test actual SDK requests/scopes, validation, hashing, account isolation, idempotent revoke, suspended account rejection and source download. Browser checks cover desktop/mobile rendering, creation, secret dismissal/reload, checkbox validation, failed-load retry, quickstart tabs, docs/status/repository states and revocation. Screenshots/report live in ignored .integration-review/developer-api-e2e. No production publishing, external email, permanent site deletion, or external service calls are exercised.

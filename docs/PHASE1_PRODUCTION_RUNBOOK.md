# ForgeStudio Phase 1 Production Runbook

This runbook covers account access, blank-site creation, manual editing, media, internal database-backed publishing, anonymous public rendering and basic published forms. AI, commerce, billing, WordPress/SFTP and custom-domain provisioning are outside this Phase 1 sign-off.

## Required configuration

- `DATABASE_URL`: dedicated PostgreSQL database.
- `FRONTEND_URL`: exact public HTTPS origin. Production startup rejects missing, invalid or HTTP values.
- `UPLOAD_DIR`: absolute path on a backed-up persistent volume shared by backend instances. The local fallback is development-only.
- SMTP variables from `backend/.env.example` for real verification and form email delivery.
- `VITE_API_URL`: browser-visible HTTPS API origin when frontend and API differ.

Keep secrets in the deployment secret store. Do not commit `.env` files. Terminate TLS at the trusted proxy and restrict CORS to `FRONTEND_URL`.

## Build and migrate

```powershell
cd backend
npm.cmd ci
npm.cmd run db:generate
npm.cmd run build
npx.cmd prisma migrate deploy
```

```powershell
cd frontend
npm.cmd ci
npm.cmd run build
```

Rehearse migrations only where the configured PostgreSQL role may create and drop disposable databases:

```powershell
cd backend
$env:ALLOW_DISPOSABLE_DB_REHEARSAL='true'
npm.cmd run db:rehearse
```

The rehearsal creates only a random `forgestudio_rehearsal_<hex>` database, validates the critical schema and representative upgrade preservation, then drops that exact database.

## Hosting contract

- Serve the frontend build with SPA fallback to `index.html` for `/site/*`, including nested paths and refreshes.
- Route the API origin to Express and expose `/uploads` from persistent `UPLOAD_DIR`.
- Run `node dist/server.js`; do not run seed scripts during normal startup.
- Probe `/api/v1/health`; require database readiness before traffic is admitted.
- Back up PostgreSQL and the upload volume together and test restoration.

## Release acceptance

With non-production data, verify signup/OTP/login/logout, blank site, required widgets, two pages and homepage choice, shared header/footer, media upload, save/reload, two-tab stale-save rejection, responsive preview, publish, anonymous nested refresh, draft privacy, republish and rollback. A failed publish must leave the prior successful public release available.

Do not approve production if SMTP is unverified, uploads disappear after replacement, direct nested refresh fails, cookie mutations accept a foreign Origin, or migrations fail.

## Rollback and known limitations

- Deploy the last known-good application build; these migrations are additive.
- Use the successful deployment/revision rollback path for content. Never overwrite a draft to simulate a release.
- Internal publishing provides `/site/:websiteId`; it is not domain or CDN provisioning.
- Client-side unknown pages show a 404 view, but SEO-correct HTTP 404 needs server/edge rendering.
- Local-disk media is safe only when `UPLOAD_DIR` is durable and shared.
- The editor bundle is large and needs profiling on target hardware.
- Repository-wide frontend lint has substantial pre-existing debt; builds pass, but lint is not yet a clean quality gate.

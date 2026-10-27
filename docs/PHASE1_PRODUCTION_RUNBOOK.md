# ForgeStudio Phase 1 Production Runbook

This runbook covers account access, blank-site creation, manual editing, media, internal database-backed publishing, anonymous public rendering and basic published forms. AI, commerce, billing, WordPress/SFTP and custom-domain provisioning are outside this Phase 1 sign-off.

## Required configuration

- `DATABASE_URL`: dedicated PostgreSQL database.
- `FRONTEND_URL`: exact public HTTPS origin. Production startup rejects missing, invalid or HTTP values.
- `UPLOAD_DIR`: absolute path on a backed-up persistent volume shared by backend instances. The local fallback is development-only.
- `TRUST_PROXY`: explicit Express proxy trust matching the real topology (for example `1` for exactly one proxy hop). Production startup rejects a missing value; do not use a broad value unless the network boundary guarantees it.
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
- Probe `/api/v1/health` for liveness and `/api/v1/ready` for traffic readiness. Only readiness checks database connectivity, critical schema and unfinished migrations.
- Back up PostgreSQL and the upload volume together and test restoration.

## Release acceptance

With non-production data, verify signup/OTP/login/logout, blank site, required widgets, two pages and homepage choice, shared header/footer, media upload, save/reload, two-tab stale-save rejection, responsive preview, publish, anonymous nested refresh, draft privacy, republish and rollback. A failed publish must leave the prior successful public release available.

Do not approve production if SMTP is unverified, uploads disappear after replacement, direct nested refresh fails, cookie mutations accept a foreign Origin, or migrations fail.

### Hosted staging smoke gate

Run `npm.cmd run test:staging:smoke` from `backend` only against an authorized non-production host. Required inputs are `STAGING_APP_URL`, `STAGING_API_URL`, `STAGING_WEBSITE_ID`, and `STAGING_NESTED_SLUG`. For authenticated security checks also provide a disposable test account's `STAGING_SESSION_COOKIE` and the complete `STAGING_LOGIN_SET_COOKIE` response header captured from its real OTP login. Never commit these values.

The probe checks valid HTTPS, database readiness, credentialed CORS, foreign/missing Origin rejection, cookie flags, anonymous nested refresh, and the rendered missing-page state. A SPA host commonly returns HTTP 200 for an unknown client route; the script reports that transport status separately from the React 404 screen. An HTTP 404 requires edge/SSR route awareness and is not implied by the client view.

To test replacement persistence, also provide `STAGING_PERSISTED_ASSET_URL` and `STAGING_REPLACEMENT_EVIDENCE_FILE`. Run with `STAGING_REPLACEMENT_PHASE=before`, perform the authorized replacement, then run with `STAGING_REPLACEMENT_PHASE=after`. The latter compares the exact URL and SHA-256 bytes.

Real SMTP passes only when the configured provider delivers to an external test mailbox and that OTP completes signup/login. Record provider message ID, recipient, send/receive times, and successful verification response. The local SMTP sink is not equivalent evidence.

Database/media recovery is an infrastructure exercise: take a coordinated `pg_dump` and upload-volume snapshot; restore both into an isolated recovery environment; run `/api/v1/ready`; compare website/media row counts and representative hashes; then load the same nested page and asset. Application website backups are stored under `UPLOAD_DIR/backups`, but do not replace PostgreSQL and volume backups.

Repeat the isolated local acceptance suite before staging:

```powershell
cd backend
npm.cmd run build
$env:ALLOW_DISPOSABLE_DB_REHEARSAL='true'
npm.cmd run test:phase1:browser
```

The suite requires local PostgreSQL privileges to create/drop its guarded random rehearsal database and an installed Chrome binary. Its SMTP sink is local and disposable.

## Trusted-Origin behavior

In production, unsafe cookie-authenticated requests (`POST`, `PUT`, `PATCH`, `DELETE`) must carry an `Origin` exactly matching `FRONTEND_URL`; missing or foreign origins receive `403 UNTRUSTED_ORIGIN`. `GET`/`HEAD`/`OPTIONS`, requests without the Forge session cookie, and non-production local development are intentionally exempt. This is defense in depth and does not replace authorization.

## Rollback and known limitations

- Deploy the last known-good application build; these migrations are additive.
- Use the successful deployment/revision rollback path for content. Never overwrite a draft to simulate a release.
- Internal publishing provides `/site/:websiteId`; it is not domain or CDN provisioning.
- Client-side unknown pages show a 404 view, but SEO-correct HTTP 404 needs server/edge rendering.
- Local-disk media is safe only when `UPLOAD_DIR` is durable and shared.
- The editor bundle is large and needs profiling on target hardware.
- Repository-wide frontend lint has substantial pre-existing debt; builds pass, but lint is not yet a clean quality gate.

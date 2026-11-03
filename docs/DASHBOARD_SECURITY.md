# Security settings

Settings → Security follows `setting Security page.pdf` in the shared compact Account/Community settings shell. The page has Password, Two-Factor Authentication and Active Sessions panels, with responsive controls, native dialogs, loading/error/retry states and confirmation before signing out another device. `/dashboard?section=security` survives reload.

Password dates and devices come from actual records. Older passwords display “Last changed date not recorded”; older sessions without a recorded user agent display Unknown device/browser. The current device can use its request user agent as a fallback. Locations display “Location unavailable”: no fictional PDF locations, geolocation lookup or IP tracking is introduced.

## Authentication and updates

`GET /api/dashboard/security` (also `/api/v1`) is read-only and returns no password hash, session token/hash, authenticator secret or recovery hash. Authenticated writes use existing cookie authentication, active-account/current-session checks, strict field validation, JSON requests, origin checks and rate limits. Reads and mutations use private/no-store responses. Sensitive transactions lock the user to serialize security changes with session issuance.

- `POST /password`: verifies the current password; accepts a new 12–128-character passphrase without trimming it; requires a fresh authenticator/recovery code when enabled. Uses the existing Argon2id password utility. Updates only the password/change timestamp, invalidates pending password-reset tokens/challenges and signs out other sessions while preserving the current one.
- `POST /sessions/revoke`: revokes only the specified session owned by the authenticated user, with an idempotent timestamp update. It cannot revoke the current session; use the existing Log out action for that. Revoked cookies are rejected by existing authentication middleware. Expired/revoked sessions are excluded from the list, capped at the 100 most recently active records.
- `/2fa/setup`, `/2fa/enable`, `/2fa/disable`: implement authenticator TOTP. Setup requires the existing password, generates a fresh 160-bit secret encrypted with AES-256-GCM and account-bound authenticated data, and binds a five-minute pending setup to the current session. The user enters the setup key manually in an authenticator app, then proves possession with a six-digit, 30-second TOTP. Successful enablement returns ten random recovery codes once; only their hashes are retained. Closing the dialog clears those plaintext codes from component state. If the one-time response is lost, reload status and use the authenticator to disable/re-enroll when new recovery codes are needed. Disabling requires the password and a valid factor, clears secrets/recovery hashes and signs out other sessions.

TOTP accepts the current interval plus one adjacent interval each side and rejects a counter already accepted for the account. Recovery codes are consumed transactionally once. No master/development authenticator code exists. Passwordless/provider-only accounts are directed to manage credentials through their sign-in provider rather than receiving an unverified password-setting action.

## Sign-in enforcement

The existing email/WhatsApp verification step remains intact. After it succeeds, an enabled authenticator returns a random, hashed, five-minute challenge **without issuing a session cookie**. The Login page then requests an authenticator or recovery code. `POST /api/v1/auth/login/verify-2fa` (also `/api`) consumes that challenge and creates the session atomically after successful verification. Five failed attempts exhaust a challenge. Reusing an expired/consumed challenge or an accepted factor fails.

All normal `createUserSession` callers now use the same locked session policy, including signup paths, so alternate session creation cannot skip enabled MFA. Existing OAuth redirects still use the normal verification flow. The legacy unauthenticated OAuth password endpoint may initialize a null password only; a conditional update prevents it from overwriting an existing password and bypassing authenticated password-change checks. Temporary support-token creation/login is unavailable for authenticator-protected accounts; existing support sessions are revoked when 2FA is enabled. API keys and other automation credentials are outside this interactive sign-in setting.

## Storage and deployment

The additive migration `20261029120000_dashboard_security/migration.sql` creates `dashboard_security`, `dashboard_security_challenges`, and `dashboard_session_devices`. No existing account, website, editor, publication, workspace, billing or content record changes during installation. User agents are captured for newly issued normal sessions; session devices use a cascading sidecar table to avoid changing the existing Prisma session model.

From backend, run `npm run db:security-dashboard` before deploying this code, then restart the backend. The targeted installer verifies preservation of existing data and the migration ledger. It never invokes `db push`, schema reset or unrelated migrations. `npm run check:security-dashboard` verifies storage. The project's migration history remains unreconciled; this installer does not mark migrations as deployed.

Set `SECURITY_ENCRYPTION_KEY` to 32 cryptographically random bytes encoded as 64 hexadecimal characters, using the deployment's secret manager. Preserve it across restarts/deployments and back it up securely; changing/losing it prevents decryption of enrolled authenticators. For local setup, the installer creates a random key in the ignored `backend/.env` only when no key exists and no enrolled/pending secrets would be invalidated. It does not print the key. Missing/invalid configuration disables new setup and returns an explicit service-unavailable error rather than bypassing authentication. No rotation or administrative factor-reset flow is added here.

Implementation references: [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238) and [OWASP MFA guidance](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html).

## Tests

Run `npm run build` and `npm run test:security-dashboard` in backend and frontend. Tests cover the RFC SHA1 test vector, replay protection, account-bound secret encryption, strict authenticated/origin boundaries, real PostgreSQL password/session changes, setup, recovery consumption, challenge expiry/attempt limits, and preservation of unrelated accounts. Storage tests use and remove only a UUID-named temporary schema.

With the local app and a disposable Chrome CDP instance on port 9227, run `node scripts/dashboard-security-live-browser.mjs --run` from backend. It tests the PDF layout, actual password changes, device revocation, enrollment, the complete sign-in UI and second-factor gate, disablement, error/retry and mobile navigation. Only the existing OTP **delivery** boundary is replaced with a disposable database OTP fixture; password, OTP validation, security endpoints, cookies and all security storage use the real backend. No email/SMS is sent. The script removes its UUID-scoped users/sessions and checks original user/session/site/workspace/template/migration records are preserved. Evidence is under ignored `.integration-review/security-e2e/`.

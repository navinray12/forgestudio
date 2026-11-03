# Account Settings

Account follows `setting  Account page.pdf` in a dedicated compact settings shell: back button and header, slim Studio tool rail, Settings navigation, profile/name/photo, timezone and date-format preferences, daily utilization and core-work goals, and work function/job title. The workspace picker and Sites/Archive dashboard sidebar are not mounted while Account is open. Other dashboard sections retain their existing layout. Account, Community, Security, and Help & Support share this shell and navigation. See [Community](DASHBOARD_COMMUNITY.md) for the public social feed. See [Security](DASHBOARD_SECURITY.md) for password, authenticator, and session controls. See [Help & Support](DASHBOARD_HELP.md) for help articles, support requests and feature suggestions. See [Notifications](DASHBOARD_NOTIFICATIONS.md) for notification preferences, the inbox and delivery behavior.

Both **Sidebar → Settings → Account settings** and **Profile → My Account** open the same full page. Profile → Settings also opens it. `/dashboard?section=account` survives refresh, and the page has a Dashboard back action. Existing Help & Support behavior is retained.

## Data and safe updates

`GET/PATCH /api/dashboard/account` and `/api/v1/dashboard/account` use existing cookie authentication and require an ACTIVE user. They never accept another user ID, role, email or credential changes. Responses are private/no-store; writes are rate limited. Reads never create records. Preferences are account-wide and private, independent of workspace selection.

The additive `dashboard_account_profiles` table holds first/surname, city, IANA timezone, date format, daily/core-hour goals, function/job title and optional normalized avatar. Initial values use the existing full name, otherwise empty personal fields, UTC and explicit planning defaults (7 daily hours, 3–6 core hours). No sample PDF identity, city or job title is inserted.

Saving updates only this settings record and, when changed, `users.fullName`/`updatedAt`. Existing authentication, email verification, passwords, sessions, roles, subscriptions, workspaces and website/editor data remain intact. Legacy full-name changes are reflected when loading Account; split names are not allowed to override a newer legacy name. Row locks, an expected profile version and expected full name prevent stale tabs from overwriting newer changes. A conflict preserves the draft and requires explicit Reload latest details. Cancel restores loaded values. Failed requests retain the draft for retry.

The sign-in email is displayed read-only with verification status. Email changes require a separate verified identity-change flow and are not implemented as an unverified profile edit.

Daily/core-hour values are personal planning preferences, not activity tracking or enforced schedules. The UI and database constrain core minimum ≤ core maximum ≤ daily utilization. Date/time preferences are stored for reuse by future preference-aware views; this change does not rewrite existing date formatting throughout the application.

## Photos

Edit photo accepts PNG/JPEG/WebP files up to 2 MB, with a preview before Save. The server verifies actual image data, bounds decoded pixels, rotates/crops/resizes to at most 256×256, and re-encodes WebP without retaining the original file/metadata. The normalized image is stored in the protected account record, not a public upload folder. Remote URLs and SVG are not accepted. Remove photo is saved explicitly and affects only the avatar. Saved name/photo update the header; the header loads the persisted photo again after refresh.

Only the two Account API paths allow a 3 MB JSON body so a permitted 2 MB image can fit after base64 expansion. Other API body-size limits remain unchanged.

## Installation and checks

From backend, `npm run check:account-dashboard` checks storage and `npm run db:account-dashboard` applies only `20261028200000_dashboard_account/migration.sql` transactionally. The installer verifies existing user/site/workspace/profile/migration records remain unchanged. It does not modify the migration ledger. Do not use schema reset, db push or blanket migration deployment against the unreconciled migration history.

Run `npm run test:account-dashboard` in backend and frontend. Tests cover field validation, immutable credentials, image normalization, authentication, private scope, defaults, real PostgreSQL persistence, rollback and stale/legacy-name conflicts. Storage tests use a UUID-named temporary schema and drop only that schema.

With the local app and disposable Chrome CDP on port 9227, run `node scripts/dashboard-account-live-browser.mjs --run` from backend. It checks both navigation paths, actual saved preferences/photos, header synchronization, reload, Cancel, photo removal, conflicts, error/retry, mobile layout and large permitted image requests against the real API/database. It creates/removes only UUID-scoped test accounts and verifies original records are preserved. Evidence is in ignored `.integration-review/account-e2e/`.

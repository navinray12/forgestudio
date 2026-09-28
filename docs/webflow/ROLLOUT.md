# Site Studio rollout and operational boundaries

This is an implementation on the `webflow` branch, not an instruction to merge or deploy automatically. Existing live sites and the default branch have not been changed by this increment. Read `PLATFORM_EXTENSION.md` and the verification record before release.

## Database changes

Back up and inspect the target database first. Test against a staging copy. The browser/API test fixtures are deliberately minimal contracts and do not qualify the entire historical Prisma migration chain or an existing customer database.

Studio's migrations must be applied in this order:

1. `backend/prisma/migrations/20260928150000_studio_dashboard/migration.sql` — existing Studio dashboard tables and scope checks.
2. `backend/prisma/migrations/20260928200000_studio_platform/migration.sql` — CMS, locales, reviews, invitations, snapshots, domains, checkout and analytics.
3. `backend/prisma/migrations/20260928210000_studio_constraint_order/migration.sql` — deferred foreign-key checks that permit complete parent cascades while still rejecting invalid standalone deletion at commit.

For a database with a verified, consistent Prisma migration history, use the repository's normal `prisma migrate status` and `prisma migrate deploy` process. Do not erase history, edit checksums, or mark failed migrations successful just to bypass errors. Do not use `db push`, `migrate reset`, or the test fixture to initialize a shared/customer database.

For a database managed through a separate reviewed SQL migration process, apply missing scripts once in the same order and record them through that process. Do not rerun `CREATE TABLE` scripts blindly. The new schema needs explicit runtime-role permissions; migration credentials should not be runtime credentials. The inherited application still contains startup DDL elsewhere, so least-privilege deployment requires a separate legacy audit.

## Build and launch

From `backend`, after configuring the environment and completing reviewed migrations:

```sh
npm ci
npm run db:generate
npm run build
npm start
```

Scheduled CMS publication, invitation email retries, and analytics retention need a separate supervised worker. For development with dev dependencies installed:

```sh
npm run studio:worker
```

For a built production backend (including installations that omit development dependencies), launch the compiled worker instead of the TypeScript development command:

```sh
node dist/modules/studio-next/worker.js
```

The worker runs iterations every 60 seconds. Missed or stopped workers delay scheduled publication and mail delivery; scheduling a record is not evidence of successful delivery. Monitor failures and database access. PostgreSQL row locks coordinate work claimed through these worker paths. No cross-region failover, durable broker, or exactly-once SMTP guarantee is claimed.

Build and serve the frontend through the existing frontend build/reverse-proxy process. Set `VITE_API_URL` when the backend is on another origin. `FRONTEND_URL` must match the browser's frontend origin. Production requires HTTPS and correct secure-cookie/proxy configuration. Never put private provider credentials in a `VITE_*` variable.

## Optional providers

Set backend environment variables through a secret manager or protected deployment configuration, not in source control:

| Capability | Backend configuration | Behavior when absent |
| --- | --- | --- |
| API persistence | `DATABASE_URL` | The backend cannot serve database workflows. |
| Browser origin / links | `FRONTEND_URL` | Cookie-authenticated mutation origin checks must be satisfied. |
| Invitation mail | `STUDIO_SMTP_URL`, `STUDIO_MAIL_FROM` | Invitations remain visible to the matched verified account; SMTP delivery is not claimed. |
| One-time product checkout | `STUDIO_STRIPE_SECRET`, `STUDIO_STRIPE_WEBHOOK_SECRET`, `STUDIO_STRIPE_ACCOUNTS` | Checkout is disabled. Product records alone do not enable payments. |
| Signed analytics tickets | `STUDIO_ANALYTICS_SECRET` (at least 32 characters) | Analytics collection is unavailable/disabled. |

`STUDIO_STRIPE_ACCOUNTS` is a JSON object mapping site UUIDs to deployment-approved Stripe account IDs (`acct_...`) or `platform`. It is configured by the deployment administrator, not selected by a tenant in an API request. The secret key is read from `STUDIO_STRIPE_SECRET`; no `STUDIO_STRIPE_SECRET_KEY` or singular `STUDIO_STRIPE_ACCOUNT_ID` variable is used by this module. The webhook URL path is `/api/v1/studio-next/payments/webhook`.

Stripe is restricted to the configured account for each site. The public shop does not accept client-controlled amounts, and browser redirection does not mark an order paid. Payment completion requires a matching signed webhook. Configure and test provider webhooks in an isolated provider test environment before any live transaction. This increment does not implement refunds, inventory reservation, shipping/tax workflows, recurring subscription reconciliation, or marketplace seller payouts.

TXT ownership verification checks the issued challenge. It does not create DNS records, certificates, CDN distributions, application deployments, or hostname routing. `NOT_PROVISIONED` is intentional and must not be relabeled as live hosting.

## User entry points

- `/dashboard` — existing Studio dashboard and links to site tools.
- `/studio/:siteId` — Collections, Localization, Reviews, Snapshots, Permissions, Domains, Commerce and Analytics.
- `/workspaces/:workspaceId/people` — workspace membership and invitations.
- `/invitations` — invitations for the signed-in, verified email address.
- `/content/:siteId/:collectionSlug` and `/content/:siteId/:collectionSlug/:itemSlug` — published CMS content only.
- `/shop/:siteId` — approved products and configured checkout.

Workspace membership alone does not grant access to every existing site. Assign site-level access deliberately. The new explicit capability overrides are enforced in the new module; inherited routes have not all been requalified against that model.

## Pre-release gates

Rotate previously exposed privileged credentials and revoke affected sessions; the prior branch removed automatic hard-coded password resets but did not perform credential rotation. Review the inherited seed scripts and dependency security advisories. Verify the new module together with the entire legacy application against a staging database, including Google OAuth and real provider test-mode callbacks. Test backups/restores, proxy configuration, rate-limit behavior, accessibility and resource limits before deployment.

The new Designer path detects stale saves; it does not perform CRDT-based simultaneous document merging. Presence is authenticated but process-local. Localization covers configured content overlays, not complete localized URL routing, server-side metadata or hreflang generation. See the feature-boundary matrix in `PLATFORM_EXTENSION.md` for the remaining Webflow-equivalent work.

# Dashboard Billing

The Billing sidebar entry now opens the layout from `main subscription dashboard.pdf`: subscription banner, invoice table and filters, current plan, payment method, quick actions and billing support. The existing dashboard shell, sidebar typography and workspace picker are retained. The PDF's example invoices, Agency subscription, card number and support-hours promise are not inserted as real account data.

## Data and permissions

Billing belongs to the signed-in **account**, like the current subscription and Usage quotas. Switching workspaces never reveals another owner's subscription or invoices. Organization billing-v2 records remain separate.

The new service reads `user_subscriptions`, `subscription_plans` and `billing_invoices` without calling the legacy `getUserSubscription` helper, which can assign a Free plan and generate an invoice during a read. Missing subscriptions display a Free fallback without writing anything. Next billing dates appear only for active paid subscriptions with a future recorded period end. Canceled subscriptions show their recorded access end date.

Both `/api/dashboard/billing` and `/api/v1/dashboard/billing` provide:

| Method and suffix | Behavior |
| --- | --- |
| GET `/` | Account subscription, literal invoice-number search, exact status filter and six-row pagination |
| GET `/invoices/:id/download` | PDF of the stored invoice, restricted to its account owner |
| GET `/payment-method` | Only brand, last four digits and expiry from the connected provider |
| POST `/portal` | Secure provider payment-method update flow; fixed return URL |
| GET `/support` | Ten most recent billing requests belonging to the current account |
| POST `/support` | Persist a request in the existing Billing & Subscriptions support category |

All routes require existing cookie authentication and an ACTIVE account. Query/body schemas reject spoofed user IDs, customer IDs and unknown fields. Writes are rate limited; support request UUIDs make identical retries idempotent and conflicting reuse fails. GETs never create subscriptions, invoices, support tickets or payment identities. Responses are private/no-store. No charges, cancellation, invoice-status changes or site/editor updates are performed by this page. Change/Upgrade Plan links to the existing Plans page, whose purchase behavior is unchanged.

The invoice download is a PDF representation of the existing stored invoice, including number, UTC date, period, currency, amount and status. It does not claim a provider has verified a legacy payment or fabricate a tax registration/address.

## Payment provider setup

The current local environment has no `STRIPE_SECRET_KEY`, so payment management correctly displays unavailable rather than a sample Visa. Invoice downloads and support still work.

The Stripe adapter follows the official [portal session API](https://docs.stripe.com/api/customer_portal/sessions/create) and [payment method update flow](https://docs.stripe.com/customer-management/portal-deep-links). To enable it:

1. Configure the server's `STRIPE_SECRET_KEY`, `FRONTEND_URL`, and Stripe customer portal payment-method-update settings.
2. After a trusted checkout/customer-provisioning process verifies ownership of a Stripe customer, store its customer ID against that account's UUID in `dashboard_billing_customers`. There is intentionally no browser endpoint accepting arbitrary customer IDs or matching customers by email. Never link a customer without verifying account ownership.
3. On a connected account, management opens the provider-hosted card update page and returns to `/dashboard?section=billing`. The dashboard retrieves the default card's display details from the provider after return. PAN/CVC never enter this application's forms or database, and provider errors/secrets are not exposed.

Live card updates require those external credentials and verified customer mappings. Adapter behavior is tested with controlled provider responses; no live payment was attempted in local verification.

## Storage and verification

`20261028180000_dashboard_billing/migration.sql` adds the server-only payment-customer mapping, missing support storage if needed, and a missing billing support category. Existing support tables, categories and records are not replaced. From `backend`, use `npm run check:billing-dashboard` to inspect, or `npm run db:billing-dashboard` to apply the targeted SQL transaction. The installer verifies preservation of existing account, site, workspace, invoice, subscription, support and migration records. Do not use schema resets, db push or blanket migration deployment against the currently unreconciled migration history.

Run `npm run test:billing-dashboard` in both backend and frontend. The backend storage test creates a unique isolated PostgreSQL schema, applies the migration twice, and tests real Prisma reads, paging, search escaping, authorization, support persistence/idempotency, provider identity isolation and canceled/inactive accounts. It removes only its own schema.

With the local frontend/API and a disposable Chrome CDP instance on port 9227, run `node scripts/dashboard-billing-live-browser.mjs --run` from backend. This uses disposable accounts and real authenticated APIs, downloads a real PDF, exercises filters/search/paging/support/workspace changes/reload/mobile/error recovery, verifies original data preservation, and removes its fixtures. Evidence is stored in ignored `.integration-review/billing-e2e/`.

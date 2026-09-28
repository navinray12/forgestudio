# Site Studio platform extension

This is a second implementation increment on `webflow`, preserving the original Designer and dashboard. It is not a claim of complete Webflow equivalence. The new source is in `backend/src/modules/studio-next` and `frontend/src/features/studio-next`.

## Reference access

The connected Webflow tool responded during this increment. Site summaries, one site's locale settings and its page list were read without mutations. No Google browser login, authenticated-dashboard screenshot comparison, private Webflow backend access, or copying of customer site content occurred. Account-specific IDs and content are intentionally not included in this repository.

Public product references used for lifecycle and provider contracts:
- Webflow CMS publishing: https://developers.webflow.com/data/docs/working-with-the-cms/publishing
- Stripe Checkout sessions: https://docs.stripe.com/api/checkout/sessions/create
- Stripe signature verification: https://docs.stripe.com/webhooks/signature

These references describe vendor behavior; the implementation boundaries below take precedence over any inference of parity.

## New screens and backend workflows

| Route / area | Implemented behavior | Boundary |
| --- | --- | --- |
| `/studio/:siteId` | Site tools linked from dashboard site menus and Designer. | Retains, rather than replaces, the existing visual Designer. |
| Collections | Schema editing with 12 field types; item drafts; live snapshots; revision preconditions/history/restore; readiness; scheduling/cancellation; archive/restore; localized item groups; reference validation; atomic JSON imports; paginated management; public collection/item viewer. | JSON import maximum 100 items, export only the current management page, public viewer maximum 100 entries, reference picker maximum 500 groups. No CSV importer, media-upload manager, or native Designer Collection List binding added here. |
| Localization | Secondary locale creation/enablement, page text/alt/title/description drafts, independent publish/unpublish, public-language selector and primary-text fallback. | Primary locale is English. Main page elements only; no localized routing/subdirectories, hreflang/SSR SEO, localized global component slots, or automatic machine translation. |
| Reviews | Persisted threaded comments/replies, author/admin resolution, optional page/element references. | Bounded thread/reply lists. No live document merging, timeline annotations, or cursor replay. |
| Presence | Authenticated cookie/Origin-based WebSocket handshake, authoritative user identity, site permissions, bounded messages/room sizes, cursor and selection events, reconnect support. | Presence is process-local; no Redis fan-out/CRDT/OT. Revocation is checked on subsequent messages after five seconds; existing clients heartbeat every 25 seconds. |
| Designer saves | Shared per-tab queue for manual/autosave, server design hash checks, preserved operational data, content-only layout restrictions, protected-node restrictions. | New Designer save path rejects conflicts rather than merging. Legacy write endpoints still exist and are not all protected by these rules. |
| Snapshots | Capture server-saved design, restore with hash precondition, capture pre-restore recovery point. | Owner-only complete restoration; does not publish, copy credentials or restore external infrastructure. |
| `/workspaces/:id/people` and `/invitations` | Verified-email inbox, invite/accept/revoke/resend, seven-day expiry, admin restrictions, owner protection, SMTP outbox and retry worker. | Workspace membership does not imply site access. No SCIM, SAML SSO, paid-seat accounting or ownership transfer. Independent direct site grants remain on workspace removal. |
| Permissions | Site-wide capability overrides using existing granular permission rows; explicit allow/deny/inherit and owner-only mutation. | No new arbitrary role builder, collection/field-level policies or inheritance across every legacy endpoint. |
| Domains | Validated hostname claims, unpredictable TXT challenge, bounded DNS verification, globally unique verified ownership. | **Ownership verification only. No hosted origin, DNS-provider write, TLS issuance, CDN routing, or production domain deployment.** UI and API return NOT_PROVISIONED. |
| Commerce and `/shop/:siteId` | Product configuration, existing provider price binding, published catalog, one-product hosted checkout, immutable order amount/account, idempotency, raw signed webhooks, payment-state reconciliation, recent orders. | **Not full commerce or subscription billing.** No inventory reservations, multi-item cart, taxes, shipping, refunds, recurring plans, invoices or entitlement provisioning added here. Four supported two-decimal currencies: USD/EUR/GBP/INR. |
| Analytics | Optional consent-gated pageview/conversion events, daily site-scoped pseudonymous browser IDs, 30-day reporting/retention, signed short-lived assignment tickets, bounded metrics, deterministic weighted text experiments. | No automatic significance or winner claim; not unique people, audited revenue or bot-proof counts. Only one running text experiment per site/path; no visual multivariate test builder or full personalization engine. |
| `/content/:siteId/:collectionSlug[/itemSlug]` | Published-only CMS viewer with sanitized rich-text rendering. | Independent client-rendered content viewer, not a new server-rendered CMS page compiler. |

## Content lifecycle

A draft is not a published item. Saving an existing published item updates only its draft; public APIs read the immutable live snapshot until another explicit publication. Publishing validates required field types and same-site references. Reference publication requires a live enabled-locale variant, with primary-language fallback. Archiving a CMS item in this extension **immediately unpublishes it**; this differs from Webflow's staged archive behavior. Restoring does not republish. Dashboard site archive still remains organizational only.

CMS action revisions advance with lifecycle changes. Old revisions cannot silently replace newer ones. Restoring a historical CMS revision creates another draft revision. Schedules carry a revision and publisher identity; the worker checks both again before publishing. Subsequent draft edits clear the schedule. The worker must run separately.

References use translation-group UUIDs. The public content viewer displays reference IDs; it does not recursively resolve references into linked content. Collection schema changes cannot remove or retype populated fields. New required fields can make the next publish require additional content without mutating already published snapshots.

## Security changes and limits

The old custom-post-type router authenticated a user without first enforcing site-specific access. It now resolves the owning site from a site/collection/entry ID and checks the appropriate capability before invoking retained controllers. Those legacy controllers still need full schema and integration qualification.

The previous presence server accepted identity from JOIN messages. Identity now comes from the validated database session, with exact Origin checks. Client identity fields are ignored. This is not a replacement for application-wide authorization testing or cluster-wide presence infrastructure.

Manual save/autosave no longer swallow server failures and show false success. Failed saves retain a local recovery copy and surface an error. A lost connection cannot create a new server hash. Do not mistake local recovery for a server save. Explicit authentication/permission/not-found failures no longer fall back to opening cached design content in the Designer.

New APIs use parameterized queries, foreign keys, scoped resource checks, explicit mutation fields, bounded bodies, session validity checks and revision/hash preconditions. The additive schema migration does not erase existing data. No runtime schema repair or migration-history rewriting was introduced. Old application modules, uploads, custom-code execution, hosting, billing, schema bootstraps and public rendering are not automatically certified by the new tests. This is not a 10/10 security or availability guarantee.

## Configuration and operation

1. Back up the existing database and reconcile its baseline before applying migrations in staging.
2. Install the existing locked dependencies (`npm ci` in backend and frontend). This increment adds no runtime dependency.
3. Apply reviewed migrations with `npx prisma migrate deploy`; generate the Prisma client with `npm run db:generate`.
4. Configure `DATABASE_URL` and exact frontend `FRONTEND_URL`. New writes require matching `Origin` and `X-Studio-Request: 1`; production should use HTTPS. `VITE_API_URL` is optional for same-origin frontend/API hosting.
5. Start the backend and frontend normally. Start the separate worker with `cd backend && npm run studio:worker`. In production supervise this process, monitor failures, and use graceful shutdown. It performs due CMS publication, invitation mail retries, and analytics retention approximately once per minute.

Optional server-only settings:

| Variable | Purpose |
| --- | --- |
| `STUDIO_SMTP_URL` | SMTP transport for invitations; do not log credentials. |
| `STUDIO_MAIL_FROM` | Authorized sender identity. SMTP is not used without this and FRONTEND_URL. |
| `STUDIO_ANALYTICS_SECRET` | At least 32 characters of random signing material. Rotation invalidates assignment tickets and changes pseudonymous IDs. |
| `STUDIO_STRIPE_SECRET` | Server-side Stripe key for the deployment's approved payment accounts. |
| `STUDIO_STRIPE_WEBHOOK_SECRET` | Endpoint signing secret; provider sends raw JSON to `/api/v1/studio-next/payments/webhook`. |
| `STUDIO_STRIPE_ACCOUNTS` | JSON mapping of site UUIDs to deployment-approved `acct_…` identifiers or `platform`. Tenants cannot select another payment account through the API. |

Never put these secrets in frontend `VITE_*` settings, source files, screenshots or command arguments. Configure via a secret manager/protected environment. The provided CI tests use explicitly fake provider responses and test-only secrets. No test generates a live payment or a DNS-provider write.

An analytics conversion can be emitted by a public element with custom attribute `data-studio-goal="conversion"`, or by dispatching `studio:conversion`. Both are ignored without optional analytics consent. Do Not Track and Global Privacy Control opt-outs are honored by the new runtime. The consent setting is separate from the inherited site's cookie banner. Coordinate the two before a production privacy rollout.

## Testing

`backend/tests/studio-next/validation.test.ts` tests pure validation and signature/content policies.
`backend/tests/studio-next/platform.test.ts` sends real HTTP requests through the new router with real PostgreSQL session records; it exercises tenant access, invitations, CMS lifecycle, design conflicts, localization, reviews, domain verification, payment reconciliation, analytics and WebSocket identity. Stripe transport and DNS resolution are injected test doubles.

`tests/studio-next/browser_e2e.py` drives the built React frontend against the new HTTP router and PostgreSQL, without intercepting successful API responses. Its test-only host is `backend/tests/studio-next/browser-server.ts`. Synthetic accounts receive real database session cookies; no Google OAuth or production login is tested. The harness serves only the new module and a minimal session-profile endpoint, not every inherited API. It is never imported into production.

Tests require the disposable database name **forgestudio_studio_test** and refuse other names. The schema fixture is a minimal legacy contract; it does not certify the historical Prisma migration chain. Session metadata from browser tests is private, local to the runner, and must not be uploaded as an artifact. Only result reports/screenshots are retained.

Run `npm run test:studio:next` with `STUDIO_TEST_DATABASE_URL` configured. The existing verification workflow also builds both complete applications and runs the earlier Studio tests. Source files or a workflow definition alone are not passing evidence. Actual execution results are recorded separately after completed CI runs.

## Work still needed for exhaustive equivalence

Full canvas/style/animation/component-slot/variant parity; native new-CMS Designer bindings; complete collections/search/import/export media workflows; collaborative document merging; localization routing and SEO; custom roles and enterprise identity; production hosting/CDN/TLS/domain routing; full orders, subscriptions, tax/refund/entitlement reconciliation; robust analytics/optimization infrastructure; accessibility/cross-browser/load/fault audits; existing database migration qualification; real provider sandbox tests; and user-authorized live deployment remain separate deliverables. No change in this increment should be described as full Webflow backend source replication or exhaustive production qualification.

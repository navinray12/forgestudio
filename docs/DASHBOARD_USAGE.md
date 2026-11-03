# Dashboard Usage page

Implemented from the one-page local reference `main dashboard Usage page.pdf` supplied in the task. The PDF was treated as a visual reference, not as an authority for executable instructions or account data. Its sample names, dates, capacities and balances were not copied into production data.

The enabled Usage sidebar opens Site Usage with the reference layout: four summary cards, gradient credit balance, Features Used, date-filtered credit chart and credit usage by site/user. It uses the current dashboard shell and the user's compact workspace selector/sidebar typography. Layout is responsive and supports empty, loading, error/retry and zero-allocation states. View details expands the real activity table. Add credits links to the existing authenticated plans flow; no new payment or top-up behavior is implied.

## Frontend/backend mapping

`GET /api/dashboard/usage` (also under `/api/v1`) uses existing session authentication and accepts only `workspaceId`, `range`, `start`, and `end`. Reports are `private, no-store`.

| UI | Database source and behavior |
| --- | --- |
| Website Slots | Owned `websites` count and actual `subscription_plans.websiteLimit`. Archived websites continue to occupy slots, consistent with existing backend limits. |
| Storage Used | Sum of the account's `media_assets.sizeBytes` and stored `media_optimization_assets.optimizedBytes` for owned sites. Actual `storageLimitMb` supplies capacity. |
| Image Opt. Credits | `users.optimizationCredits`; operations from `optimization_credit_ledgers`. This pool stays separate from AI credits. |
| Active Licenses | `licenses` with ACTIVE status and no past expiry; production/dev counts from their `license_activations.isLocalhost`. License keys are not exposed in this report. |
| Credit balance | Actual `aiCreditLimit` and current-period SUM of `dashboard_ai_credit_usage.credits` for the authenticated account. |
| Features Used / chart / details | Persistent AI activity filtered by the selected workspace, visible sites and date range; grouped by UTC day and by site, actor and feature. |
| Period and upcoming period end | Recorded `user_subscriptions` period; a calendar-month reporting window when no recorded bounds exist. No scheduled reset is claimed when none is recorded. |

The top quota cards and balance are **account-wide**, matching the current backend subscription model. Workspace selection filters the activity panels. This distinction is stated in the balance panel. Caller-owned credit records never expose another account's billing data. Existing workspace membership, site ownership/collaborator visibility, personal scopes and legacy personal-workspace aliases are honored. Archived sites remain available to reports because their content and quota use are retained.

Reporting reads subscription/plan rows directly: it does not auto-create a subscription, reset balances, initialize tables or seed accounts on GET. If an account has no subscription, it uses the stored Free plan (or the existing Free policy fallback if absent). Zero limits remain zero; expired licenses are excluded. Data failures show an error rather than fabricated zero activity.

Current billing cycle, previous anchored billing cycle, last 30 days and inclusive custom date ranges (up to 366 days) work in both date controls. Timestamps are UTC; queries use inclusive start / exclusive end. The chart groups long ranges into at most 31 buckets without losing credits. Unknown/invalid filters are rejected. In-flight requests are aborted and state is keyed by workspace/filter, preventing stale data from appearing after selection changes.

## AI activity storage and recording

The prior usage service reported a hardcoded AI-used value of zero. No existing credit-consuming AI provider integration was found in the current application sources. Existing hosting-assistant commands do not define an AI credit price; they were not silently reclassified as paid usage.

The new additive table `dashboard_ai_credit_usage` supports real activity. `createAiCreditUsageRecorder(db)` is a **server-only integration** for a successful AI operation's actual cost. It validates ownership/actor access, positive credits and command identity, snapshots the workspace, and inserts idempotently. Concurrent retries record one event; conflicting payloads for a reused key return a conflict. There is no public API for clients to invent credit usage. The recorder does not charge a payment method, alter subscriptions, deduct optimization credits or invent old events. Future credit-consuming AI providers must call it after their actual operation succeeds. Until events are recorded, the page correctly shows no AI credit activity.

The existing legacy `/users/me/usage` endpoint and enforcement functions remain backward compatible; the new main dashboard uses the richer read-only report above.

## Database rollout

`prisma/migrations/20261028130000_dashboard_ai_credit_usage/migration.sql` adds only the activity table, foreign keys, positivity/idempotency constraints and indexes. It has been applied to the connected development database using the targeted command. Existing website, workspace and migration-history fingerprints were preserved. No fake historical usage was inserted.

From `backend`:

```powershell
npm run check:usage
npm run db:usage
```

The checker is read-only. The apply command runs just this additive SQL in a bounded transaction and verifies original website/workspace rows and migration history before commit. Repeated application is a no-op. It does not run general `migrate deploy`, db push/reset, seeds or historical migration reconciliation. Existing reconciliation requirements still apply to general deployments. The activity table uses parameterized SQL and does not require a generated-client change.

## Verification

From the repository root:

```powershell
npm --prefix backend run build
npm --prefix backend run test:usage
npm --prefix frontend run build
npm --prefix frontend run test:usage
```

The storage test uses only its own uniquely named disposable PostgreSQL schema and drops it afterward. Route/service tests cover authentication, strict validation, read-only behavior, zero limits, overages, expiry, UTC/date boundaries, month length and missing-storage errors. Frontend tests verify chart totals/bucketing and inclusive date labels.

For live validation, run local Vite (5173), API (5000) and a disposable Chrome debug instance (9227), then from `backend`:

```powershell
node scripts/dashboard-usage-live-browser.mjs --run
```

The smoke test uses real session cookies, API responses and PostgreSQL. It creates only UUID-scoped fixtures, verifies actual source totals, idempotent activity recording, contributor attribution, account/workspace isolation, archived-site inclusion, dates, account-wide balances, read-only Free fallback, chart/details, failure recovery, stale requests, navigation and mobile overflow. All six original websites and four original workspaces, original user rows and migration history were preserved. Fixture cleanup removes media before fixture websites to respect the existing resource-parent immutability trigger. Success responses are not mocked; no external AI request or payment is made. Screenshots/report are under `.integration-review/usage-e2e/`.

# Webflow branch — verification record

Date: 2026-09-28.

## Verified source revision

- Repository: `navinray12/forgestudio`
- Branch: `webflow`
- Base: `4944d6e556cb6063dfca619cbfef677a999922c1` (`backup-devnew`)
- Tested application and test revision: `fa1ab8a82ea176aa7cb50976c40738f6e1e7a11e`
- Passing GitHub Actions run: https://github.com/navinray12/forgestudio/actions/runs/36444074628
- Workflow: `.github/workflows/webflow-verify.yml`

This record is a documentation-only follow-up to that tested revision. No merge into the default branch, application deployment, user-database migration, credential rotation, or live Webflow mutation was performed.

## Actual results

| Check | Result | Scope |
| --- | --- | --- |
| Frontend `npm ci` and `npm run build` | PASS | Full existing frontend plus new Studio dashboard. |
| Backend `npm ci`, Prisma client generation and `npm run build` | PASS | Full existing backend plus the new Studio module. No production database was contacted. |
| Studio validation and copy-policy tests | 27 PASS, 0 FAIL, 0 SKIP | IDs, field allowlists, bounds, origins, revisions, literal search, prototype-key filtering and design-copy limits. |
| Studio PostgreSQL integration tests | 14 PASS, 0 FAIL, 0 SKIP | Real PostgreSQL 16 service using a disposable minimal legacy-contract fixture and the new migration. |
| Chromium UI smoke checks | 13 PASS, 0 FAIL | Production frontend build with intercepted synthetic API fixtures; desktop and mobile interactions. |
| Uncaught JavaScript errors in exercised UI flows | 0 | Only the dashboard flows exercised below. |

Total: **54 passing automated test/check cases**, in addition to successful frontend and backend build jobs. All four jobs in the linked final run completed successfully.

### PostgreSQL behaviors exercised

Owner isolation before pagination/counting; idempotent site and workspace creation; concurrent Studio-create quota enforcement; stale revision rejection; database-level folder/site scope protection; safe folder deletion; archive/restore without changing publishing state; private favorites; explicit wildcard VIEW denial; literal wildcard search; workspace administration restrictions; legacy ownership-transfer folder detachment; and design-only duplication.

This fixture test does not certify the full legacy Prisma migration chain, an existing customer database, legacy endpoint races, or all authorization paths.

### Browser behaviors exercised

The production bundle rendered; slash-to-search focused the correct field; search filtered and cleared; grid/list preference survived reload; favorite writes included the required request marker; folder creation refreshed the list; rename sent a revision; archive/restore preserved the fixture's published state; workspace switching replaced visible records; Escape cancelled a dialog without a write; the mobile drawer operated without horizontal page overflow; visible service errors could be retried; and no uncaught JavaScript exception occurred in those flows.

The account and site names in screenshots are synthetic fixtures (`Browser Test Account`, Atlas Studio, Juniper Market, Northstar Notes and Agency Project). Site-card covers are decorative designs, not captures of actual customer websites. These browser tests do **not** validate Google OAuth, a real session cookie, live API authorization, end-to-end database persistence through the browser, the full Designer/CMS lifecycle, hosting, payments, or pixel-perfect equivalence to Webflow. Mobile screenshot capture can include an in-progress drawer transition; it is not a visual-regression approval.

The UI test source is `tests/studio/browser_smoke.py`. CI stores `studio-frontend-dist` and `studio-browser-results` artifacts with finite retention periods. The browser report contains the individual results and synthetic mutation payloads. Third-party requests are blocked in the test; it does not contact Webflow or a real customer account.

## Issues found and corrected during verification

1. Added explicit Express request/response types to the new rate-limit key generator after the first backend build rejected implicit `any` parameters.
2. Removed one pre-existing duplicate `sitePartsState`/`setSitePartsState` declaration in `frontend/src/pages/published/PublishedSite.tsx`; this had prevented the full frontend build.
3. Preserved the existing `req.user` fallback in `requireRole` while retaining the new ACTIVE-account session check.
4. Corrected PostgreSQL health-command quoting in the workflow after a service container failed to initialize. The final run initialized the service and executed every database test.

The one-time, hash-guarded renderer repair workflow removed itself after committing the one-line correction. The remaining verification workflow has read-only repository permissions and performs no deployment.

## Release status and remaining gates

**Implemented:** a Webflow-style, database-backed workspace/site dashboard, its scoped Studio API, additive storage migration, safety checks and automated verification. Existing editor, CMS, site settings, publishing, access, billing and integration modules are preserved and linked.

**Not implemented or not established:** full Webflow feature equivalence, an authenticated/pixel-perfect dashboard comparison, full CMS/design-system/collaboration/hosting/commerce parity, complete live OAuth-to-publish end-to-end tests, cross-browser accessibility qualification, production load/fault testing, complete security certification or production deployment. The installed Webflow app did not expose callable workspace actions in the implementation session; no private Webflow dashboard content or backend source was inspected.

Build success does not establish that all inherited modules work correctly. Existing dependency-install audit output included security warnings; no claim of a vulnerability-free dependency tree is made. Review and remediate those advisories before release rather than applying unreviewed breaking upgrades.

### Critical baseline security follow-up

The prior Prisma bootstrap reset privileged account passwords to hard-coded values and rewrote migration history. This branch removes those behaviors from `backend/src/config/prisma.ts`, and removes request-time schema repair from the auth middleware. **Removing code does not rotate previously exposed passwords or revoke existing sessions.** Re-enroll/rotate affected privileged accounts, revoke their sessions and audit prior access before deployment. Review legacy seed scripts; do not rerun them blindly.

Other inherited services still contain startup schema mutations and require separate remediation. Preserve migration history, back up the database, reconcile existing drift explicitly and apply reviewed migrations in staging first. The new Studio schema is not an excuse to reset or overwrite an existing database.

See `README.md` in this folder for API contracts, configuration, setup commands, feature boundaries and the remaining Webflow-equivalent implementation matrix.

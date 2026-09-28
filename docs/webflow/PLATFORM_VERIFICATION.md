# Site Studio platform extension — verification record

Date: 2026-09-28.

## Verified revision and CI

- Repository: `navinray12/forgestudio`
- Branch: `webflow`
- Previous delivered increment: `c67a42bd305103f62af7417a57f9c505b34b36a4`
- Tested application revision: `747698d01d77d6dc32725c5f657097181784f670`
- Passing GitHub Actions run: https://github.com/navinray12/forgestudio/actions/runs/36460277583
- Workflow: `.github/workflows/webflow-verify.yml`

All six jobs in this run completed successfully. Later rollout/verification documentation changes do not change the tested application source. This increment was committed only to `webflow`; no merge to the default branch, production database migration, Google browser login, live payment, SMTP delivery, DNS-provider write, TLS provisioning or application deployment was performed.

## Actual execution results

| Check | Result | Qualification |
| --- | --- | --- |
| Full frontend installation and build | PASS | Existing application plus the new screens; `npm ci`, TypeScript project build and Vite production build. |
| Full backend installation and build | PASS | Existing application plus new APIs; `npm ci`, Prisma client generation and TypeScript compilation. |
| Existing Studio validation cases | 27 passed | Earlier dashboard validation and copy-policy suite, rerun in the final workflow. |
| Existing Studio PostgreSQL cases | 14 passed | Earlier dashboard persistence and isolation suite, rerun in the final workflow. |
| Existing dashboard browser smoke cases | 13 passed | Production frontend with intercepted synthetic API fixtures. |
| New Site Studio validation and API cases | 81 passed, 0 failed, 0 skipped | 22 validation cases plus 55 real HTTP/PostgreSQL/WebSocket cases. Provider transports are controlled test substitutes. |
| New Site Studio browser workflows | 12 passed, 0 failed | Built frontend, real new-module routes, PostgreSQL persistence and real database-backed session cookies; synthetic accounts. |

Total: **147 passing automated cases**, plus both successful full application builds. This count is not a security rating or proof of exhaustive feature parity. The browser report records zero uncaught JavaScript exceptions in the exercised flows; that is not a claim that every application screen has no possible error.

### Final job identifiers

| Job | GitHub job ID | Result |
| --- | --- | --- |
| studio-tests | 109049195378 | PASS |
| studio-platform-tests | 109049195630 | PASS |
| backend-build | 109049195794 | PASS |
| frontend-build | 109049195985 | PASS |
| studio-browser-smoke | 109049520361 | PASS |
| studio-platform-browser | 109049520742 | PASS |

## New browser workflows actually exercised

1. A database-session-authenticated account opened Site Studio in the production frontend.
2. The account created a typed rich-text collection through the real API.
3. It saved a CMS draft and confirmed the draft was absent from public reads.
4. It published the item and verified sanitized public HTML from persisted content.
5. It edited published content and confirmed the old live snapshot survived a reload.
6. It posted, replied to and resolved a database-backed review thread.
7. It captured and restored a saved design through the real backend.
8. It created, enabled, edited and published a French locale, then checked the published translation through the public API.
9. A second verified synthetic account accepted its own workspace invitation.
10. The Site Studio viewport was exercised at mobile width without horizontal document overflow; the content table remains an independently scrollable region.
11. Anonymous and reviewer views were checked for authentication and write-control restrictions.
12. The exercised flows emitted no uncaught browser JavaScript exception.

These tests use `tests/studio-next/browser_e2e.py` and the isolated host `backend/tests/studio-next/browser-server.ts`. The host serves the actual new module, a minimal session-profile endpoint and the production frontend bundle. It does not serve or qualify every inherited backend endpoint. It has no production authentication bypass and is not imported into the production server.

Synthetic users receive real session cookies backed by PostgreSQL. The browser does not intercept successful CMS/localization/review/snapshot/invitation API calls. **Google OAuth, real provider test-mode callbacks, live customer accounts, production hosting and the full legacy Designer-to-publish lifecycle are not tested by this harness.**

## Backend and security behaviors tested

The new 81-case suite checks session absence/expiry/inactive accounts; hostile origins and missing request markers; cross-tenant reads/writes; invitation identity/verification/expiry/revocation/replay; owner/admin restrictions; schema and typed-field validation; draft/live separation; references and locale scope; stale revisions; atomic import rollback; scheduling with fresh permission checks; design-hash conflicts; protected components including duplicate-ID mutations; content-only editing restrictions; pre-restore snapshots; capability overrides; review authorship; TXT challenge ownership; duplicate domain claims; checkout configuration/amount/account validation; signed webhook reconciliation and replay; opt-in analytics/assignment/event rules; and authenticated WebSocket identity.

PostgreSQL is a real service in CI. The tests install Studio migrations onto a disposable minimal legacy-table contract. That is not a test of the entire historical Prisma migration chain, an existing customer database, cross-region failover, production-scale concurrency, or every legacy authorization path. Stripe transport and DNS resolution use injected substitutes. SMTP is not delivered to real recipients.

## Corrections made during verification

Initial runs found and led to fixes for SQL parameter type inference in invitation/domain updates, the installed Nodemailer transport contract, foreign-key timing during complete parent cascades, an ambiguous CMS field-type label, and the locale checkbox's asynchronous state behavior. A locale-screen rewrite also introduced a client/API contract regression; it was replaced with the original correct contract plus the small optimistic checkbox fix. The final passing run includes that correction, rather than treating earlier partial runs as success.

The database correction is additive: `20260928210000_studio_constraint_order` makes specific foreign keys deferrable so complete site/user cascades can finish while invalid standalone references still fail at commit. A further design test rejects duplicate element IDs used to conceal a protected-component change.

Temporary source-transfer/repair workflows removed themselves. The retained verification workflow has read-only repository permissions and performs no deployment.

## Artifacts and screenshots

The final `studio-platform-results` artifact has ID `10986831686` and contains `site-studio-e2e.json`, `site-studio-desktop.png`, `site-studio-mobile.png` and the test server log. Its recorded SHA-256 is `ce8c398522ada06046068cb883049e4d8cd86f36c7acce1fcdbc88e18e2c8c10`.

The report was downloaded and inspected: 12 passed, 0 failed. Desktop and mobile screenshots show the implemented Collections screen using the synthetic `Integration site` / `Stories` / `First story` records. They are not screenshots of the user's private Webflow dashboard and not evidence of pixel-perfect equivalence. The runner's private session metadata is not included in the uploaded artifact. CI artifacts have finite retention.

## Delivered implementation and remaining boundaries

The increment adds new frontend/backend workflows for typed CMS and publication, page and item localization, workspace invitations and membership management, site capability overrides, reviews and authenticated presence, hash-checked Designer saves and snapshots, TXT domain ownership verification, one-time hosted checkout with order reconciliation, opt-in analytics with text experiments, and a shared domain-command path used by both manual Designer saves and explicitly approved AI copy changes. AI proposals are durable changesets with provider/model/run metadata and can be applied or rejected. Dashboard and Designer entry points lead to these tools. See `PLATFORM_EXTENSION.md` for the exact contract and feature matrix.

**This is not an exhaustive Webflow clone.** The following remain incomplete or unverified: full Designer canvas/style/animation/component-slot parity; native binding of the new CMS into Designer collection widgets; simultaneous CRDT/OT document merging; cluster-wide presence; localized URL routing/hreflang/server-side SEO; enterprise SSO/SCIM/seat billing; domain routing/TLS/CDN/build-host provisioning; multi-item carts, inventory, shipping/tax/refunds, recurring subscriptions and entitlements; complete analytics/optimization functionality; full accessibility/cross-browser/load/fault testing; production migration qualification; and live provider/Google-login end-to-end verification.

Commerce checkout remains disabled without approved backend provider configuration. Domain verification reports ownership only and keeps hosting at `NOT_PROVISIONED`. Saving a published CMS item's draft does not update its live snapshot; however, archiving a CMS item in this implementation immediately unpublishes it, rather than reproducing Webflow's staged archive behavior. Dashboard site archive remains organizational only. These differences are intentional and visible, not hidden behind fake-success states.

## Reference access and rollout

Unlike the prior increment, the connected Webflow app responded during this session. Authorized site summaries, locale settings and page metadata were read without modification. No authenticated dashboard screenshot comparison or private Webflow backend source access occurred.

See `ROLLOUT.md` for all three Studio migrations in order, provider settings, worker startup and release gates. Production worker launch after building is `node dist/modules/studio-next/worker.js`. The Stripe environment contract is `STUDIO_STRIPE_SECRET`, `STUDIO_STRIPE_WEBHOOK_SECRET` and `STUDIO_STRIPE_ACCOUNTS` (JSON site-to-approved-account mapping), not an invented singular account or secret-key setting.

Before deployment, reconcile the inherited database baseline, review remaining startup DDL and dependency advisories, rotate previously exposed privileged credentials, revoke affected sessions, and test the full application and real provider sandboxes in staging. Successful new-module tests do not remove those inherited risks. No production rollout or complete security/availability certification is claimed.

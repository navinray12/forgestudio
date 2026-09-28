# Site Studio integration tests

Run `npm run test:studio:next` from `backend` with `STUDIO_TEST_DATABASE_URL` pointing to a disposable database named exactly `forgestudio_studio_test`. These tests create minimal legacy-contract tables, install the additive Studio migrations, and create synthetic users and sessions. Never use a customer database.

The fixture applies these migrations in order:

1. `20260928150000_studio_dashboard`
2. `20260928200000_studio_platform`
3. `20260928210000_studio_constraint_order`

`validation.test.ts` tests data validation and policy functions. `platform.test.ts` exercises real HTTP requests, PostgreSQL persistence, session authentication, permission denials, CMS draft/live transitions, schedules, workspace invitations, WebSocket presence, provider-event validation and concurrency. Stripe and DNS dependencies are test substitutes; SMTP is not sent to real recipients.

`browser-server.ts` is a disposable, test-only host of the actual new API router and production frontend build. `tests/studio-next/browser_e2e.py` uses genuine database-backed session cookies and API writes, not intercepted success responses. It does not verify Google OAuth, production deployment, a live Stripe account, SMTP delivery, domain provisioning, the complete legacy backend, or full Webflow parity.

The verification workflow also runs the full frontend and backend builds and the original Studio tests. A successful test-file commit is not a passing result: inspect the workflow run associated with the exact source revision.

Session metadata is written outside uploaded artifact directories with restricted filesystem permissions. Do not upload it, log cookies, or add test authentication helpers to the production server.

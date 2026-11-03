# Phase 2: Workspace Members and email invitations

Implemented in `forgestudio` on 26 October 2026 using the unchanged `forgestudio-ai-merge-main-integration` archive as the source. The source extraction's 2,575 project files were verified byte-for-byte against the archive. Source archive SHA-256: `ca07efa148d62631027d3f2d41ad93e589ebf1697efbc97065164f6286e68d96`.

## Delivered

The source Members screen, responsive styles, member/invitation models, invitation capture and acceptance page were migrated. Backend behavior was adapted to the target's existing cookie authentication, workspace memberships, workspace creation service, audit log, and SMTP settings. The source's broader organization, command-journal, identity-provider, RLS and outbox schemas were not copied.

- Members is enabled in the Phase 1 sidebar. The navbar, Settings popup, site controls, workspace selection, editor and legacy Website tools remain available. Usage and Billing migrations remain deferred.
- The sidebar and Members screen share one workspace selection. Members provides search, role filtering, joined dates, Active/inactive status, owner/admin/member roles, owner-controlled role changes, guest invitation entry, pending invitations, delivery status and invitation history.
- Personal Workspace offers a way to create a real team workspace through the existing workspace creation service. `/dashboard/workspaces/:workspaceId` opens Members inside the existing Dashboard shell, including for authenticated global roles other than USER. This route grants no additional platform privileges.
- Invite by normalized email supports both existing users and recipients who have not signed up. Only a verified, active account matching the invited email and any already-bound recipient ID can accept.
- The email link carries proof in a URL fragment. The invitation page removes it from the URL and stores it in session storage for authentication return. Login, signup, OTP completion, login/signup cross-links, and the existing Google/GitHub login entry points retain the invitation context without forwarding its proof to identity providers. No authentication service or platform role model was replaced.
- Acceptance atomically creates WorkspaceMember with the invited role, marks the invitation Accepted, increments the Members version and records an audit event. No pending member is granted access before acceptance. Repeated/concurrent acceptance is safe; an existing role is preserved rather than overwritten by an old invitation.
- OWNER may invite ADMIN or MEMBER and change other active members' roles. ADMIN may invite MEMBER. MEMBER can read the Members view. The owner's role is protected. Issuer authority is rechecked when accepting and delivering an invitation. Workspace membership retains the target's existing explicit website owner/collaborator access rules; it does not grant new site or organization privileges automatically.
- Resend rotates the token, extends expiry seven days, and enforces a 60-second cooldown. Revoked/expired/superseded proofs cannot grant membership. Archived workspaces are read only; existing pending invitations can still be revoked.
- Creation has request-key replay protection and duplicate pending-email protection. Resend/revoke use optimistic versions and request-key replay protection. Workspace row locks serialize acceptance, invitations and role commands. Commands require JSON, an explicit request-intent header and a valid request key; role/invitation changes require If-Match. Request and invitation limits bound email creation/resend traffic.

## Email delivery

The invitation record itself is a durable queue. The server starts a worker when SMTP, signing key and frontend origin are configured. It claims jobs with `FOR UPDATE SKIP LOCKED`, uses expiring leases and fenced acknowledgements, and retries transient failures with bounded exponential backoff (maximum eight attempts). Terminal failures appear as Delivery failed; managers can resend to queue a new version.

Tokens are derived using a dedicated stable HMAC key and only hashes are stored. Tokens are never returned in Members API responses or put in jobs, audit details or logs. Worker errors log a fixed operational message rather than provider error bodies. Mail uses the existing Nodemailer/SMTP service and settings, with explicit connection and socket timeouts. Invitations fail closed when delivery configuration is absent; the OTP service's development simulation is not used for invitations.

SENT means the SMTP server accepted the message, not confirmed inbox delivery. Delivery is at least once: a crash after SMTP acceptance but before database acknowledgement can resend the same Message-ID. A message already being sent during revoke can arrive, but its revoked proof cannot be accepted.

## API

Routes are mounted at `/api/v1/tenant-workspaces` and `/api/tenant-workspaces`, using the existing session middleware. Mutation identity always comes from the authenticated session, not the payload.

| Method and relative path | Behavior |
| --- | --- |
| `GET /` | List accessible workspaces and current workspace roles. |
| `POST /` | Create a workspace with the existing service. |
| `GET /:id` | Members details, actual account status and Members ETag. |
| `GET /:id/invitations` | Manager-only pending/history and delivery status. |
| `POST /:id/invitations` | Invite by email as ADMIN or MEMBER. |
| `POST /:id/invitations/:invitationId/renew` | Resend with a rotated proof and extended expiry. |
| `POST /:id/invitations/:invitationId/revoke` | Revoke a pending invitation. |
| `POST /invitations/:invitationId/resolve` | Verify recipient and proof and display acceptance details. |
| `POST /:id/invitations/:invitationId/accept` | Atomically accept and activate membership. |
| `PATCH /:id/member-role` | Owner-controlled role changes with version checks. |

No public invitation-detail endpoint exposes a recipient email. Invitation resolution requires authentication. Source token and response contracts are preserved for the migrated UI.

## Additive migration

`backend/prisma/migrations/20261026190000_workspace_members_email_invites/migration.sql` is transactional and contains:

1. A new `workspaces.membersVersion` counter for optimistic Members commands.
2. `workspaces.lifecycleStatus` only if absent, defaulting legacy workspaces to ACTIVE and preserving any existing archived values.
3. A target-owned `workspace_email_invitations` table with foreign keys, role/status constraints, request keys, hashed proof, delivery metadata and indexes. A partial unique index prevents duplicate pending invitations for the same workspace/email.

The live database already has an unmanaged `workspace_invitations` table whose organization requirement and lifecycle/outbox dependencies do not match this checkout. The new table avoids altering, consuming or invalidating those existing invitations. Legacy organization-null workspaces remain supported. No existing rows are deleted, transformed, backfilled into a new schema, or granted extra privileges. The checked-in Prisma client was regenerated. Backend build now copies the generated JavaScript/WASM client into dist, fixing an existing runtime packaging omission.

## Validation

- Prisma schema validation and client generation: passed.
- Backend production build: passed, including generated-client packaging.
- Frontend production build: passed; existing large-chunk warnings remain.
- Focused ESLint on the migrated workspace feature, Dashboard integration and workspace selection: passed.
- Git whitespace checks: passed after normalizing newly generated declaration comments.
- 14 backend tests passed: Phase 1 route regression, proof/configuration validation, actual Nodemailer delivery to a local SMTP capture server, and nine PostgreSQL integration scenarios. These cover authentication, cross-workspace denial, owner/admin/member restrictions, unknown-email invitation, duplicate/idempotent requests, SMTP retry, hashed proof, verified account binding, concurrent acceptance, Active status, role changes/stale versions, resend/revoke, issuer demotion, concurrent worker claims/fencing, terminal delivery failure, archived workspace behavior, expiration, missing SMTP and transaction rollback on audit failure.
- PostgreSQL tests applied the migration in a uniquely named disposable `forge_members_test_*` schema, with fixture users/workspaces and the real generated Prisma client. The schemas were removed afterward. Public application tables and migration history were not changed.
- 13 browser checks passed in headless Chrome: Phase 1 shell, invitation/delivery UI, resend, revoke, no premature membership, fragment capture, signup + OTP return, existing login + OTP return, accept to Active membership, role controls, mobile overflow and absence of runtime exceptions. Browser APIs/authentication/OTP/email are mocked; backend database and SMTP transport behavior are tested separately. No external email was sent and no real user account was created.
- Desktop and mobile screenshots were visually reviewed. Browser harness is `frontend/scripts/workspace-members.browser-smoke.mjs`; artifacts/results are in ignored `.integration-review/phase2-browser-artifacts/`.

To rerun backend tests, build first and set `WORKSPACE_TEST_DATABASE_URL` explicitly to a database where a disposable test schema may be created, then run `npm run test:workspace-members` in backend. Without that variable the PostgreSQL test is skipped. The test module does not import Prisma's application startup schema-repair routine.

## Confirmed live blockers

`npm run check:workspace-members` in backend is a read-only readiness check. It currently reports NOT READY:

- Database is reachable, but this checkout's baseline differs from live migration history. `20260929000000_complete_legacy_core` is unfinished. Live history also contains migrations absent from this checkout.
- The Phase 2 table and Members version column are not present in the public application schema. This migration has intentionally not been applied to the shared database. Reconcile the existing migration history against the correct deployed baseline before applying the additive migration; do not mark an unknown failed migration applied or reset the database to make deployment pass.
- SMTP_HOST, SMTP_USER, SMTP_PASSWORD and a sender are absent. SMTP_PORT defaults to 587; configure the intended provider and sender explicitly.
- WORKSPACE_INVITATION_TOKEN_KEY is absent. Generate a 32-byte key as 64 hexadecimal characters and keep it stable and identical across API/worker instances. `.env.example` documents generation. Rotation requires unsent pending invitations to be resent.
- FRONTEND_URL is configured and passes origin validation. It must match the deployed frontend and the existing credentialed CORS policy. Production invitation links require HTTPS.

Apply the migration before starting this build against a deployment database: generated Prisma queries include the new columns. Start/restart the backend worker after configuring delivery. Then run the readiness check and an authenticated real-mail invite -> login/signup -> accept smoke test with approved test accounts. Live provider deliverability, production OTP/OAuth behavior, and any deployment-specific RLS policies still require staging certification.

The implementation phase is complete. Live activation remains blocked by the configuration and database issues above. Nothing was deployed, no shared migration was repaired or applied, and Usage/Billing were not migrated.


## Reconciliation follow-up ? 27 October 2026

The missing historical lifecycle artifact has now been recovered with its exact recorded checksum. Completed clone results were reused; no live migration or record resolution was performed. See [the reconciliation and activation plan](PHASE2_DATABASE_RECONCILIATION_PLAN.md) for the current findings, startup-write blocker, read-only gate, and future approved activation commands.

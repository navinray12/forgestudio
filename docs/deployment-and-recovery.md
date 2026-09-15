# Deployment and recovery

## Process layout

Build with `npm run db:generate` and `npm run build`. The backend build copies its
generated Prisma runtime into `backend/dist`; the compiled server must have that
runtime when deployed. Run the API with `npm run start --workspace backend` and the
worker with `npm run start:worker --workspace backend` as separate supervised processes.
The API must never start a scheduler. Do not run the removed legacy scheduler.

`GET /api/v1/health` reports process liveness. `GET /api/v1/ready` checks required
database schema and connectivity and returns 503 when unavailable. Application
startup also performs this read-only check. Apply migrations before starting the
new API and worker. Drain old API instances during rollout; older instances still
use unsafe draft/live writes and must not remain active alongside the new behavior.

The API handles SIGTERM/SIGINT by draining requests and disconnecting the database.
The worker finishes its bounded database transaction and stops polling. Runtime
capacity and process replacement are still responsibilities of the hosting platform.

## Webhook protocol

Send an uncompressed `application/json` body with `eventId` (1–128 characters), `event`, mandatory
Unix-seconds `timestamp`, and `data`. Supported event names are `form_submitted`,
`page_updated`, `site_health`, and `test_ping`. Form data requires a nonempty string
`formId` and an object `formData`.

Sign the exact body bytes using HMAC-SHA256. `x-forgestudio-signature` accepts the
64-character hex digest or `sha256=` followed by it. Configure an independent random
32+ character inbound key in `WORDPRESS_WEBHOOK_SECRETS`, keyed by connection UUID.
Never use the old outbound API-key hash as this key. Existing connectors without
separate signing keys must be reprovisioned; they receive an explicit 503 otherwise.
Keep this environment secret out of source control and logs.

The API returns **202 accepted** only after committing a receipt. This does not mean
the form is already processed. Repeated delivery of identical bytes/event ID returns
the same receipt. Reusing the ID with different bytes is a conflict. Replay timestamps
outside five minutes are rejected. Producers must retain the original signed event
for bounded retries; longer-lived replay requires an explicit future reconciliation protocol.

Workers lock pending rows with `FOR UPDATE SKIP LOCKED`. Form insertion, audit event,
and processed status share one transaction. Worker death rolls back that transaction,
leaving the receipt retryable. Failed effects retry after one minute, up to five
attempts, then remain `FAILED`. Fix the cause and explicitly requeue the receipt
(reset status, attempts, and next-attempt time) after checking its audit history.
Disconnected connections cancel queued events. Health/page notifications are audit
events; they do not overwrite drafts or prove external publication.

This initial inbox is PostgreSQL-backed. BullMQ/outbox-based cloud publishing remains
a later milestone; no in-memory durable-acceptance fallback is introduced.

## Publishing and exports

WordPress and SFTP cannot connect, verify, or publish through simulated code. Stored
connection details remain available for inspection/disconnection, with `isConnected`
false. No customer connection records or content are deleted.

The internal publish path persists its candidate revision before activation. Live
activation changes only published fields with an expected-version guard. Saves and
restore-to-draft operations preserve current live fields in the database. Rollback
creates another deployment without replacing newer unpublished edits. Candidate
revision persistence failure occurs before destination effects.

Terminal deployment outcomes cannot be overwritten by the generic failure handler.
Errors during/after activation remain `RECONCILIATION_REQUIRED` where the result is
uncertain. Inspect the linked candidate revision, current published version, and
artifact receipt before resolving such an operation; automatic cloud-release
reconciliation is not implemented yet. A crash can leave an intermediate deployment
requiring this operator procedure.

Static exports use immutable operation directories beneath `backend/exports` and
verify saved-file checksums. Storage failures propagate. The download endpoint
returns file contents as base64 with paths/types/checksums for stored exports; it
does not claim to serve a hosted website or ZIP. Exporting an internal deployment
uses its linked revision rather than the latest draft. Configure durable shared
export storage for multiple API instances; local ephemeral disks are insufficient.

## Rollback and release limits

Preserve additive migrations when rolling back application code. Never automatically
drop the webhook inbox or delete receipts. Stop new work and preserve files before
investigating inconsistent operations. Do not roll back to an older API that can
overwrite live fields without an explicit maintenance plan.

The foundation tests are correctness checks, not a traffic benchmark, WordPress
compatibility certification, disaster-recovery drill, or production deployment.

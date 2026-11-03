# Help & Support

Settings → Help & Support follows `setting Help & support page.pdf` in the shared compact settings shell. The sidebar Help center and profile Help & Support now open the same full page. `/dashboard?section=help` survives refresh. Account, Community and Security navigation retain their existing pages.

The page includes search, popular keyword shortcuts, six help-topic cards, expandable FAQs, an article library with topic/FAQ filtering and pagination, contact support, quick resources and a public feature-request board. The seeded database catalog contains twelve product guides, including the seven FAQ questions in the PDF. It contains product guidance rather than sample conversations or invented engagement. Search treats `%`, `_`, and backslashes literally. Unpublished articles and topics stay hidden.

## Backend and persistence

All routes are mounted under `/api/dashboard/help` and `/api/v1/dashboard/help` and require the existing authenticated active account. Responses are private/no-store. Writes use strict bounded inputs, JSON/origin checks, rate limits and UUID request IDs. Retrying an unchanged ticket/suggestion request returns the original record; reusing its ID with different content or a different account fails.

- `GET /`: published topics, FAQs, searchable articles, counts and safe optional resource configuration. Reads do not create tickets or suggestions.
- `POST /tickets`: saves a private request in the existing `support_tickets` system under the General Help category. The receipt confirms storage, not email delivery.
- `GET /tickets?page=1`: paginated account-owned requests, including that account's existing billing requests. Help is account-wide and independent of workspace selection.
- `GET /tickets/:id`: only the owner's request and its first 200 `PUBLIC_REPLY` messages. Internal notes, system events, agent assignments, private context and other accounts' tickets are not exposed. This step does not introduce ticket attachments, user-written replies or ticket-status administration.
- `GET/POST /features`: paginated, searchable public suggestions and suggestion creation. The form explicitly explains that the suggestion and display name are visible to other members. Email and private account preferences are not returned. Hidden suggestions and suggestions from inactive authors are excluded.
- `PATCH /features/:id/vote`: sets the authenticated user's vote to the requested boolean. A unique user/request key prevents duplicate votes. Counts and viewer vote state come from stored records. Clients cannot assign statuses or publish hidden suggestions.

All article, ticket, reply and suggestion bodies render as plain text. Help dialogs associate asynchronous responses with the current view/query so moving from ticket history to a detail or feature board cannot render an incompatible previous response. Failed submissions retain their drafts and retry IDs; successful records and votes survive reload. No website/editor, publishing, billing, authentication or account settings are changed by Help operations.

## Optional external resources

The PDF's sample “Online now” and business hours are not treated as actual service availability. Configure these in the backend environment and restart:

- `DASHBOARD_SUPPORT_CHAT_URL`: the actual HTTPS support-chat destination.
- `DASHBOARD_SUPPORT_VIDEO_URL`: the actual HTTPS tutorial library destination.
- `DASHBOARD_SUPPORT_HOURS`: actual business hours including timezone.

Unset or unsafe links show an explicit unavailable state; unset hours show “Hours have not been configured”. Links must use HTTPS without embedded credentials and open with `noopener noreferrer`. A configured chat link says Open chat; it does not claim that an agent is online. No chat provider, staff-presence service, video hosting, response-time guarantee or outbound email/SMS dispatch is fabricated. Documentation opens the real in-app article library, and Community Forum opens the existing Community page.

## Setup

`20261029140000_dashboard_help/migration.sql` adds `dashboard_help_topics`, `dashboard_help_articles`, `dashboard_feature_requests` and `dashboard_feature_votes`, and adds a General Help support category. Compatible support table definitions are provided only for installations where those tables do not yet exist. Existing support schemas, statuses, records and internal messages remain intact. Seed inserts use `ON CONFLICT DO NOTHING` so later staff edits are preserved. Publishing/moderation and article maintenance are trusted backend/database operations; no unrestricted content-administration API is added.

From backend, run `npm run db:help-dashboard` before deploying this code. It applies only this additive SQL in a transaction and verifies existing users, sessions, sites, workspaces, support records, catalog records, feature records and migration history are preserved. `npm run check:help-dashboard` checks storage readiness. It does not run schema reset, `db push`, blanket migrations or modify the migration ledger; the preexisting migration history remains unreconciled.

## Verification

Run `npm run build` and `npm run test:help-dashboard` in backend and frontend. Backend tests cover authenticated account boundaries, input/origin validation, safe links, real PostgreSQL persistence, retry conflicts, article visibility, literal search, pagination, private tickets/public replies and unique account-scoped feature votes. Storage tests create/remove only a UUID-named temporary schema.

With the local frontend/backend running and disposable Chrome CDP on port 9227, run `node scripts/dashboard-help-live-browser.mjs --run` from backend. It exercises the reference layout, all entry points, FAQs/search/topics/pagination, failed submission and retry, actual saved tickets and visible support replies, hidden internal notes, suggestions/votes/reload, error recovery and mobile navigation. It uses real API/database responses, sends no email/SMS and removes only its UUID-scoped fixture accounts/records. Original user, site, workspace, template, support, catalog, feature and migration records are checked for preservation. Evidence is saved under ignored `.integration-review/help-e2e/`.

# Notification settings

Settings → Notifications follows `setting Notification page.pdf` in the shared compact settings shell: five switches, the timeout select, typography, dark card and purple controls. `/dashboard?section=notifications` survives reload. The dashboard and settings-header bells now open an actual notification inbox with unread indicators, read actions, pagination and a Notification settings link.

Controls autosave without adding a Save button to the reference design. Failed saves keep the draft and offer Retry save. Concurrent edits use a version and user-row lock; different stale values cannot overwrite a newer save. Retrying already committed identical values acknowledges the current version safely. Defaults match the PDF: desktop on, badge on, timeout 10 minutes, communication email on, announcements off and mute off. A read returns defaults without inserting a settings row.

## Data and scope

`GET/PATCH /api/dashboard/notifications/preferences`, `GET /api/dashboard/notifications?page=1`, and `PATCH /api/dashboard/notifications/read` are also mounted under `/api/v1`. Each requires the existing authenticated active account. They reject client-supplied identities and unknown fields, validate booleans/timeouts/versions, limit write rates, check JSON/origin on writes and return private/no-store responses. Read actions affect only the authenticated user's specified IDs, capped at one 20-item page. No public notification-creation or broadcast endpoint is exposed.

Account-wide preferences and inbox records are persisted in `dashboard_notification_preferences` and `dashboard_notifications`. They are independent of workspace selection. Installation does not change existing users, sessions, website/editor data, publication state, support replies, community posts or migration history.

The additive migration installs named AFTER INSERT triggers on existing `forum_posts` and `support_ticket_messages`. A new non-hidden reply to a public, active-category discussion notifies its topic author when another person replies. A new PUBLIC_REPLY to a support ticket notifies its owner when another person replies. Self replies, internal notes and system events produce no notifications. Unique recipient/event keys prevent duplicates on source retries. No historical activity or fake unread records are seeded. Deleting a source during fixture cleanup cascades only its derived records.

Inbox and delivery queries recheck source ownership and visibility. Hiding a reply, making a topic private/archived, disabling its category, or changing a support message to an internal note excludes its notification. Desktop/email text is deliberately generic so private ticket bodies and staff notes are never copied into previews. Notifications link to the authorized Community discussion or Help & Support. Clicking an inbox item marks it read before navigating.

Trusted server producers may call `createDashboardNotificationsService(db).enqueue(userId, event)` for real COMMUNICATION or ANNOUNCEMENT events, with a stable event key and validated internal dashboard link. No fictional announcement or campaign is created. Contracts/documents mentioned in the reference copy do not introduce new product modules.

## Browser behavior

While the dashboard is open, the shared provider polls every 15 seconds when visible and refreshes on focus, preference saves and inbox opening. The initial response establishes a baseline and does not replay historical unread alerts. Subsequent new events are deduplicated, with at most three desktop alerts per refresh to avoid bursts; all inbox records remain accessible through pagination.

Desktop permission belongs to each browser, independently of the account-wide preference. Permission is requested only by the user's toggle/Allow action, never on page load. Unsupported/denied states are shown honestly and refreshed on focus. Alerts require an open dashboard and granted permission; background Web Push/service-worker delivery is not implemented. The timeout is the requested maximum lifetime (1, 5, 10, 15, 30 or 60 minutes); the browser/OS may dismiss earlier. Turning desktop alerts off closes outstanding alerts, and leaving the dashboard cleans up timers and audio resources.

The badge switch controls the header's red unread count, document-title count and, where supported, `navigator.setAppBadge`/`clearAppBadge`. An OS app-icon badge depends on platform/PWA support; the header/title provide a fallback. Sound preferences set the desktop Notification `silent` option. If no desktop alert is shown, a short in-app tone is available after a user gesture has enabled Web Audio. Mute suppresses that tone too. Browser autoplay and OS policies can limit sound/alerts; the UI does not claim otherwise.

## Optional email delivery

Optional notification emails use a separate durable leased outbox on notification records. Enable the worker with `DASHBOARD_NOTIFICATION_EMAIL_ENABLED=true` only after configuring real `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM` (or its SMTP_USER fallback). It is disabled by default, and the settings page shows when email delivery is not configured. No development simulation or fake Sent status is used. Preferences are saved even while delivery is unavailable.

The worker checks the current category opt-in, verified email, active account, source visibility and read state immediately before sending. Disabled/read/ineligible events become SKIPPED. Successful sends become SENT; failures retry after five minutes, up to five attempts, then become FAILED. Expired leases recover after a worker crash. SMTP handoff is at-least-once: a crash after acceptance but before recording success can retry, using a stable Message-ID. A message already handed to SMTP cannot be recalled by a later preference change.

Authentication OTPs, required security/account flows, explicitly requested workspace invitation delivery, site-customer mail and invoices retain their existing behavior. These optional preferences do not disable essential sign-in or a website's customer email system.

## Installation and tests

From backend, run `npm run db:notifications-dashboard` before deploying this code. It applies only `20261029160000_dashboard_notifications/migration.sql`, verifies old rows are retained and leaves the migration ledger unchanged. Forum and support baseline tables must exist. `npm run check:notifications-dashboard` checks readiness. Do not reset the database, run blanket `db push`, or deploy unrelated migrations against the preexisting unreconciled migration history.

Run backend/frontend builds and `npm run test:notifications-dashboard` in both folders. PostgreSQL tests use a UUID-named isolated schema and cover real reply triggers, defaults/persistence, conflicts, account boundaries, hidden sources, unread counts, read actions, pagination, email opt-outs, retry/failure states and internal announcement delivery with an injected test sender. No external email is sent.

With the local app running, optional email delivery disabled and disposable Chrome CDP on port 9227, run `node scripts/dashboard-notifications-live-browser.mjs --run` from backend. It checks the PDF layout, all controls/reload, failure/retry, conflicts, actual community/support event creation, badge/title, mute/timeout options, read/navigation behavior, permission state and mobile layout. HTTP/database responses are real. The browser Notification API is instrumented to inspect constructor options/close timers without emitting OS alerts; OS-level delivery is therefore not claimed as tested. It removes UUID-scoped fixture accounts/records and verifies original data is unchanged. Evidence is saved under ignored `.integration-review/notifications-e2e/`.

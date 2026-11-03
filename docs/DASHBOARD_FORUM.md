# Dashboard Forms / ForgeStudio Forum

The supplied `main dashboard forms page.pdf` is a community forum design. The dashboard's **Forms** sidebar item opens that community page. Website form widgets, submissions, exports and PDF downloads remain separate and unchanged.

The hero, category grid, discussion filters, community totals, trending list and topic call to action follow the PDF using the existing WebStudio shell and typography. Counts are persisted database data, not the sample activity in the design. Community membership means active registered accounts; no sample users, photos or conversations are inserted.

## Backend and scope

`/api/dashboard/forum` and `/api/v1/dashboard/forum` use existing cookie authentication. Listing supports `filter=latest|popular|unanswered|solved`, optional UUID `categoryId`, and one-based `page` (15 topics per page). Public active categories and public OPEN/LOCKED/SOLVED topics are available across workspaces. Selecting a workspace does not turn the community into a private workspace discussion feed. PRIVATE, WORKSPACE, HIDDEN and ARCHIVED topics, inactive/private categories and hidden replies never appear or contribute to totals. Popular and trending use existing stored view counts; this change does not introduce view tracking.

Authenticated active accounts can create topics and reply to unlocked discussions. Announcements require ADMIN or SUPER_ADMIN. Only the author can mark an unlocked topic solved or reopen it. These operations use transactions; topic locks serialize replies with status changes. Client-generated request UUIDs make identical topic/reply retries idempotent and conflicting reuse returns 409. Server validation bounds text and pagination, authenticates each route, rejects unknown fields and rate limits writes. React renders plain text, including code snippets, without executing HTML. Detail shows the first 200 visible replies and labels this limit when reached.

Read requests never create tables, categories or posts. Responses are private/no-store. No forum deletion API is added. Site content, editor data, publication and existing form-submission storage are untouched.

## Storage and installation

The application reuses the existing `forum_categories`, `forum_topics`, and `forum_posts` tables through parameterized SQL because the current generated Prisma client does not model those existing database tables. No generated client changes are required.

The additive SQL file `backend/prisma/migrations/20261028160000_dashboard_forum/migration.sql` also supports installations without those forum tables. It creates missing tables/enums/indexes and inserts missing category definitions by slug without overwriting existing configuration. It never inserts sample discussions.

For this database's unreconciled migration history, do **not** use schema reset, db push or blanket migrate deploy. From `backend`, run `npm run check:forum` to inspect availability, or `npm run db:forum` to apply only the targeted SQL in a transaction. That installer checks that existing users, websites, workspaces, forum records and migration history retain their original values. It does not modify the migration ledger.

## Verification

Run backend and frontend builds and `npm run test:forum` in both directories. The backend storage test uses a uniquely named disposable PostgreSQL schema and tests fresh/repeated migration setup, real persistence, authorization, privacy, locks, hidden replies, filters and duplicate request safety. It removes only its own schema.

With the local app and a disposable Chrome CDP instance running on port 9227, `node scripts/dashboard-forum-live-browser.mjs --run` from `backend` tests real cookie authentication, topic creation, replies, solved state, safe rendering, error/retry, mobile layout and return navigation. It removes UUID-scoped fixtures and checks preservation of original data. Screenshots and reports are written under ignored `.integration-review/forms-e2e/`.

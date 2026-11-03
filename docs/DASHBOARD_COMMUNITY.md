# Community settings

Settings → Community follows `setting Community page.pdf` in the compact Account settings shell. It provides a responsive hero, real counts, searchable public feed, Trending/Latest sorting, Showcase/Discussion/Plugin filters, saved posts, pagination, trending discussions, suggested creators, and upcoming events. `/dashboard?section=community` survives refresh; public post links add `&post=<uuid>` and open the discussion. Leaving Community clears that post selection.

The feed reuses existing public `forum_topics` and visible `forum_posts`, so posts and replies remain connected to the Forms forum. Public posts from active creators in active/public categories are shown; PRIVATE/WORKSPACE, HIDDEN, and ARCHIVED topics are excluded. Reads do not insert data. Counters reflect visible records rather than sample PDF values. Empty feeds, creators, and events have explicit empty states.

## Persistence and permissions

The `/api/dashboard/community` and `/api/v1/dashboard/community` routes use existing session authentication and require active accounts. Writes are rate limited; responses are private/no-store. Client-supplied author IDs, account roles, visibility changes, and unknown fields are rejected. UUID request IDs make post/comment retries safe. Reactions and follows set the desired boolean state idempotently, with unique account/target keys. Comments reuse existing forum locking and reply permissions. Existing website, editor, publishing, billing, and account-preference records are not changed.

New additive tables store topic likes, creator follows, explicitly attached resources, and staff-managed events. Bookmarks reuse `forum_bookmarks`. Public author names are taken from existing forum identities; private Account profile fields, email, photos, location, and work preferences are not exposed. Community is global, independent of workspace selection, with account-scoped bookmarks/likes/follows.

Showcase authors can attach only their own templates already explicitly shared in the editor. Private templates cannot be attached. Unsharing removes the design data from subsequent feed responses. Previews reuse the existing sanitized, script-free template renderer in an empty-sandbox iframe with a restrictive CSP. Unsupported/empty template structures render safely. Post/comment bodies are plain text. Share copies a public discussion URL and provides a manual-copy fallback.

Plugin resources accept HTTPS URLs without embedded credentials and open with `noopener noreferrer`. **Review in Plugin Hub** opens the existing plugin hub; external community files are not automatically installed or executed. Events are read from active future `dashboard_community_events` records maintained by trusted staff; no fictional event, registration, attendance, or install state is generated. No event-management UI is added in this step.

## Setup and verification

From backend, `npm run check:community-dashboard` verifies storage. `npm run db:community-dashboard` applies only `20261029090000_dashboard_community/migration.sql` in a transaction, preserving existing rows and the migration ledger. The forum and templates baseline must already exist. The SQL is repeatable and adds a Plugins category without replacing categories. Do not use a schema reset, blanket `db push`, or deploy unrelated migrations against the unreconciled migration history.

Run `npm run build` and `npm run test:community-dashboard` in backend and frontend. Backend tests cover authenticated route boundaries, strict validation, safe URLs, PostgreSQL persistence, retry conflicts, public visibility, hidden/locked comments, shared-template ownership and revocation, account-scoped social interactions, filtering, pagination, and real future events. Database tests create and remove only a UUID-named isolated schema.

With the local frontend/backend running and disposable Chrome CDP on port 9227, run `node scripts/dashboard-community-live-browser.mjs --run` from backend. It creates/removes only UUID-scoped test accounts, posts, comments, and a shared template. It exercises actual API/database writes, navigation, preview isolation, search/filters, reload, comments, likes, bookmarks, follows, publishing, shared deep links, error/retry and mobile layout. It verifies original user, site, workspace, template, forum, and migration records are unchanged. Evidence is saved under ignored `.integration-review/community-e2e/`.

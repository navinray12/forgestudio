# Dashboard Templates

Libraries & Templates now opens a gallery following the supplied `main deshbord templates.pdf`: hero, search, promotional panel, category tabs, style/features/industry filters, sorting, template cards and favorite hearts. The existing WebStudio shell and sidebar typography are preserved. The layout is responsive and filters can be toggled.

The PDF contains pictures and a sample “120+” count, not editable source templates. This implementation installs eight original, editable free starter designs named Greeny, Homa, Creatix, Alex, Flavoro, Travely, Educa and FitLab. Cards preview their actual stored design data rather than showing unrelated stock screenshots. Counts come from real records; no fake usage or popularity is inserted. Feature tags describe starter design intent, not an already-configured commerce, booking, membership or payment service.

## Storage and ownership

The additive `20261028190000_dashboard_templates` migration adds `dashboard_template_catalog` and per-account `dashboard_template_favorites`. It leaves the existing editor `templates` table intact. Catalog definitions are shared free assets; saved templates and favorites belong to the authenticated account and are consistent across workspaces. Private templates belonging to other users are never listed, even if an ID is supplied. Existing token-based public sharing remains unchanged.

Run `npm run check:templates-dashboard` from backend to inspect storage, or `npm run db:templates-dashboard` to install it. The targeted installer inserts missing starter assets by slug without overwriting existing catalog edits. It verifies preservation of users, sites, workspaces, saved templates, existing catalog records and migration history. It does not change `_prisma_migrations`; do not run a reset, db push or blanket migration deployment against the unreconciled migration history.

## API and editor flow

Authenticated routes are mounted at `/api/dashboard/templates` and `/api/v1/dashboard/templates`:

| Route | Behavior |
| --- | --- |
| GET `/` | Search, category/industry, multi-select styles/features, Popular/Newest/Name sorting, catalog/favorites/saved scope and 12-item pagination |
| PATCH `/:source/:id/favorite` | Idempotent favorite assignment; `source` is catalog or saved |
| POST `/catalog/:id/use` | Copy active catalog data into the caller's existing editor Template Library using a client request UUID |

Routes use existing cookie authentication, require an ACTIVE account, validate all inputs, reject spoofed account fields, rate limit mutations and return private/no-store responses. Reads never initialize storage. Search text is literal. Selected style and feature filters are combined with AND. Popular sorting uses actual favorite counts and stable catalog order for ties.

**Use Template** creates an independent PAGE template copy, without changing the source or any website. Identical request retries return the same copy; conflicting UUID reuse fails. The success message explains how to open a site and insert the copy from the editor's My Templates library. The existing insertion flow clones elements with fresh IDs. There is no automatic site creation, publishing, permanent deletion or replacement of existing website content.

Previews render a bounded structural view of design elements in sandboxed iframes with a restrictive Content Security Policy. Text is sanitized, styles are restricted, and scripts, forms and executable URLs are excluded. Existing template data remains unchanged, including unsupported interactive widget configuration. This preview does not execute widgets or third-party integrations.

## Verification

`npm run test:templates-dashboard` is available in backend and frontend. Backend tests cover route authentication/validation and real PostgreSQL catalog/filter/favorite/copy behavior in a uniquely named temporary schema, including inactive accounts, private saved templates, request idempotency and source/copy independence. Tests remove only their own schema.

With the local frontend/API and disposable Chrome CDP on port 9227, run `node scripts/dashboard-templates-live-browser.mjs --run` from backend. It exercises real authenticated filtering, persistent favorites, sandboxed previews, library copies, error/retry and mobile layout, then opens the actual editor and inserts a copied template into a disposable site. It checks preservation of original records and removes its UUID-scoped fixtures. Reports and screenshots are under ignored `.integration-review/templates-e2e/`.

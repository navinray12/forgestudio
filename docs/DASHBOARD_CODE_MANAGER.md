# Dashboard Code Manager

Code manager.pdf is the design reference for `/dashboard/tools?tab=advanced-code`. The full page uses the current Developer Tools shell, with a hero, onboarding panel, searchable categorized library, filters, and Popular Templates. A website selector remains available because snippets are website-scoped. Mobile collapses the layout into one column. No PHP execution is implemented; the reference artwork is decorative.

## Persistent data

Existing code stays in `custom_code_snippets` with history in `custom_code_revisions`. The only new table is `dashboard_code_snippet_metadata`, keyed by snippet ID, with template origin and source (TEMPLATE or THIRD_PARTY). Snippets without metadata classify as CUSTOM. Selection is stored transactionally with snippet creation, and editing code/title does not change origin. No existing rows are backfilled or rewritten.

Additive SQL is `backend/prisma/migrations/20261029180000_dashboard_code_manager/migration.sql`. For installations with existing snippet tables, run `cd backend; npm run db:code-manager`. The targeted installer checks preservation of existing rows and migration history. Do not use a reset or blanket migration deploy against the unreconciled local database history. No Prisma schema regeneration is required for the sidecar table.

## API mapping

- Existing POST /api/custom-code/website/:websiteId and PUT /api/custom-code/:id remain the write endpoints (also under /api/v1). Optional templateId on creation selects a recognized catalog entry; origin cannot be changed during updates.
- GET /api/custom-code/templates returns the five maintained starter templates.
- GET /api/custom-code/manager/website/:websiteId returns existing snippets with source, templateId, and revisionCount.
- The same session authentication, active account, CUSTOM_CODE and PUBLISH permissions, same-origin writes, UUID/input validation, revision history and optimistic concurrency protections are reused.
- Existing Custom Code and editor routes remain compatible; they do not depend on the new metadata table for ordinary custom snippet writes.

The UI filters real stored snippets locally by category, search text, language and publication status. Counts derive from the fetched site list. Template selection fills an editable form; it does not write until Save Draft, Publish Snippet, or Schedule is pressed. New templates default to draft. Publishing/scheduling recognizable unconfigured template placeholders is blocked. Deactivation preserves code and history. No permanent deletion action is added to this page.

## Advanced options

Conditions normalize page IDs/paths and mobile/tablet/desktop device rules to the runtime JSON structure; JSON objects are also accepted. Unsupported rules show an error. Unmodified legacy conditions are preserved. Priority follows the existing runtime: higher numbers first. JavaScript syntax is validated server-side, and Run Linter provides bounded heuristic feedback without claiming full syntax validation.

Local date/time input converts to ISO UTC and requires a future time. Scheduling writes SCHEDULED status, not an immediately live snippet. The existing minute worker promotes active due snippets using a compare-and-set on ID, status, due time and updatedAt, avoiding stale overwrites after edits or cancellation. Promotion also synchronizes legacy draft/enabled flags. Production scheduling requires the existing scheduler to be running.

## Provider templates

Custom CSS/JS are editable local starters. Google Analytics needs the user's tag ID; its code follows the Google tag setup at https://developers.google.com/tag-platform/gtagjs. WhatsApp needs an international phone number. Facebook Pixel is explicitly a setup starter: the user pastes their own base code from Meta Events Manager. No fake account IDs or successful provider activation are shown. Existing JavaScript runtime isolation is preserved; provider delivery and parent-page tracking behavior are not claimed verified. No third-party tracking requests run in the tests.

## Verification

- Backend and frontend `npm run build`.
- Backend `npm run test:code-manager`: template validation and race-safe scheduler tests plus real database/API tests for origins, revisions, permissions, draft/public behavior, scheduled persistence and promotion, conflict checks, placeholder blocking, and existing-record preservation.
- Frontend `npm run test:code-manager`: combined filtering/order, condition parsing, timezone conversion, editor payload compatibility, and runtime visibility tests.
- Backend `npm run test:code-manager-browser`: local Vite/API with disposable Chrome CDP on 9227. Desktop/mobile screenshots, all category tabs, combined filters/search, template/catalog selection, draft/public/scheduled saves, real condition-controlled CSS rendering, load/save recovery, conflict handling, activity toggles, reloads and website isolation.
- Existing custom-code backend suite also passes.

Fixtures use example.invalid accounts and are removed. Screenshots/report are ignored under `.integration-review/code-manager-e2e`. Existing website content, published releases, snippets, history and migration ledger are checked for preservation.

# Dashboard Custom Code

The Custom Code PDF is the visual reference for `/dashboard/tools?tab=custom-code`. The page uses the existing Developer Tools header/sidebar styles, site selector, purple Add Snippet action, and illustrated empty panel. Populated lists and forms follow that theme. Other developer panels keep their existing implementations.

## Storage and access

Uses the existing Prisma CustomCodeSnippet and CustomCodeRevision tables. No schema migration or data rewrite is required for this installation. All CRUD routes retain their existing `/api/custom-code` and `/api/v1/custom-code` URLs and cookie authentication. The signed-in account must be ACTIVE, and the website permission service must grant CUSTOM_CODE. Changing published/scheduled snippets (including returning live code to draft), publishing a new snippet, and legacy deletion of live snippets additionally require PUBLISH. Cross-account access is rejected.

Input is bounded and validated: UUIDs, title, code, enum options, integer priority, required page ID/schedule when applicable. JavaScript is parsed using Acorn; partial code updates validate against the stored language too. Existing Code Manager fields, legacy placement aliases, JSON/string conditions, and editor modal payloads remain supported. The editor service explicitly selects writable fields and passes updatedAt as the optional concurrency version instead of sending full database records.

Updates compare updatedAt atomically and reject conflicts with 409. Changing code saves its previous value as a CustomCodeRevision in the same transaction. Updates only touch the selected snippet and synchronize existing compatibility aliases (name/codeType/location/isEnabled/isDraft). Website editorData and publishing records are untouched.

The new page defaults to Draft, offers explicit Draft/Published selection, editing, and Activate/Deactivate. Deactivation preserves code and revisions. No permanent deletion action is added to the new UI; the existing DELETE endpoint remains for legacy clients. Published snippets continue to use the existing runtime rather than executing code in the dashboard.

## Runtime connection

The public website projection now includes status, isActive, scope, pageId and conditions alongside the existing code fields. Previously the runtime could reject the projection because it lacked publication/activity information. Inactive and draft/scheduled code are excluded, and the actual published page ID is passed to the runtime for page-scoped conditions. Existing HTML sanitization and JavaScript execution behavior are unchanged.

## Errors and interaction

Website/snippet load failures offer retry. A site with no snippets and an account with no websites have separate empty states. In-flight requests are cancelled on site changes to avoid stale lists. Failed saves retain form input, pending writes disable duplicate actions, stale edits show a conflict, and native dialog behavior provides modal keyboard focus and Escape handling. Lists render code as text.

## Verification

- Backend and frontend `npm run build`.
- Backend `npm run test:custom-code-dashboard`: local API plus disposable example.invalid accounts/websites; real persistence, validation, account/site isolation, permissions, code history, conflict protection, public payload and deactivation. Snapshots verify existing website/snippet/revision rows and migration history remain unchanged.
- Frontend `npm run test:custom-code`: editor payload compatibility and publication/activity/page/device/path filtering.
- Backend `npm run test:custom-code-browser`: local Vite/API plus disposable Chrome CDP on 9227. Desktop/mobile PDF view, real saves/reloads, failure recovery, syntax errors, conflicts, site switching, empty accounts, and published CSS execution/deactivation. Screenshots and report are in ignored `.integration-review/custom-code-e2e`.

Fixtures are removed after tests. No existing website is published, edited or deleted during verification. Only disposable fixtures use a published state to test the runtime. No external messages or services are involved.

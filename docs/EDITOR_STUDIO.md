# Dashboard PDF editor

The existing `/editor/:websiteId` route now uses the dark Web Studio layout from `dashbord.pdf`. The changes are local to the existing application; no hosting or deployment configuration is required.

Pages and layers use the existing editor state. Style controls write through `updateSelectedStyle`, including device-specific overrides. Animation uses the existing motion inspector, and Advanced retains the complete original property editor. The ellipsis in the header reveals the original toolbar for additional tools.

On an empty page, **Insert PDF landing page** inserts editable reference content. Existing content is preserved. The hero bitmap was extracted from the supplied PDF into `frontend/public/editor/summer-hero.png`; the page is represented by normal editor elements, not a screenshot. Shop/video destinations and actual product inventory require site-specific configuration.

## Backend mapping

- Website load: authenticated `GET /api/websites/:id`.
- Save: authenticated `PUT /api/websites/:id` with the existing canonical `editorData` payload. Pages, nested elements, styles and responsive overrides use existing JSON storage and permission checks. No new database migration is needed.
- Assets: existing media/upload endpoints, using `VITE_API_URL` (default `http://localhost:5000`) and session credentials.
- Preview form submissions: the existing form renderer now receives `websiteId` and submits through `/api/forms/submit`.
- Publish: the existing publishing modal and service.

Manual saves distinguish **Saved to server** from a local-only fallback.

## Validation

From `frontend`, run `npm run build`.

From `backend`, run `node scripts/editor-studio.integration.mjs`. This creates temporary records, verifies authenticated save/load of the PDF template and responsive styles, then deletes the test records.

Optional browser verification: start the frontend at `http://localhost:5173`, backend at port 5000 and a local Chrome debugging endpoint at port 9228, then run `node scripts/editor-studio.integration.mjs --browser`. This checks layer selection, a style edit saved through the UI, viewport switching and asset-library opening. The desktop screenshot is saved under `.integration-review/editor-studio/desktop.png`.

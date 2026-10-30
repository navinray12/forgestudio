# Assets editor panel

The editor's Assets tab now opens the sidebar from `Assets dashbord.pdf`, keeping the canvas and inspector visible. It includes All Assets, Images, Videos, Icons, Illustrations, Documents, Fonts and Brand Kit, plus the eight reference folders, folder search, folder creation and Trash. Counts come from the database; the PDF's example numbers are not seeded.

Selecting a category or folder opens an asset browser with search, pagination, upload, folder/category assignment, insertion and recoverable Trash/restore. Images/SVGs insert as image elements, videos as video elements, and documents/font files as download links. Font files are stored and downloadable; selecting them does not automatically apply a font to text. Inserted elements persist through the existing website save API. Design-restricted roles can browse but cannot upload, organize or insert assets.

## Backend and database

Authenticated endpoints under `/api/media/library`:

- `GET /summary?websiteId=...`: real category/folder/trash counts.
- `GET /assets?category=...&folderId=...&trash=...&search=...&page=...&websiteId=...`: filtered assets, 40 per page.
- `POST /folders` with `{name}`: create a private folder.
- `PATCH /assets/:id` with optional `folderId`, `category`, `trashed` and `altText`.
- `POST /upload?filename=...&websiteId=...&folderId=...&category=...`: binary upload, `Content-Type: application/octet-stream`, up to 25 MB.

Uploads support PNG, JPG, WebP, GIF, SVG, MP4, WebM, PDF, TXT, WOFF, WOFF2, TTF and OTF. Binary signatures and SVG active content are checked. Files are stored in `backend/uploads/assets`; asset rows use the existing `media_assets` table. Uploaded files assigned to a website require website ownership. Every asset update and folder assignment verifies ownership.

Migration `20261030100000_editor_assets_library` adds `studio_asset_folders` and `studio_asset_metadata`, reflected in the Prisma schema. The service also lazily creates these additive tables for existing local installations, following the existing media service's initialization pattern. Existing assets remain valid and are categorized by MIME type unless explicitly reassigned. Trash changes metadata and preserves the file and existing canvas links; the older media browser also excludes trashed assets.

Restart the backend after updating to load the new routes. The frontend uses `VITE_API_URL` (default `http://localhost:5000`).

## Validation

- `npm run build` in both `frontend` and `backend`.
- `node node_modules/prisma/build/index.js validate` in `backend`.
- `node scripts/editor-assets.integration.mjs --browser` in `backend`.

The integration test defaults to a dedicated backend at port 5001, frontend at 5174 and Chrome debugging at 9228. Override `EDITOR_TEST_API` and `EDITOR_TEST_ORIGIN` as needed. Tests exercise real uploads, counts, metadata, folder/category filters, trash/restore, account isolation, invalid requests, editor insertion/save, browser upload/search and reload persistence. Temporary records/files are removed in cleanup. Screenshots are under `.integration-review/editor-assets/`.

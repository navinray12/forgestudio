# Blocks editor panel

The Blocks rail button and Blocks tab now open a dedicated panel matching `Blocks dashbord.pdf`: search, the supplied template thumbnail, a three-column layout grid, basic elements and forms/tools. Existing pages, canvas content and inspectors are preserved.

`StudioBlocksPanel.tsx` renders the panel. `defaults/studioBlocks.ts` maps all 18 cards to canonical editor elements. Clicking inserts at the selected container or after the selected element; dragging uses the existing canvas insertion/drop positioning. Grid creates four editable cells, Columns creates two flex columns, and both stack on mobile. Date Picker creates a real form with a required date field. The template thumbnail opens the existing template library.

Design-restricted roles cannot insert or drag blocks. Disabled widgets remain visibly disabled. Search filters block names and groups, with a clear action and empty state.

## Backend

Built-in blocks require no new tables or catalog endpoint. Inserted elements, nested IDs, layout settings, form fields and responsive overrides persist in the existing website `editorData` via authenticated `PUT /api/websites/:id`, and reload via `GET /api/websites/:id`. Existing backend authorization remains in force. The template library uses the existing template endpoints. Date forms use the existing form renderer/submission endpoint with the current website ID.

## Checks

- `npm run build` from `frontend`.
- `node scripts/editor-studio.integration.mjs --browser --blocks` from `backend`, with backend/frontend running at ports 5000/5173 and Chrome debugging at 9228. It creates temporary test records and cleans them up.

The browser test checks all 18 insert actions, search/empty results, grid drag/drop, unique nested IDs, saved layouts/date fields/list data, database round-trip, reload and template-library navigation. Desktop screenshot: `.integration-review/editor-blocks/desktop.png`.

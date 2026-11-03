# Animation inspector

The editor's Animation tab now follows `Animation tab deshbord.pdf`: layout direction/distribution/alignment, gap and four padding inputs; expandable Effects, Overlays and Cursor; opacity; six interaction cards; and the Scroll Trigger card. Existing animation configuration is read without automatically enabling effects on unconfigured elements. The previous full motion inspector remains available in Advanced.

## Data mapping

Layout and style edits use the existing responsive update handlers. Motion settings use `element.motionConfig`, alongside the existing entrance/hover/scroll fields. New optional fields are `text`, `press`, `loop`, `drag` and `overlay`.

Everything is saved and loaded through the existing authenticated website PUT/GET endpoints and canonical editor JSON. No new database columns, migration or duplicate animation API is required. Content-only roles retain their existing editing restrictions.

## Playback

Use the header's Preview button to play interactions. The shared runtime also runs on published pages:

- Text reveals existing text without replacing its content or accessibility semantics.
- Appear uses the existing viewport entrance observer.
- Hover uses the existing scale/lift transition runtime.
- Press responds to pointer and Enter/Space input.
- Loop offers float, pulse and spin.
- Drag supports pointer input, axis constraints, arrow keys and Home to reset. Drag offsets are temporary playback state.
- Scroll supports X/Y translation, rotation, scale and optional fading, including scrolling inside the editor canvas.
- Overlay renders a non-interactive tint layer during playback.

Autonomous motion respects reduced-motion preferences. Preview cleanup cancels animations, removes listeners and overlay nodes, and restores authored transforms, opacity and filters. Non-container layout edits render consistently in the editor and public renderer.

## Validation

Run `npm run build` in `frontend` and `node scripts/editor-animation.integration.mjs` in `backend`. The integration script defaults to backend/frontend ports 5000/5173 and Chrome debugging port 9228; API/origin can be overridden through `EDITOR_TEST_API`/`EDITOR_TEST_ORIGIN`.

The test creates temporary records, verifies the six trigger controls, layout/effect editing, database persistence, preview playback, keyboard drag, nested scrolling, style restoration, reload, reduced motion and the public renderer, then removes its records. It marks only its temporary local fixture published; it does not create a deployment. Screenshot: `.integration-review/editor-animation/desktop.png`.

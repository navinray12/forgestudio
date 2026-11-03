# Five-PDF editor implementation

The five local PDF references were reviewed as design references. Their sample content does not replace existing projects.

| Reference | Implementation | Data and behavior |
| --- | --- | --- |
| dashbord.pdf | Studio header, navigation, pages/layers and canvas layout | Existing editor state, page management, save and preview services |
| Blocks dashbord.pdf | Searchable 18-card Blocks panel | Click/drag insertion of editable elements, unique IDs, saved page content |
| Assets dashbord.pdf | Asset categories, folders and library dialog | Authenticated media library APIs, upload, classification, move, trash and restore; real counts |
| Animation tab deshbord.pdf | Animation inspector and trigger controls | Persisted motion configuration, shared editor/public runtime and reduced-motion handling |
| advanced dashbord.pdf | Accessibility shortcuts, token tabs, typography, spacing and grid settings | Canonical website variables/settings, JSON import/export, Save Tokens and Apply to Website |

## Advanced behavior

Save Tokens persists tokens and layout settings alongside current unsaved page edits. Apply to Website additionally binds page and theme-part typography, button colors and container layout to the design system. Existing custom variables are retained. Custom and shadow tokens remain available for explicit CSS bindings.

The editor and published renderer both emit design-token and global-class CSS. Published headings preserve their configured heading level. Content-only collaborators cannot change design tokens, global classes or design-system settings through either canonical website updates or design-system endpoints.

Accessibility shortcuts use the existing visitor accessibility context. Preferences are browser-local; Reduce Motion also disables the shared animation runtime. Global Panel opens the full accessibility toolbar.

## Validation completed

- Frontend and backend production builds passed.
- `backend/scripts/editor-studio.integration.mjs`: editor/Blocks insertion, search, persistence and actual database-backed form submission passed.
- `backend/scripts/editor-assets.integration.mjs`: real asset API and browser workflows passed.
- `backend/scripts/editor-animation.integration.mjs`: editor/public animation workflows passed.
- `backend/scripts/editor-advanced.integration.mjs`: accessibility, token editing/import, save/apply, preservation of unsaved content, reload, published typography and legacy-tool access passed.
- `backend/scripts/editor-design-permissions.integration.mjs`: design-write restrictions, allowed content updates and public token DTO checks passed.

Browser checks used isolated local API/frontend ports and temporary records, which the scripts clean up. No production deployment or external email/payment action was performed.

## Existing editor features and limits

See [the previous-feature inventory](EDITOR_PREVIOUS_FEATURES.md) for features absent from the PDF layouts and their current access paths. More editor tools exposes the original toolbar and extra tools; the previous detailed inspector remains available.

These screens follow the PDF layouts, with real project data rather than fixed sample counts. The optional sample template is editable reference content, not a configured live store. External payment, publishing, translation and other providers still require their credentials/configuration. The PDF AI navigation label does not provide an AI screen or behavior specification; this work does not claim an implemented generative AI backend. Large frontend bundle warnings remain.

Additional implementation notes: [Editor](EDITOR_STUDIO.md), [Blocks](EDITOR_BLOCKS.md), [Assets](EDITOR_ASSETS.md), [Animation](EDITOR_ANIMATION.md).

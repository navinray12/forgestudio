# Code navigation

Find a business feature first, then open the file for the operation you need. The
backend now keeps related HTTP handlers, business rules and persistence together.
The editor keeps widget rendering, controls, presets and document operations separate.

## Directory map

```text
backend/
  src/
    app.ts                         Express composition and route mounting
    server.ts                      API process startup and shutdown
    modules/
      authentication/              Sign-in, sessions, OTP and OAuth
      websites/                    Website ownership, metadata and editor data
      pages/                       Guarded draft commands and document validation
      publishing/                  Deployment state, snapshots and destinations
      permissions/                 Resource authorization
      wordpress-connections/       Existing WordPress connection support
      ...                          One folder per remaining business module
    platform/
      database/                    Prisma connection and schema readiness
      http/                        Shared middleware and API errors
      authentication/              Passport and authentication configuration
    workers/                       Independently started background processes
    compatibility/                 Transitional internal export entrypoints
    generated/                     Generated Prisma client; never hand edit
  prisma/                          Schema and immutable migration history
  tests/                           Maintained unit and database integration checks
frontend/
  src/
    App.tsx                        Application routes and lazy loading
    pages/editor/
      WebsiteEditor.tsx            Existing editor shell and state composition
      canvas/                      Canvas rendering with explicit state inputs
      layers/                      Layer navigator rendering and actions
      widgets/renderers/           One file per extracted widget renderer
      widgets/rendering-helpers/   URL, sharing and rendering calculations
      widgets/icons/               Named icons and icon registry
      inspector/widgets/           Individual widget inspector controls
      inspector/media/             Image selection and upload helpers
      inspector/controls/          Background, border and positioning controls
      defaults/widgets/            One initial preset per extracted widget type
      types/                       Document, style, widget and publishing contracts
      utils/operations/            Named tree and layout operations
    features/                      Feature UI, hooks, services and types
packages/editor-persistence/       Shared save coordinator and host contracts
packages/document-contract/        Portable schema, validation, hashing and legacy preservation
  src/                            Browser/cloud TypeScript implementation
  php/src/                        Independent PHP implementation of the same contract
  fixtures/                       Inputs shared by actual TypeScript and PHP tests
scripts/                          Build, checks and documented maintenance commands
infrastructure/                   Development services and deployment configuration
docs/                             Architecture, operations and navigation
```

Browse the [backend modules](../../backend/src/modules/README.md),
[editor guide](../../frontend/src/pages/editor/README.md),
[frontend features](../../frontend/src/features/README.md), or
[source catalogue](source-catalogue.json). The catalogue lists every authored
TypeScript/JavaScript file, its responsibility and its direct declaration exports.
Re-export entrypoints are intentionally listed without expanding their dependencies.

## Where to make a change

| Change | Start here |
| --- | --- |
| Sign-in or session policy | [authentication](../../backend/src/modules/authentication/README.md) |
| Website creation, ownership or metadata | [websites](../../backend/src/modules/websites/README.md) |
| Save conflicts, duplicate commands or document validation | [pages](../../backend/src/modules/pages/README.md) |
| Publishing, rollback or destination delivery | [publishing](../../backend/src/modules/publishing/README.md) |
| Browser autosave or recovery copies | [autosave](../../frontend/src/features/autosave/README.md) |
| Shared save state and retries | [save coordinator](../../packages/editor-persistence/src/save-coordinator.ts) |
| Portable documents, validation or preservation | [document contract guide](../../packages/document-contract/README.md) |
| Widget appearance | [renderers](../../frontend/src/pages/editor/widgets/renderers/) |
| Widget settings panel | [inspectors](../../frontend/src/pages/editor/inspector/widgets/) |
| Canvas or layer navigator behavior | [canvas renderer](../../frontend/src/pages/editor/canvas/create-canvas-renderer.tsx), [layer renderer](../../frontend/src/pages/editor/layers/create-layer-tree-renderer.tsx) |
| Background, border or positioning controls | [shared inspector controls](../../frontend/src/pages/editor/inspector/controls/) |
| Newly inserted widget values | [presets](../../frontend/src/pages/editor/defaults/widgets/) |
| Stored document or style shapes | [document types](../../frontend/src/pages/editor/types/document-types.ts), [style types](../../frontend/src/pages/editor/types/style-types.ts) |
| Database schema | [Prisma schema](../../backend/prisma/schema.prisma) and a new migration |

## File and identifier conventions

- Name business folders with familiar plural nouns: `websites`, `teams`, `forms`.
- Use descriptive kebab-case for backend files and non-component utilities:
  `website.controller.ts`, `save-website-draft.ts`, `find-tree-element.ts`.
- Use PascalCase for React component files matching their exported component:
  `SlidesWidgetRenderer.tsx`. Hooks start with `use`; types explain their domain.
- Keep a file focused on one operation or a small related contract. A route file
  defines paths and middleware; a controller translates HTTP; a service coordinates
  business rules; a repository owns a persistence operation. Do not create empty
  layers merely to satisfy this naming convention.
- Prefer direct imports from the owning file for new work. Existing editor barrels
  and backend compatibility exports remain available during migration.
- Name identifiers by meaning and units, such as `websiteId`, `expectedRevision`
  and `timeoutMs`. Preserve HTTP fields, widget discriminators and stored property
  names unless a separately reviewed compatibility migration changes them.

## How a draft save travels through the code

1. Editor changes reach the [autosave hook](../../frontend/src/features/autosave/hooks/useAutosave.ts).
2. The [save coordinator](../../packages/editor-persistence/src/save-coordinator.ts)
   captures a command and permits one in-flight mutation. Later edits stay separate.
3. The [cloud adapter](../../frontend/src/features/autosave/persistence/cloud-draft-adapter.ts)
   stores a recovery copy through [IndexedDB](../../frontend/src/features/autosave/persistence/local-recovery-store.ts)
   and submits the command with its stable idempotency key.
4. The [draft route](../../backend/src/modules/pages/website-draft.routes.ts)
   authenticates and validates the request before calling the
   [draft operation](../../backend/src/modules/pages/save-website-draft.ts).
5. The transaction checks current permissions, locks the website, rejects stale
   revisions and commits the draft with its receipt and audit entry. Published
   fields remain owned by the [snapshot repository](../../backend/src/modules/publishing/published-snapshot.repository.ts).
6. The returned receipt acknowledges only the submitted document. Newer browser
   edits remain unsaved until their own command is accepted. An ambiguous failure
   retains the exact command for retry.

The current publishing and WordPress limitations remain in the
[blueprint status](../architecture/production-blueprint-status.md). Moving code into
modules does not certify the complete blueprint, a native WordPress plugin,
trillion-user capacity or crash-free operation.

## Comments and parameter documentation

Authored TS/JS files have `@file` purpose headers. Named functions have JSDoc
summaries and parameter descriptions, preserving existing explanations. Critical
save contracts also document state fields, concurrency and recovery behavior.
Add `@returns` when the meaning of the result is not obvious; describe units,
defaults, mutation, permissions and failures where they affect callers.

Explain decisions and non-obvious blocks in comments. A comment for every brace,
assignment or import would make navigation harder and become stale during edits.
Generated clients, bundled output and dependencies are excluded. JSON configuration
cannot contain comments; see the [configuration guide](configuration.md). Historical
SQL migrations and supplied blueprint documents are preserved as source records.

```sh
npm run docs:check
npm run check
npm run test:integration
npm run test:journeys
```

`npm run docs:update` adds missing baseline documentation and refreshes the source
catalogue. Review its prose, especially domain-specific parameters; it cannot infer
business intent. The documentation check verifies file headers and catalogue paths,
not the truth or completeness of every comment.

The [backend move map](backend-file-moves.json) and
[editor extraction map](editor-extractions.json) connect old paths to new ones.
The [rendering extraction map](editor-rendering-extractions.json) lists the explicit
state dependencies of the four rendering modules extracted from the editor shell.
Old architecture attachments and evidence hashes describe their original snapshots;
they are not rewritten to imply that this refactor was already verified then.

## Remaining extraction work

`WebsiteEditor.tsx` still owns a large amount of coupled editor and inspector state.
Canvas, layer-tree, positioning and background rendering now live in separate files
with typed context interfaces; their state and callbacks remain owned by the shell.
Several existing feature services and the legacy widget-settings interface also
remain large. The current change extracts independently movable widget modules and
preserves the shell's behavior; it is not a claim that every existing function has
been reduced to one file. Further shell extraction should follow state boundaries
and carry browser regression coverage. The default factory also retains a historical
duplicate `price-table` case in its original order; changing that behavior is separate
from this structural refactor.

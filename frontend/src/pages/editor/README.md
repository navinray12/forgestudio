# Editor module

`WebsiteEditor.tsx` composes the current editor and its state. To change a widget,
start in the folders below before extending the shell.

| Folder or entrypoint | Responsibility |
| --- | --- |
| `canvas/create-canvas-renderer.tsx` | Canvas elements and editing interactions, using an explicit editor-state context. |
| `layers/create-layer-tree-renderer.tsx` | Nested navigator rendering and layer actions. |
| `inspector/controls/` | Shared positioning, background and border controls. |
| `widgets/renderers/` | Separate React renderers for extracted widgets. |
| `widgets/rendering-helpers/` | Shared rendering calculations, URLs and share behavior. |
| `widgets/icons/` | Named SVG components, icon registry and icon lookup. |
| `inspector/widgets/` | Individual widget inspector components. |
| `inspector/media/` | Image picking, uploads and sample-image values. |
| `defaults/widgets/` | Initial content and settings for newly inserted widgets. |
| `defaults/create-default-element.ts` | Allocates an ID and selects the widget preset. |
| `defaults/preset-section-templates.ts` | Existing section template definitions. |
| `utils/operations/` | One named tree, style or layout operation per file. |
| `types/document-types.ts` | Pages, editor elements and website document contracts. |
| `types/style-types.ts` | Responsive style, layout and breakpoint contracts. |
| `types/widget-settings-types.ts` | Widget-specific item and setting types. |
| `types/widget-registry.ts` | Widget identifiers and registry metadata. |
| `types/publishing-types.ts` | Deployment and publishing contracts used by the editor. |

For example, a slides change belongs in `SlidesWidgetRenderer.tsx`,
`SlidesWidgetInspector.tsx` or `create-slides-defaults.ts`, depending on whether it
changes output, editing controls or initial values. Keep persisted widget names
unchanged and update document types when adding settings.

Existing `renderers.tsx`, `icons.tsx`, `DynamicWidgetInspectors.tsx` and `index.ts`
entrypoints re-export implementations for compatibility. New internal imports can
point at the owning file. Read the [project guide](../../../../docs/code-navigation/README.md)
for save flow, naming rules, documentation and verification commands.

# ForgeStudio — Phase 5: Visual Editor Stability & Modularization

## 1. Executive Summary
Phase 5 establishes enterprise-grade stability, canonical data validation, atomic state mutations, bounded undo/redo history, reliable autosave synchronization with optimistic concurrency control (CAS), and modular component decomposition for the ForgeStudio visual website builder.

All implementations strictly adhere to:
- Preservation of Phase 0–4 architecture, RBAC, revisions, page lifecycle, and WooCommerce integration.
- Strict database safety isolating test mutations to `forgestudio_disposable_fresh`.
- Zero disruptive regressions across the editor workspace and rendered sites.

---

## 2. Genuine Gaps Addressed

| Feature Area | Prior State | Phase 5 Hardened Implementation |
| :--- | :--- | :--- |
| **Data Integrity & Schema** | Permissive, unstructured JSON in `editorData`; vulnerability to cyclic hierarchies and duplicate element IDs. | Canonical validation engine (`validateAndNormalizeCanonicalWebsite`, `assertCanonicalEditorData`) guarding both client and server boundaries against cycles, duplicates, max nesting depth (>50), and prototype pollution. |
| **Element Mutations** | Ad-hoc in-place mutations spread across `WebsiteEditor.tsx` (over 20,000 lines). | Centralized, pure, immutable mutation hook (`useEditorMutations`) providing `addElement`, `updateElement`, `deleteElement`, `duplicateElement`, `reorderElement`, `moveElement`, and style/prop patchers. |
| **Drag & Drop Safety** | Basic HTML5 drag/drop lacking ancestor-descendant validation; risk of dragging containers into their own children. | Hardened DnD hook (`useEditorDnD`) rejecting self-drops and descendant-drops, calculating precision insertion indicators (`before`, `after`, `inside`), autoscrolling canvas bounds, and cleaning up drag state. |
| **Undo / Redo** | Partial history stack without bounded queue or selection tracking; state loss on edge mutations. | Bounded history manager (`useEditorHistory`) capped at 50 snapshots, baseline protection (prevents below-zero undos), selection restoration, and redo branch invalidation on new actions. |
| **Autosave Synchronization** | Race condition risk during concurrent in-flight requests; unhandled 409 CAS version conflicts. | Queue-serialized autosave hook (`useAutosave`) enforcing CAS `expectedVersion`, graceful HTTP 409 conflict handling preserving local edits, offline status detection, and manual `saveNow()` coordination. |
| **Autosave Indicator** | `AutosaveStatusIndicator` was imported but omitted from JSX header toolbar. | Rendered prominently in the top header with `data-testid="autosave-status"` supporting all 6 states: `idle`, `saving`, `saved`, `error`, `offline`, and `conflict`. |
| **Editor Modularization** | Monolithic ~20,000 line `WebsiteEditor.tsx`. | Safely extracted `EditorHeaderToolbar`, `useEditorMutations`, `useEditorHistory`, and `useEditorDnD` into dedicated modular components without touching widget inspector registries. |

---

## 3. Architecture & Technical Design

### 3.1 Canonical Website JSON Schema
```typescript
interface CanonicalWebsiteData {
  version: number;
  homePageId: string;
  pages: CanonicalPage[];
  elements: EditorElement[];
  siteParts?: {
    header?: SitePart;
    footer?: SitePart;
    single?: SitePart;
    archive?: SitePart;
    notFound404?: SitePart;
    searchResults?: SitePart;
  };
  globalSettings?: Record<string, any>;
  globalStyles?: Record<string, any>;
  globalVariables?: any[];
  globalClasses?: any[];
  popups?: any[];
  breakpoints?: Breakpoint[];
  pageCss?: string;
}
```
Validation rules:
1. **Cycle Detection:** Maintains a running `ancestorIds: Set<string>` during recursion. If an element's ID exists in its ancestors, a fatal cycle error is flagged.
2. **Duplicate Element IDs:** Tracks `seenIds: Set<string>` across all pages and template scopes.
3. **Max Nesting Depth:** Caps nesting at 50 levels to prevent call stack overflow and JSON serialization failures.
4. **Slug Normalization:** Lowercases all slugs, prepends `/`, and enforces the single home page invariant (`slug: "/"`).
5. **Legacy Document Migration:** Transparently wraps legacy root-level element trees into a canonical `pages: [...]` array with default `homePageId: "home"`.

### 3.2 Unified Mutation Engine (`useEditorMutations`)
- Immutability is guaranteed by deep-cloning prior to subtree modifications.
- Duplication automatically traverses element trees to generate fresh, unique IDs for every cloned child.
- Deletion cleans up subtrees recursively and clears active selection if the deleted element or its ancestor was selected.
- Style, content, and prop updates perform atomic shallow merges on targeted nodes.

### 3.3 Drag & Drop Engine (`useEditorDnD`)
- **Hierarchy Validation:** `isDescendantOf(tree, sourceId, targetId)` prevents dragging any container into its own subtree or into itself.
- **Drop Position Calculation:** Evaluates target bounding box coordinates to assign `before` (top 25%), `after` (bottom 25%), or `inside` (middle 50% for containers).
- **Autoscroll:** Detects proximity to canvas viewport borders (threshold: 60px) and smoothly adjusts scroll offsets.
- **Cancellation:** Listens for `Escape` key and window `dragend` events to restore original hierarchy state without corruption.

### 3.4 Bounded Undo / Redo (`useEditorHistory`)
- Fixed queue capacity of 50 states. Older snapshots shift off the queue to cap browser memory footprint.
- Each snapshot retains `{ elements, selectedId, activePageId }` to ensure complete editor context is restored on undo/redo.
- Any mutation pushed after an undo cleanly truncates the forward redo branch.

### 3.5 Autosave with Optimistic CAS Concurrency
- Coordinates `expectedVersion` with backend PostgreSQL CAS updates:
  ```sql
  UPDATE "Website"
  SET "editorData" = $1, "version" = "version" + 1, "updatedAt" = NOW()
  WHERE "id" = $2 AND "version" = $3;
  ```
- If another collaborator or session increments the database version, the backend returns HTTP 409 Conflict.
- The client autosave engine catches HTTP 409, sets `status: "conflict"`, and preserves local edits in memory to prevent data loss.
- In-flight requests are serialized via `inFlightPromiseRef` and `queuedPayloadRef`.

---

## 4. Test Verification Summary

### 4.1 Gate Safety & Negative Security Checks
- Empty database URL rejected.
- Production `NODE_ENV` rejected.
- Ordinary dev databases (`forgestudio`, `elementor_saas`, `postgres`) rejected.
- Remote/cloud hosts rejected.
- Schema isolation mismatch rejected.
- Verified target disposable test database: `forgestudio_disposable_fresh`.

### 4.2 Phase 5 Test Suite (`backend/tests/phase5-editor-stability.test.ts`)
- **Module 1 (Canonical Validation):** Cycle detection, duplicate ID rejection, nesting depth guard (>50), slug normalization, legacy document migration: **PASSED**.
- **Module 2 (Mutation & History Engines):** Pure immutability, descendant-drop prevention, bounded history queue (50 limit), redo branch invalidation: **PASSED**.
- **Module 3 (Backend Integration):** CAS optimistic increment (v1 -> v2), stale save 409 conflict detection, viewer save rejection (RBAC), database roundtrip hierarchy fidelity: **PASSED**.
- **Module 4 (Playwright Chromium E2E):** Real browser editor launch, toolbar rendering, autosave indicator badge (`data-testid="autosave-status"`), manual save interaction (`data-testid="manual-save-button"`), revision history button, publish flow, and live public site verification: **PASSED**.

---

## 5. Non-Regression Checklist
- Phase 0: Base layout, design variables, and global components preserved.
- Phase 1: Authentication, session tokens, and middleware verified.
- Phase 2: Superadmin & tenant administrative boundaries untouched.
- Phase 3: RBAC roles (`OWNER`, `CONTENT_EDITOR`, `VIEWER`), split tests, and collaboration presence preserved.
- Phase 4: Page manager, dynamic routing, slugs, revision comparisons, and rollback integrity preserved.

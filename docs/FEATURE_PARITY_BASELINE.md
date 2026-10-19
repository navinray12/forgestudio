# ForgeStudio — Elementor / Competitor Feature Parity Baseline

## Scope

This baseline uses the uploaded Elementor master inventory plus the merged Professional Master Feature & Development Plan. The plan contains **778 feature IDs (F-001 through F-778)**. The requested scope excludes the explicit AI features; the current catalog identifies **27 AI features**, leaving **751 non-AI features** in scope.

The uploaded plan defines a canonical page representation shared by the editor, renderer, backend validation/persistence, WordPress connector/publisher, and later AI services. A feature is not considered Done merely because a UI control exists: the plan's Definition of Done requires implementation, review, tests where applicable, permissions, error handling, responsive behavior, sensitive-action logging, contract/documentation updates, and staging validation.

## Initial audit result

The current `main` branch is **not yet complete against the non-AI scope**. The codebase already contains a substantial editor/widget foundation, including drag/drop editing, nested containers, multi-selection, copy/duplicate/delete flows, revisions/autosave, responsive style state, hover state styling, templates, media widgets, pro widgets, WooCommerce widget foundations, and generated-code/editor tooling. However, many feature IDs remain partial or require feature-level acceptance testing, especially WordPress/CMS APIs, full theme/dynamic systems, hosting, accessibility, enterprise security, and cross-competitor interaction/condition systems.

This document intentionally does **not** claim full parity until every feature has evidence and tests.

## Competitor parity targets

The implementation should also cover the important capabilities highlighted by the competitor research:

- **Elementor Editor V4:** atomic CSS-first editing, Classes, Variables, Components, and coexistence with legacy/container workflows.
- **Bricks:** trigger/action/target interactions, interaction conditions, query loops, dynamic data, WooCommerce templates, and custom code.
- **Breakdance:** dynamic loops, conditional display logic, repeaters, advanced forms with conditional fields/actions, WooCommerce conditions, global styles, client-safe editing, and an element-development workflow.
- **Webflow:** visual development with generated clean HTML/CSS/JS as a first-class output rather than a secondary export.

These are benchmark capabilities, not permission to copy proprietary implementation details or assets.

## Delivery rules

1. Preserve one canonical page JSON/schema; do not create widget-specific persistence silos.
2. Keep editor state deterministic and serializable.
3. Enforce authorization and ownership server-side for sensitive operations.
4. Sanitize untrusted HTML/CSS/attributes/SVG before preview or publishing.
5. Avoid client-only secrets; integration credentials stay server-side and encrypted at rest.
6. Every new feature must include loading, empty, validation, permission, and failure states where applicable.
7. Do not mark a feature `verified` from a type definition alone; runtime behavior and tests are required.
8. AI remains explicitly out of scope for this parity pass.

## Tracking

The companion Excel workbook `ForgeStudio_Elementor_Parity_Tracker.xlsx` is the working feature register. It contains all 778 feature IDs, AI-exclusion flags, phase/priority/owner, and the current audit baseline. Update the workbook whenever a feature moves from audit-pending/partial to verified.

# Master implementation status — evidence-based gap matrix

Date: 2026-09-28  
Branch: `webflow`  
Latest tested application revision: `747698d01d77d6dc32725c5f657097181784f670`  
Passing verification run: https://github.com/navinray12/forgestudio/actions/runs/36460277583

This matrix is based on the repository as implemented and tested. A feature is not marked PRESENT merely because a screen exists. PARTIAL means a real vertical slice exists but the attached master specification contains material behavior that is still absent or unqualified.

| Domain | Status | Repository evidence / boundary |
| --- | --- | --- |
| Authentication/session validation | PRESENT/PARTIAL | Existing auth plus active-session checks in Studio modules. Google/OAuth exists in inherited routes, but the complete account-security/MFA/suspicious-activity specification is not qualified end-to-end here. |
| Tenant/site authorization | PRESENT/PARTIAL | `backend/src/modules/studio-next/database.ts`, granular capability checks, cross-tenant tests. Full application-wide RLS and every inherited endpoint are not yet qualified. |
| Shared human/AI command system | PRESENT for Designer saves | `commands.ts` is now authoritative for manual Designer save and applied AI copy changes. Command receipts carry actor/site/source/idempotency/correlation and audit information. Other legacy mutations still need migration onto the command layer. |
| AI provider abstraction | PARTIAL | `ai.ts` provides provider-neutral structured generation with OpenAI/Anthropic adapters and environment-selected copy model. Full model registry, fallback routing, budgets, provider health and Super Admin model configuration remain. |
| Reviewable AI changesets | PRESENT for copy edits | AI copy proposals are persisted, previewed, explicitly applied/rejected, stale-safe and audited. Full-site/section/component/CMS/SEO/image/code generation changesets remain. |
| Visual Designer | PARTIAL | Existing editor plus hash conflict checks, autosave failure handling, content/design restrictions, components/classes/variables in inherited modules. Full canonical command coverage, multi-select parity, complete interactions/slots/variants and incremental patch history remain. |
| CMS | PARTIAL | Typed collections/items, draft/live separation, revisions, scheduling, localization, relations and JSON import exist. CSV, bulk editing, dynamic Designer bindings, richer file/multi-option fields and complete CMS webhooks remain. |
| Blog | PARTIAL/MISSING | CMS primitives can model a blog; first-class authors/categories/tags/RSS/blog search/author/category pages are not implemented as a complete product slice. |
| Assets | PARTIAL | Inherited upload/media and editor asset functionality exists. Provenance, durable object-storage lifecycle, scan pipeline, rendition governance and AI generation/edit insertion are not fully qualified. |
| Localization | PARTIAL | Secondary locales and page/CMS translation lifecycle exist. Localized slugs/routes, hreflang, localized sitemap, RTL and translation approval/glossary workflow remain. |
| Collaboration/reviews | PARTIAL | Persisted reviews and authenticated presence exist. Cluster-wide presence and CRDT/OT simultaneous document merge are not implemented. |
| Roles/permissions | PARTIAL | Site capabilities and workspace owner/admin/member behavior are enforced in new routes. Arbitrary role builder, enterprise SSO/SCIM and complete inherited-route coverage remain. |
| Versions/snapshots | PARTIAL | Design snapshots and CMS revisions exist. General named changesets/releases for every substantial human/AI operation and branch workflows remain. |
| Publishing/releases | PARTIAL | Existing publishing modules remain; new CMS publish lifecycle is verified. Immutable artifact release pipeline with prepare/build/deploy/status/rollback provider abstraction is not complete. |
| Custom domains | PARTIAL | TXT ownership verification and unique claims exist. DNS writes, TLS, routing, canonical/apex/www management and health remain. |
| Commerce/billing | PARTIAL | Server-controlled one-product Stripe Checkout and signed reconciliation exist. Carts, inventory, taxes, shipping, refunds, recurring subscriptions, invoices and entitlements remain. |
| Analytics/experiments | PARTIAL | Consent-gated events and deterministic weighted text experiments exist. Aggregation warehouse, richer dimensions/events, statistical analysis and personalization engine remain. |
| Forms | PARTIAL | Inherited form routes/features exist. The master specification's complete visual form builder, anti-spam pipeline, connector delivery and qualification remain to be consolidated. |
| Interactions/animations | PARTIAL | Existing editor concepts exist, but a fully qualified structured interaction authoring/runtime system with accessibility/reduced-motion coverage remains. |
| Public API/webhooks/MCP | PARTIAL | Versioned APIs and existing API-key/developer routes exist. Unified scoped agent tool surface and durable signed webhook outbox/redelivery catalog remain. |
| Feature switches | PARTIAL | Existing application has feature/config behavior, but the governed centralized switch plane described in the master specification is not complete. |
| AI cost/usage governance | MISSING/PARTIAL | AI run usage is recorded for the new copy slice; reservations, budgets, price metadata, warnings/hard limits and workspace dashboards remain. |
| Generated-code sandbox | MISSING | No claim of secure arbitrary AI React code execution is made. Needs isolated compile/runtime/network/filesystem/resource policy and browser/a11y checks. |
| Hosting abstraction | PARTIAL/MISSING | Existing hosting/deployment routes exist, but a single verified PublishingProvider contract with immutable releases and rollback is not established across providers. |
| Durable async jobs/outbox | PARTIAL | Scheduled CMS/invitation worker exists. General durable jobs, retries/DLQ/reconciliation, Redis/BullMQ adapters and transactional event outbox remain. |
| Observability | PARTIAL | Request IDs and some audit/error reporting exist. Structured tracing, metrics, SLOs and alerts across API/DB/worker/provider paths remain. |
| Security hardening | PARTIAL | Origin checks, validation, parameterized queries, signed webhooks, bounded bodies and tenant tests exist. Full CSP/custom-code isolation, SSRF/upload malware controls, secrets rotation and application-wide security qualification remain. |
| CI/E2E | PRESENT for implemented slices | Final run builds frontend/backend and passes existing and new PostgreSQL/browser suites. Load, chaos, cross-browser, accessibility and live-provider staging gates remain. |
| Deployment automation | PARTIAL | Verification CI exists. Staging/prod promotion, migration gate, approval, production smoke and automated rollback pipeline are not implemented by this branch. |

## Foundation implemented in this increment

The new command path follows the required invariant: both a human Designer save and an approved AI copy edit call `DomainCommands.saveDesign()`. That handler performs site authorization, stale-hash validation, design/content policy checks, persistence, idempotent command receipt storage and audit emission before returning an acknowledged hash.

The AI path does not write arbitrary SQL and does not receive infrastructure credentials. It reads only the scoped site/design context required for the selected element, treats existing site text as untrusted data, validates the model's structured result, persists a proposed changeset, and requires explicit Apply before invoking the shared domain command. Reject performs no website mutation.

## Verification

Run `36460277583` completed all six jobs successfully:

- full frontend install/build — PASS
- full backend install/Prisma generation/build — PASS
- existing Studio validation/PostgreSQL tests — PASS
- new Site Studio tests — **81 passed, 0 failed**
- existing dashboard Chromium smoke suite — PASS
- real-session/PostgreSQL Site Studio Chromium suite — **12 passed, 0 failed**

The total current automated case count recorded by the project verification suites is **147 passing cases**, plus both complete application builds.

## Next implementation order

Continue from the master specification without rewriting working modules: expand the shared command layer from Designer saves into page/element/style/component/CMS commands; add the full AI model registry/router and budget governance; then implement AI section/page/site generation using those commands; follow with immutable release/build/rollback infrastructure, assets/forms/interactions consolidation, durable job/outbox adapters, and finally enterprise/observability/load/chaos/security qualification.

Do not mark Webflow-equivalent completion until those remaining rows move from PARTIAL/MISSING to tested vertical slices.

# Master implementation status — evidence-based gap matrix

Date: 2026-09-28  
Branch: `webflow`  
Latest tested application revision: `5496e5252790bf9b91ec53763faf0e9714f5808a`  
Passing verification run: https://github.com/navinray12/forgestudio/actions/runs/36475537194

This matrix is based on the repository as implemented and tested. A feature is not marked PRESENT merely because a screen exists. PARTIAL means a real vertical slice exists but the attached master specification contains material behavior that is still absent or unqualified.

| Domain | Status | Repository evidence / boundary |
| --- | --- | --- |
| Authentication/session validation | PRESENT/PARTIAL | Existing auth plus active-session checks in Studio modules. Google/OAuth exists in inherited routes, but the complete account-security/MFA/suspicious-activity specification is not qualified end-to-end here. |
| Tenant/site authorization | PRESENT/PARTIAL | `backend/src/modules/studio-next/database.ts`, granular capability checks, cross-tenant tests. Full application-wide RLS and every inherited endpoint are not yet qualified. |
| Shared human/AI command system | PRESENT for implemented Designer/page/CMS generation slices | `commands.ts` and `cms-commands.ts` provide typed stable-ID/page/design-system/CMS mutations, optimistic concurrency, idempotency and audit. Human edits, approved AI changes and Agent API edits use these services. Legacy mutation routes still need complete migration/qualification. |
| AI provider abstraction | PARTIAL | `ai.ts` has OpenAI/Anthropic adapters, role-based model registry, configured fallback routing and versioned prompts. COPY/EDITOR/PLANNER-backed workflows and site AI budgets are implemented. Provider health and persistent Super Admin model-routing controls remain. |
| Reviewable AI changesets | PRESENT for copy/section/page/site/CMS/SEO slices | Proposals are persisted, previewed and explicitly applied/rejected. Full-site generation plans then builds structured editable pages/design tokens; AI CMS creates drafts only; SEO is page-local. Image/code-component generation and visual repair remain. |
| Visual Designer | PARTIAL | Existing editor plus hash conflict checks, autosave failure handling, content/design restrictions, components/classes/variables in inherited modules. Full canonical command coverage, multi-select parity, complete interactions/slots/variants and incremental patch history remain. |
| CMS | PARTIAL | Typed collections/items, draft/live separation, revisions, scheduling, localization, relations and JSON import exist. CSV, bulk editing, dynamic Designer bindings, richer file/multi-option fields and complete CMS webhooks remain. |
| Blog | PARTIAL/MISSING | CMS primitives can model a blog; first-class authors/categories/tags/RSS/blog search/author/category pages are not implemented as a complete product slice. |
| Assets | PARTIAL | Inherited upload/media and editor asset functionality exists. Provenance, durable object-storage lifecycle, scan pipeline, rendition governance and AI generation/edit insertion are not fully qualified. |
| Localization | PARTIAL | Secondary locales and page/CMS translation lifecycle exist. Localized slugs/routes, hreflang, localized sitemap, RTL and translation approval/glossary workflow remain. |
| Collaboration/reviews | PARTIAL | Persisted reviews and authenticated presence exist. Cluster-wide presence and CRDT/OT simultaneous document merge are not implemented. |
| Roles/permissions | PARTIAL | Site capabilities and workspace owner/admin/member behavior are enforced in new routes. Arbitrary role builder, enterprise SSO/SCIM and complete inherited-route coverage remain. |
| Versions/snapshots | PARTIAL | Design snapshots, CMS revisions, AI named changesets and immutable release records exist. General human branch/change-set workflows and merge semantics remain. |
| Publishing/releases | PARTIAL | `releases.ts` prepares checksum-addressed immutable artifacts, deploys through a `PublishingProvider`, verifies provider state before activation, maintains an active pointer and rolls back by redeploying a prior artifact. External cloud-provider adapters/build pipelines remain unqualified. |
| Custom domains | PARTIAL | TXT ownership verification and unique claims exist. DNS writes, TLS, routing, canonical/apex/www management and health remain. |
| Commerce/billing | PARTIAL | Server-controlled one-product Stripe Checkout and signed reconciliation exist. Carts, inventory, taxes, shipping, refunds, recurring subscriptions, invoices and entitlements remain. |
| Analytics/experiments | PARTIAL | Consent-gated PAGEVIEW/CLICK/FORM_SUBMIT/CONVERSION/CUSTOM_EVENT ingestion with bounded attributes and deterministic text experiments exists. Aggregation warehouse, richer dimensions, statistical analysis and personalization remain. |
| Forms | PARTIAL | Inherited form routes/features exist. The master specification's complete visual form builder, anti-spam pipeline, connector delivery and qualification remain to be consolidated. |
| Interactions/animations | PARTIAL | Existing editor concepts exist, but a fully qualified structured interaction authoring/runtime system with accessibility/reduced-motion coverage remains. |
| Public API/webhooks/MCP | PARTIAL/PRESENT for new Studio slices | Durable signed webhook endpoints/deliveries, retry/dead-letter/manual redelivery and a controlled Agent API tool catalog now exist. Agent execution inherits the connected human's permissions and uses domain services; broader external OAuth/service-account scopes and a complete public platform API remain. |
| Feature switches | PARTIAL/PRESENT for Studio capabilities | Global + per-site switches now cover AI roles, localization, commerce, analytics, experiments, personalization, custom code, MCP and webhooks. A complete platform-wide Super Admin switch plane across every inherited legacy feature remains. |
| AI cost/usage governance | PARTIAL | AI runs record provider/model/units/latency; concurrent-safe monthly site reservations, hard limits and warning thresholds exist. Provider price metadata, monetary cost reconciliation and broader workspace/user budgets remain. |
| Generated-code sandbox | MISSING | No claim of secure arbitrary AI React code execution is made. Needs isolated compile/runtime/network/filesystem/resource policy and browser/a11y checks. |
| Hosting abstraction | PARTIAL/MISSING | Existing hosting/deployment routes exist, but a single verified PublishingProvider contract with immutable releases and rollback is not established across providers. |
| Durable async jobs/outbox | PARTIAL | Scheduled CMS/invitation worker plus durable webhook delivery/retry/dead-letter state exists. General AI/build job execution and optional broker adapters remain. |
| Observability | PARTIAL | Request IDs and some audit/error reporting exist. Structured tracing, metrics, SLOs and alerts across API/DB/worker/provider paths remain. |
| Security hardening | PARTIAL | Origin checks, validation, parameterized queries, signed webhooks, bounded bodies and tenant tests exist. Full CSP/custom-code isolation, SSRF/upload malware controls, secrets rotation and application-wide security qualification remain. |
| CI/E2E | PRESENT for implemented slices | Final run builds frontend/backend and passes existing and new PostgreSQL/browser suites. Load, chaos, cross-browser, accessibility and live-provider staging gates remain. |
| Deployment automation | PARTIAL | Verification CI exists. Staging/prod promotion, migration gate, approval, production smoke and automated rollback pipeline are not implemented by this branch. |

## Foundation implemented in this increment

The new command path follows the required invariant: both a human Designer save and an approved AI copy edit call `DomainCommands.saveDesign()`. That handler performs site authorization, stale-hash validation, design/content policy checks, persistence, idempotent command receipt storage and audit emission before returning an acknowledged hash.

The AI path does not write arbitrary SQL and does not receive infrastructure credentials. It reads only the scoped site/design context required for the selected element, treats existing site text as untrusted data, validates the model's structured result, persists a proposed changeset, and requires explicit Apply before invoking the shared domain command. Reject performs no website mutation.

## Verification

Run `36475537194` completed all six jobs successfully:

- full frontend install/build — PASS
- full backend install/Prisma generation/build — PASS
- existing Studio validation/PostgreSQL tests — PASS
- new Site Studio tests — **108 passed, 0 failed**
- existing dashboard Chromium smoke suite — PASS
- real-session/PostgreSQL Site Studio Chromium suite — **14 passed, 0 failed**

The total current automated case count recorded by the project verification suites is **176 passing cases**, plus both complete application builds.

## Next implementation order

Continue from the master specification without rewriting working modules. The next highest-value gaps are: Super Admin AI Infrastructure/provider-health controls; Designer-native CMS binding and fuller component/interaction command coverage; asset provenance/image generation; localized routing/SEO; generated-code sandboxing; external hosting providers/build artifacts; enterprise SSO/SCIM; distributed collaboration; observability/load/chaos/security qualification; and full live-provider/staging E2E.

Do not mark Webflow-equivalent completion until those remaining rows move from PARTIAL/MISSING to tested vertical slices.

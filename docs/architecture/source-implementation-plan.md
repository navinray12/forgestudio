# ForgeStudio — Architecture Review and Implementation Blueprint

**Review date:** 14 September 2026  
**Repository:** `navinray12/forgestudio`  
**Reviewed snapshot:** `main` at `e6e126ff02a962cafbce16093250dbb7d279e1fd`  
**Deliverable status:** Proposed architecture and implementation plan; no repository changes made.

## 1. Scope, evidence, and conclusion

This is a static, read-only review of selected source files, package manifests, database definitions, and directory listings. It is not an exhaustive line-by-line audit, a successful build report, a penetration test, a load-test result, or a live WordPress certification. Builds and tests were not executed. A runtime checkout could not be obtained through the container network, so source inspection used the connected GitHub reader.

The reviewed application has useful React/TypeScript editor components, widget implementations, an Express API, a PostgreSQL/Prisma model, permissions, revisions, and publishing concepts. Preserve and refactor those assets. However, several implementation paths report success without proving the promised external work occurred. This is a release-blocking correctness problem, not something that more servers will fix.

The recommended destination is **one product, one portable document contract, two native hosting backends, and an optional connection protocol**. Start with a modular cloud API and separately deployable workers. Do not start with a rewrite into many microservices.

The engineering objective is not an unreviewable architecture or an absolute promise that nothing fails. It is a system whose assumptions are explicit, whose important operations have testable invariants, whose failures are contained, and whose recovery has been demonstrated.

Throughout this document, current-code observations cite repository evidence labels [R1]–[R13]. All proposed paths, APIs, limits, targets, and milestones are recommendations, not claims that those features already exist.

## 2. Findings that should determine the order of work

### F01 — WordPress connection and publish success are simulated — P0

**Current files:** `backend/src/services/wordpress/connector.service.ts`.

`connectWordPress()` accepts configuration and marks the connection connected without a remote handshake. `verifyWordPressConnection()` updates the local timestamp and returns hardcoded WordPress/plugin versions. `publishToWordPress()` contains intended HTTP requests only as comments and allocates a new post ID using `1000 + existingMappings.length + i + 1`. Media counts count references rather than completed uploads. [R1]

**Required change:** Remove this adapter from production registration until actual authenticated requests, returned WordPress IDs, media acknowledgements, revision checks, and read-back verification exist. Test doubles belong in tests or an explicitly labeled demo environment. A configured destination is not a verified destination.

**Acceptance:** An unreachable site never becomes verified. A rejected credential never creates a connected state. Publishing creates a real WordPress post; the returned ID is read from WordPress and confirmed by a second request. An uncertain network result creates a reconciling operation, not a fabricated success.

### F02 — SFTP transfer and verification are also simulated — P0

**Current file:** `backend/src/services/destinations/sftp.publisher.ts`.

The publisher compiles files and creates a list of remote path strings but does not perform a network transfer. Its verification checks that configuration fields are present. [R2]

**Required change:** Disable SFTP as a production destination or complete a separately tested adapter with server host-key verification, protected credentials, real uploads, destination checksums, staging directories, and a supported activation mechanism. Static export and transfer are different capabilities. SFTP need not delay the three required ForgeStudio journeys.

### F03 — The publishing workflow does not enforce its stated durability order — P0

**Current file:** `backend/src/services/publishing.service.ts`.

The candidate snapshot is built in memory, destination operations occur, and the durable publish revision is created later. The final verification reloads the local website and checks local `publishedData.version`, not necessarily the external destination. The same file updates mutable `editorData` while publishing and reuses that path for rollback. [R3]

**Required change:** Persist an immutable candidate revision before side effects. Separate draft state, release artifacts, delivery operations, and active-release pointers. Verify destination receipts and content before declaring success. Restore-to-draft and rollback-live must be distinct commands.

**Acceptance:** Kill the process at each stage; the system can identify the exact intended snapshot and previous release. A rollback leaves newer unpublished edits unchanged.

### F04 — A terminal publishing state can be overwritten — P0

Intermediate `updateDeploymentStatus()` calls do not update the local `deployment` variable. The outer catch tests this stale object and can write `DEPLOY_FAILED` after a nested path already wrote `RECONCILIATION_REQUIRED` or `VERIFICATION_FAILED`. [R3]

**Required change:** Use guarded state transitions in the repository, based on the current database state and operation generation. Do not decide transitions using a stale object retained across multiple writes.

**Acceptance:** A forced revision-linkage failure remains reconciling and is picked up by recovery. No generic catch replaces a more informative terminal or uncertain state.

### F05 — Background work can be acknowledged into process memory — P0

**Current file:** `backend/src/services/jobs/jobRunner.ts`.

A failed database enqueue falls back to an in-memory array. Claiming a job reads the first queued record and updates it in separate operations. Completion-persistence failures are suppressed. There is no demonstrated durable lease recovery for a worker that dies while a job is running. [R4]

**Required change:** Persist operation intent and an outbox event transactionally; dispatch through a durable queue. Use leases, idempotency, bounded retries, and reconciliation. Never return a durable-acceptance response for an operation held only in memory.

**Acceptance:** Two workers cannot independently activate the same operation. Restarting the API cannot erase an accepted job. A dead worker's operation is reclaimed without creating a second logical release.

### F06 — Permission-query failure can bypass an explicit override — P0

**Current file:** `backend/src/services/permission.service.ts`.

Granular permission lookup errors are caught and evaluation continues using role defaults. A default role permission may allow an action that a stored override denied. The middleware also calls `next()` when no website ID is found. [R5]

**Required change:** Distinguish policy absence from policy lookup failure. Return a controlled unavailable/error result when required policy data cannot be read. Validate that middleware has the resource context it requires. Use a single typed authorization policy throughout HTTP routes, services, and workers.

**Acceptance:** Inject a policy-table failure for a user with an explicit deny; no action succeeds through the role fallback. Missing resource context is not silently authorized.

### F07 — Webhook verification and acknowledgement need redesign — P0

**Current files:** `backend/src/app.ts`, `backend/src/controllers/wordpress.controller.ts`, and `backend/src/services/wordpress/webhook.service.ts`.

Global JSON parsing precedes routes. The WordPress controller reconstructs a body with `JSON.stringify()` rather than preserving the original signed bytes. Timestamp checks are conditional on a truthy value. Form-persistence errors are caught while processing can still return success. [R6]

**Required change:** Capture the original bytes before parsing; verify the precise envelope, required timestamp, signature, and connection. Commit a deduplicated inbox event before acknowledgement. Process business actions asynchronously from the inbox. Separate the webhook signing secret from outbound credentials.

**Acceptance:** Valid signatures survive whitespace differences in JSON representation because the exact received bytes are verified. Missing timestamps are rejected. Duplicate event IDs cause one logical submission. A database outage cannot produce an accepted response unless the event has another explicitly durable store.

### F08 — Startup runs schema mutations — P0

**Current file:** `backend/src/config/prisma.ts`.

The database module starts an asynchronous schema-update routine on import, executing `ALTER TYPE`, `ALTER TABLE`, and related statements while suppressing individual errors. [R7]

**Required change:** Move schema changes into one versioned migration history. Run a controlled migration job with DDL privileges. The API account must not need those privileges. Application readiness should verify schema compatibility rather than modify it.

**Acceptance:** A fresh database and an upgraded database reach the same expected schema through migrations. Two API replicas starting together do not race to change tables.

### F09 — Shared-editor extraction is necessary, but some modular work already exists — P1

**Current file:** `frontend/src/pages/editor/WebsiteEditor.tsx`.

The file is 891,404 source bytes. Its inspected imports couple it to routing, publishing, autosave, revision history, and templates. Existing `components`, `types`, `utils`, `widgets`, and `inspector` directories already provide useful extraction points. The source-file size is not a measured browser bundle size. [R8]

**Required change:** Extract by responsibility and preserve the interface. Introduce the environment adapter before duplicating the editor for WordPress. Move a small widget set through the entire contract first, then expand by parity tests.

### F10 — Published rendering still depends on editor code and includes no-op helpers — P1

**Current file:** `frontend/src/pages/published/PublishedSite.tsx`.

The public component imports editor utilities and widgets. `f352_getMediaOptimizationProps()` returns only `{ src }`; `getGlobalCustomCss()` returns an empty string. Breakpoints are duplicated locally. [R9]

**Required change:** Separate the public renderer from the editor package and implement the intended output behavior. Use one responsive-style specification. Replace feature-number helper names with names describing behavior.

### F11 — The data model needs a clear ownership and revision boundary — P1

**Current file:** `backend/prisma/schema.prisma`.

The reviewed schema includes `Website.editorData` JSON and optional team/workspace/organization references, along with revisions, deployments, permissions, and WordPress mappings. [R10]

**Required change:** Choose one authoritative tenant hierarchy, enforce parent consistency, and introduce page-level drafts/revisions. Do not retain several competing owners that individual features interpret differently. Preserve existing IDs through migration.

### F12 — Test intent exists, but execution safety and integration proof need work — P0/P1

Both package manifests lack a test command. The backend contains eight named test files. The inspected WordPress suite chooses a known user or the first database user and changes that user's plan, so it must not be run against a valuable database. Existing simulated connector behavior cannot establish live WordPress publishing. [R11]

**Required change:** Standard test commands, disposable databases, dedicated credentials, production-environment refusal, CI gates, and real WordPress integration tests. Rename suites by behavior instead of historical phase letters.

### F13 — Repository cleanup is warranted — P1

Root command-output-like files, rejected patch files, temporary multi-megabyte editor diffs, and patch scripts appear in the reviewed tree. [R12]

**Required change:** Classify each file as product source, test, maintained tooling, generated output, or accidental artifact. Review rejected patches before deletion; they may contain unapplied intended changes. Remove obsolete artifacts from the active tree, improve ignore rules, and document genuine maintenance scripts. Do not rewrite Git history without a separate reason and agreement.

### F14 — A connector is not a native WordPress product — P1

The reviewed root is organized as `frontend/` and `backend/`, not the proposed shared packages and separately distributed `wordpress-plugin/` package. [R12]

**Required change:** Deliver a real plugin bootstrap, PHP repositories/renderers, authenticated REST endpoints, compiled editor assets, native media integration, upgrade/uninstall behavior, and local-only acceptance tests. Do not embed a cloud iframe and call that the native mode.

## 3. Product boundaries and architectural decisions

### 3.1 Three supported journeys

| Journey | Editing authority | Primary content storage | Publication path |
|---|---|---|---|
| Standalone | ForgeStudio cloud | PostgreSQL; object storage for assets and release files | Immutable cloud release to object storage/CDN |
| Native WordPress | Local WordPress installation | WordPress posts, metadata, media, and justified plugin tables | Local PHP lifecycle and release selection |
| Connected | Exactly one designated owner per page | Owner holds editable source; destination retains its deployed copy and history | Authenticated, versioned, conflict-checked transfer |

The WordPress core editor, local assets, local revision recovery, and local publication must not require a cloud login, license server response, remote font service, or remote template service. Hosted features are separate optional integrations. A connected page whose authority is cloud-owned should not silently become locally writable during a cloud outage; users can edit a fork or follow an explicit authority-recovery process.

### 3.2 Initial technology choices

Retain React and TypeScript for the editor. Retain Express and Prisma/PostgreSQL initially instead of combining a risky framework migration with the architecture repair. Use PHP for the WordPress backend and compiled browser assets for its editor. Standardize one supported Node/TypeScript toolchain and reproducible dependency installation; the current frontend and backend declare different TypeScript major versions. [R13]

Use one workspace with an explicit package manager and lockfile. Introduce shared packages only for actual reusable contracts or behavior. Use BullMQ with a separately operated persistent Redis instance for cloud jobs, backed by a PostgreSQL operation journal and outbox. Do not use the disposable cache instance as the queue store. BullMQ's production guidance calls for Redis persistence and a `noeviction` policy. [S5]

Use S3-compatible object storage plus a CDN for immutable release files. Start with managed containers or another deployment environment the team can reliably operate. Container images are a packaging boundary, not a reliability guarantee. Add Kubernetes, Kafka, service mesh, search infrastructure, and regional cells only when measured requirements justify their operational cost.

### 3.3 Deployment shape

```text
Browser editor
  -> shared visual-editor package
      -> CloudEditorAdapter -> cloud API -> PostgreSQL
      -> WordPressEditorAdapter -> local WordPress REST -> local storage

Cloud API transaction
  -> immutable revision + release request + outbox event
  -> durable dispatch -> background worker
      -> cloud build/upload/activation
      -> connected WordPress stage/verify/activate

Public cloud visitors -> CDN -> immutable site artifacts
Public WordPress visitors -> PHP/theme -> active local revision and local assets

Optional cloud templates, AI, analytics and collaboration
  -> separate capabilities; not prerequisites for core local editing
```

Keep the cloud API as a **modular monolith**: one deployable API containing clearly owned feature modules. Workers and public serving are separate deployables because they have different resource use and failure modes. Splitting accounts, pages, permissions, and revisions into separate network services at this stage would make the first important transaction harder to keep correct.

## 4. Human-readable repository structure

The following is proposed, not a description of the current tree.

```text
forgestudio/
├── apps/
│   ├── website-builder/src/
│   │   ├── pages/
│   │   ├── account/
│   │   ├── workspace/
│   │   └── editor/
│   ├── backend-api/src/
│   │   ├── modules/
│   │   │   ├── accounts/
│   │   │   ├── workspaces/
│   │   │   ├── sites/
│   │   │   ├── pages/
│   │   │   ├── media/
│   │   │   ├── publishing/
│   │   │   └── wordpress-connections/
│   │   └── platform/
│   │       ├── database/
│   │       ├── authentication/
│   │       ├── observability/
│   │       └── configuration/
│   ├── background-workers/src/jobs/
│   └── published-site-runtime/src/
├── packages/
│   ├── visual-editor/src/
│   │   ├── canvas/
│   │   ├── layers/
│   │   ├── inspector/
│   │   ├── commands/
│   │   ├── history/
│   │   └── persistence/
│   ├── editor-document/src/
│   ├── widget-definitions/src/
│   ├── website-renderer/src/
│   ├── cloud-adapter/src/
│   ├── wordpress-adapter/src/
│   └── ui-components/src/
├── wordpress-plugin/
│   ├── forgestudio.php
│   ├── includes/
│   │   ├── editor/
│   │   ├── rest-api/
│   │   ├── permissions/
│   │   ├── page-storage/
│   │   ├── rendering/
│   │   ├── cloud-connection/
│   │   └── database-upgrades/
│   ├── assets/
│   ├── templates/
│   ├── tests/
│   ├── readme.txt
│   └── uninstall.php
├── database/                 # One cloud Prisma schema and migration history
├── infrastructure/
├── tests/
│   ├── contracts/
│   ├── editor-compatibility/
│   ├── wordpress-compatibility/
│   ├── security/
│   ├── load/
│   └── recovery/
└── docs/
    ├── architecture/
    ├── decisions/
    └── runbooks/
```

**Naming convention:** React components use `EditorCanvas.tsx`, `LayersPanel.tsx`, `PublishDialog.tsx`, and `RevisionHistoryPanel.tsx`. Hooks use `useAutosave.ts`. Application operations use `save-page-draft.ts`, `request-site-publish.ts`, `activate-release.ts`, and `reconcile-deployment.ts`. PHP follows explicit names such as `class-page-repository.php`, `class-publish-controller.php`, and `class-page-renderer.php` within a plugin namespace.

Avoid `manager2`, `advanced-engine`, `ultimate-service`, `phase7`, `final-new`, or feature-number prefixes. A module name should explain the business responsibility. Do not create a class/interface pair for every trivial function. Use interfaces at real boundaries: database, queue, destination, media, identity, and the editor host. Keep tests near their feature where practical and reserve root tests for cross-package journeys.

**Enforced dependency direction:** `editor-document` depends on neither React nor databases. `widget-definitions` depends on the document vocabulary. `visual-editor` depends on these contracts and UI, not cloud services. Host applications compose adapters. The public renderer cannot import editor panels, authentication, or Monaco. PHP implements the same contract, not a hidden TypeScript server dependency. Add import-boundary checks to CI.

## 5. Portable document and editor contracts

### 5.1 Separate the identities that are currently easy to conflate

`schemaVersion` describes the document format. `widgetVersion` describes a widget's settings/behavior. `revision` is an opaque concurrency token for a stored draft. `releaseId` identifies a deployed immutable artifact set. `rendererVersion` identifies compilation behavior. `authorityEpoch` rejects writes from an old editing owner. None should be overloaded into a generic `version` field.

Use a shared JSON Schema vocabulary with a tested subset both TypeScript and PHP can validate. Generate TypeScript types or validate their consistency. Do not assume a TypeScript interface or a Zod schema can be automatically executed as PHP validation.

A page document should contain stable node IDs, root IDs, typed widget settings, child relationships, breakpoints, responsive overrides, design-token references, asset references, content bindings, and page metadata. Keep browser selection, open panels, zoom, cursor positions, and authentication out of the portable document.

Keep site settings, route maps, global headers/footers, and reusable components as separately revisioned site resources. A release manifest pins their revisions together with page revisions so that later global-component edits do not alter an old release unexpectedly.

### 5.2 Validation rules

Reject duplicate IDs, missing children, cycles, excessive nesting, invalid widget settings, unsupported schema versions for writing, unsafe URLs, invalid attributes, and invalid asset references. Set documented document-byte, node-count, nesting-depth, media-size, and request-time limits and test them at both server boundaries. The API's current 2 MB body limit must be reconciled with the intended maximum supported document rather than bypassed inconsistently. [R6]

Unknown widgets must retain their source data. Render a safe editor placeholder and a compatibility issue. Block publication when omission would be destructive, unless the user explicitly chooses a supported fallback. Never silently drop unknown properties during a format migration.

### 5.3 Suggested adapter API

These signatures describe a proposed contract; they are not an implementation already present in the repository.

```ts
interface EditorHostAdapter {
  getCapabilities(): Promise<HostCapabilities>;
  loadPage(pageId: string, signal?: AbortSignal): Promise<PageDraft>;
  savePageDraft(input: SavePageDraftInput): Promise<SavedPageDraft>;
  uploadMedia(input: UploadMediaInput): Promise<MediaAsset>;
  listRevisions(pageId: string, cursor?: string): Promise<RevisionPage>;
  restoreRevisionToDraft(input: RestoreDraftInput): Promise<PageDraft>;
  publishPage(input: PublishPageInput): Promise<PublishReceipt>;
  getOperation(operationId: string): Promise<OperationStatus>;
  checkPermission(input: PermissionQuery): Promise<PermissionResult>;
}

interface SavePageDraftInput {
  pageId: string;
  expectedRevision: string;
  mutationId: string;
  authorityEpoch: number;
  document: PageDocument;
}
```

A successful draft save returns the persisted revision token, normalized document hash, and accepted mutation ID. A publish request returns an operation receipt, not an immediate claim that the website is live. `checkPermission()` helps render the interface; every write endpoint independently enforces the same permission on the server.

Both adapters must expose equivalent error meanings: unauthenticated, forbidden, revision conflict, authority conflict, unsupported capability, validation error, quota reached, retryable unavailable, and uncertain external outcome. Adapter-specific HTTP routes and authentication should not leak into canvas code.

### 5.4 Editing and recovery behavior

Use explicit document commands, grouped undo/redo transactions, normalized node lookup, and selective subscriptions. Keep frequent pointer/drag state outside persistent document state. Lazy-load heavy inspectors and code-editing tools. Implement keyboard alternatives to drag-and-drop and preserve focus when panels change.

Autosave should debounce and coalesce changes, send an expected revision, and never let an older acknowledgement replace newer edits. Show separate states for changes in memory, changes backed up on the device, and changes saved to the host. A bounded IndexedDB recovery journal is a recovery aid, not a promise that browser storage can never disappear. Scope it by account/site, provide retention controls, and handle logout and shared-device privacy.

On a revision conflict, preserve the local draft and offer comparison, a fork, or explicit replacement subject to permission. Start with a clear single-writer/conflict model. Real-time concurrent editing and CRDTs require a separate product and persistence design; they are not a prerequisite for connected publishing.

## 6. Cloud data model and isolation

Choose a single ownership chain: **account -> workspace -> site -> page**. An account is the billing/contract boundary; a workspace is the collaboration boundary; sites own pages, assets, connections, and releases. Retain a personal account/workspace for existing individual users. Organization branding can be an attribute or an explicitly mapped parent, not an independent competing authorization shortcut.

Recommended logical entities, to be reconciled with existing Prisma models:

| Entity | Responsibility and constraints |
|---|---|
| Account / Workspace / Membership | Ownership, billing context, role, invitation lifecycle; unique membership and consistent parent references |
| Site / Page | Native cloud identities and routes; unique normalized route within a site/locale |
| PageDraft | Current revision pointer and revision token; compare-and-swap update rather than last-write-wins |
| PageRevision | Immutable document, document hash, schema version, author, reason, timestamp |
| SiteResourceRevision | Versioned design tokens, global components, navigation, and site settings |
| Asset / AssetVariant | Logical asset ID, owner, checksum, media type, byte size, processing state, storage object reference |
| Release / ReleaseItem | Frozen page/resource revisions, renderer version, artifact manifest and verification state |
| SiteEnvironment | Staging/production destination and independently guarded active release pointer |
| DeploymentOperation | Destination request, status, idempotency key, attempt history, remote receipt and reconciliation state |
| WordPressConnection / PageMapping | Installation identity, negotiated capabilities, credential reference, source/destination ID mapping |
| EditingAuthority | Owner, epoch, last agreed base revision, handoff state |
| OutboxEvent / InboxEvent | Durable dispatch and inbound deduplication; unique source event or command identity |
| AuditEvent | Actor, resource, action, outcome and correlation ID; controlled retention and protected export |

Use foreign keys and composite uniqueness to prevent a page, asset, or connection from being accidentally attached across tenant boundaries. Scope repository operations by authenticated tenant context, including worker jobs and administrative actions. An ID by itself is not authorization.

Use PostgreSQL row-level security as defense in depth. The ordinary application role should not own protected tables and must not have `BYPASSRLS`; transaction-scoped tenant context must be set and cleared correctly through connection pooling. PostgreSQL documents that table owners normally bypass policies and superusers/`BYPASSRLS` roles do so as well. [S4]

Bound list operations and use cursor pagination. Add indexes based on real access patterns: tenant/site ownership, page route, latest revision, due operations, outbox delivery, and connection ID. Avoid repeatedly copying the whole site's JSON on each keystroke. Store bounded working documents in PostgreSQL; store media and immutable build outputs in object storage. Large revision offloading should come only with explicit retrieval, integrity, retention, and restore tests.

Application migrations should use expand -> backfill -> verify -> switch reads -> contract. Never hide missing schema behind an ORM-to-raw-SQL fallback. Typed Prisma models should match the deployed schema, and `as any` should not suppress discrepancies at authorization, persistence, or release boundaries.

## 7. Native WordPress plugin

### 7.1 Packaging and runtime

The distributed ZIP includes PHP, compiled editor JavaScript/CSS, local core-widget assets, a build manifest, and required runtime dependencies. It does not require Node.js, PostgreSQL, npm, Composer execution, or access to ForgeStudio cloud on the customer's server.

Use WordPress's supplied React runtime where the declared support matrix permits; otherwise isolate a deliberately bundled runtime. Do not mix incompatible React instances in one component tree. Verify the build against the oldest supported WordPress environment rather than assuming the cloud's React version exists in WordPress.

The current WordPress requirements page recommends PHP 8.3+, MySQL 8.0+ or MariaDB 10.11+, and HTTPS. This is a useful baseline, not evidence that ForgeStudio already supports those environments. Publish only combinations that the plugin's CI actually tests. [S1]

### 7.2 Native storage and release selection

Use native posts/pages for identity, titles, URLs, publication status, and author ownership. Use the media library for assets. Register bounded editor metadata with a precise schema and authorization checks. Enable metadata revision support intentionally on the supported WordPress versions; it is not implied merely by saving post metadata. [S3]

Use small prefixed plugin tables when justified by operation deduplication, deployment history, and guarded page/release state. The proposed `forgestudio_page_state` row can hold draft revision, active release, authority epoch, and a concurrency generation with a unique page key. Immutable document snapshots can remain associated with native revisions. Follow the actual table prefix, versioned upgrade routines, and WordPress database conventions. [S2]

Do not pretend several `update_post_meta()` calls form an atomic publish transaction. Stage immutable content first, then change a guarded pointer. Reconcile native post status, caches, and publication hooks as explicitly modeled side effects. Establish **per-page activation semantics first**. A claim of atomic whole-site WordPress activation requires a separately implemented manifest-aware router and tests; ordinary updates to multiple posts do not establish it.

### 7.3 Authentication and authorization

Inside WordPress, use its logged-in authentication, REST nonce, and endpoint capability checks. Enforce both native post permissions and plugin-specific actions such as publishing or managing connections. A UI capability result is not a substitute for an endpoint check. Use a namespaced REST API and validate the request's site/blog/post context. [S6][S7]

For remote access, use a separately revocable credential over HTTPS. A WordPress Application Password is a viable initial mechanism with a dedicated least-privileged user; do not assume that the password itself establishes a ForgeStudio-specific page scope. Plugin-side authorization must still enforce the connection's allowed sites/pages and actions. [S6]

### 7.4 Rendering modes

Offer two explicit modes: theme-content mode, which renders inside the theme's content area, and full-canvas mode, which uses a documented plugin template. Do not replace theme lifecycle behavior globally. Model header/footer ownership explicitly. Handle native dynamic content through WordPress APIs and supported integration adapters.

The PHP renderer should use the shared document/style specification and widget fixtures. Enqueue only the browser runtime modules used by the current page, never the editor. Cache stable output using document revision, renderer version, relevant theme/configuration inputs, locale, and dynamic-content dependencies. Never share user-specific or private fragments in a public cache.

Each widget has a compatibility manifest: schema version, static rendering support, PHP rendering support, runtime script dependencies, permission requirements, and optional integrations. WooCommerce-dependent widgets should be unavailable with an explanation when that dependency is missing; they must not imply generic compatibility with every WordPress plugin.

### 7.5 Offline-cloud behavior, upgrades and removal

A local WordPress page should render and core editing should work when ForgeStudio's domains are blocked. Optional cloud features should show their unavailable state without breaking local operation. Cloud-owned connected pages keep their ownership rule; a lost connection does not justify silently accepting competing writes.

Plugin activation must be bounded. Multisite upgrades should operate per site with checkpoints instead of looping through an unbounded network in one request. Store schema-version markers separately from plugin version. Preserve original documents during upgrades and make incompatible documents read-only rather than destructively rewriting them.

Deactivation must not delete content. Uninstall data deletion must be explicit and documented. Retaining data is not the same as retaining dynamic rendering after the renderer is deactivated: retain a safe native-content fallback for supported basic output and provide an export/recovery path. Document the limitations for dynamic widgets rather than promising identical behavior with the plugin removed.

## 8. Connected mode: a protocol, not a second save button

### 8.1 Connection establishment

Use a setup flow that proves control of the WordPress destination and binds it to an installation ID and cloud workspace/site. Fetch actual plugin version, document-version range, supported widget versions, upload limits, and permissions. Record check time, latency, and failure category. Distinguish configured, verified, degraded, revoked, and incompatible states.

Validate outbound targets against SSRF risks: enforce HTTPS in production, restrict schemes and ports, reject local/private/link-local/metadata destinations, validate DNS resolution and each redirect, and use an egress policy. A string prefix check is insufficient. Apply the same controls to asset imports and webhook destinations. [S8]

Store outbound credentials encrypted using a managed secret store or envelope encryption; keep encryption keys separate from database backups. Store inbound token verifiers as hashes when verification is all that is needed. A one-way hash cannot recover an outbound application password for later authenticated requests. Use a separate revocable signing secret for webhooks.

Detect cloned WordPress installations that carry copied credentials. Require explicit re-binding or a new installation identity before the clone can overwrite the original destination's mappings. Disconnect should revoke local privileges and credentials without deleting either site's content.

### 8.2 Editing authority

For each connected page, store source owner, authority epoch, last agreed source revision, and last observed destination revision. Both hosts must enforce these values. A worker holding an old epoch cannot activate content after ownership has moved.

A transfer of authority requires an explicit handoff: stop accepting source writes for the transfer, agree a final revision, copy/verify it, install the new epoch at the destination, and complete the source transition. Recover incomplete handoffs as operations. During partitions, prefer a visible temporary write restriction or a fork over conflicting authoritative edits.

### 8.3 Publication protocol

```text
Save source draft with expected revision
  -> freeze exact page/site resource revisions
  -> validate destination compatibility and authority
  -> record durable release request
  -> transfer required assets and verify checksums
  -> stage destination document without replacing live content
  -> validate staged result through authenticated destination API
  -> activate using expected destination revision + authority epoch
  -> obtain destination release receipt
  -> independently read destination state and public output
  -> record success, or retain an explicit reconciliation state
```

The publish envelope should carry connection/installation ID, operation ID, release ID, schema and renderer versions, document hash, asset manifest, source revision, expected destination revision, authority epoch, and requested environment. Never transfer cloud credentials embedded in a document.

Persist the real WordPress post/media IDs returned by the destination. Rehost referenced media in WordPress rather than leaving required images dependent on temporary cloud URLs. Remap internal links, global components, route slugs, and asset IDs. Offer an import/transfer report for missing widgets, unsupported bindings, renamed slugs, unavailable integrations, and media failures before activation.

A repeated operation ID must return its existing status or receipt. A different payload with the same idempotency key must be rejected. A timeout after remote activation is not proof of failure: query the operation receipt before retrying. Conflicting destination changes should produce a typed conflict with both revisions preserved. No automatic two-way merging is included in this initial scope.

## 9. Publishing and job execution

### 9.1 State model

```text
REQUESTED -> VALIDATING -> BUILDING -> STAGING -> VERIFYING
          -> ACTIVATING -> VERIFYING_LIVE -> PUBLISHED

Alternative outcomes:
VALIDATION_FAILED / CONFLICT / FAILED / CANCELLED / RECONCILING
```

Transitions must be enforced in the repository with an expected status/generation. Keep attempt history separately from the overall operation. Preserve the first useful error and all destination receipts. A generic exception handler must not erase evidence of an uncertain external commit.

### 9.2 Transaction and effect boundaries

The API verifies authorization, expected revision, authority, quota, and any approval bound to the exact candidate hash. In one PostgreSQL transaction it creates/pins the immutable candidate, creates the operation, and writes an outbox event. Only then return an accepted receipt.

The dispatcher sends outbox events to the queue. A reconciler periodically checks nonterminal operations and can re-enqueue missing work. Keep this journal even after a queue acknowledgement; otherwise Redis loss after dispatch could make the operation unrecoverable. Treat delivery as at least once and implement idempotent effects, not an end-to-end exactly-once claim.

Workers claim a lease/generation, validate ownership again before critical effects, build deterministic artifacts, stage uploads, and verify checksums. Use destination-scoped ordering and a guarded expected active release to prevent an older slow job from overwriting a newer release. A lease alone is not enough if an expired worker can still activate remotely; the destination must reject its stale generation or revision.

Activation is an authoritative pointer change, not overwriting files in place. CDN propagation is not globally simultaneous. Use content-addressed asset paths and retain prior releases so a mixture of cached page versions does not reference deleted assets. Keep an independently cached serving manifest or equivalent serving configuration so public cloud delivery does not require the editing database per request.

Rollback creates an audited activation of a retained successful release. It does not rewrite the current working draft. Deleting obsolete artifacts must respect active, rollback-retained, and in-flight release references.

### 9.3 Failure policy

| Failure | Required behavior |
|---|---|
| API cannot persist draft | Keep local changes; do not say saved |
| Database cannot persist publish intent | Return unavailable; no success-shaped memory fallback |
| Redis unavailable after DB acceptance | Operation remains queued in durable journal; retry dispatcher |
| Worker dies during build | Reclaim lease; rebuild same immutable revision |
| Asset upload fails | Retain previous live release; retry bounded stage |
| Destination revision changed | Conflict; no silent overwrite |
| Remote activation outcome unknown | Reconcile receipt before another effect |
| Audit publication export unavailable | Preserve durable local audit/outbox; alert rather than discard |
| Cloud services unavailable | Existing static cloud sites continue where serving dependencies are healthy; local WordPress core remains independent |
| Permanent invalid content | Stop retrying; display actionable validation report |

Use exponential backoff with jitter, attempt and age limits, per-destination concurrency, cancellation checks, and a quarantine/dead-letter view. Do not retry authorization or schema failures as if they were network interruptions. Bound each network call and worker task.

## 10. API and webhook contracts

These are proposed routes, not existing repository endpoints. Generate or maintain an OpenAPI specification from the authoritative route/validation contract and test it against both request handlers and client adapters.

| Cloud route | Purpose |
|---|---|
| `GET /api/v1/sites/{siteId}/pages/{pageId}` | Load authorized draft and revision token |
| `PUT /api/v1/sites/{siteId}/pages/{pageId}/draft` | Expected-revision save with mutation ID |
| `GET /api/v1/sites/{siteId}/pages/{pageId}/revisions` | Cursor-paginated history |
| `POST /api/v1/sites/{siteId}/pages/{pageId}/restores` | Restore a revision into the draft only |
| `POST /api/v1/sites/{siteId}/releases` | Freeze candidate and request publication |
| `GET /api/v1/operations/{operationId}` | Authorized durable status and destination receipt |
| `POST /api/v1/sites/{siteId}/environments/{environment}/rollbacks` | Activate a retained release |
| `POST /api/v1/sites/{siteId}/media/uploads` | Start a bounded upload; complete and verify separately |
| `POST /api/v1/sites/{siteId}/wordpress-connections` | Establish a real connection |
| `POST /api/v1/wordpress-connections/{connectionId}/checks` | Recheck actual capabilities/authorization |
| `POST /api/v1/webhooks/wordpress/{connectionId}` | Raw-body verified, durable inbox reception |

The plugin should expose corresponding `forgestudio/v1` routes for capabilities, page drafts, revisions, media integration, staged releases, activation, operations, and revocation. Obtain the REST base URL from WordPress; do not hardcode pretty-permalink assumptions. WordPress documents alternate routing where pretty permalinks are disabled. [S7]

Use a consistent error body containing a machine code, human message, correlation ID, retryability, and safe field/conflict details. Never include credentials, SQL internals, or entire private documents. Use a deliberate distinction between HTTP precondition failures, business conflicts, validation errors, unavailable dependencies, and accepted asynchronous operations.

Idempotency must be tenant/resource/action scoped, bind to the request hash, and have a retention period longer than the documented retry horizon. Repeating a successful request returns its original receipt. Job IDs are not authorization tokens.

For webhooks, verify raw bytes first, require an event ID and signed timestamp, then commit an inbox event with a unique `(connection_id, event_id)` key. Return acknowledgement only after durable receipt. A worker processes the event with its own idempotency protection. Sign outbound deliveries and persist delivery attempts, receiver response, and next retry time. Do not call a health endpoint before every operation as a correctness check; the operation must handle failure regardless of a previous health result.

## 11. Security and privacy

**Tenant and identity boundary:** Every page, revision, form, media object, job, template, connection, and export must enforce tenant scope. Separate platform administration from workspace roles. Require audited, time-bounded elevation for sensitive support access. Protect session cookies, CSRF handling, OAuth redirects, invitations, and account-recovery operations. Add MFA for privileged cloud users.

**Untrusted content boundary:** Treat user HTML, SVG, CSS, URLs, and scripts as untrusted. Validate attributes and URL schemes; escape at the final output context. Disable arbitrary script execution in the editor's privileged origin. Preview custom code in an isolated, sandboxed origin with a restricted message interface. Do not execute user-provided PHP. A WordPress custom-script widget should be a privileged optional feature with a separate threat model, not a default feature for all editors.

**Public delivery boundary:** Serve customer sites and user uploads on origins isolated from the ForgeStudio account/editor origin. Do not send cloud session cookies to customer sites. Validate custom-domain ownership before activation, monitor TLS certificate state, and guard stale-domain takeover. Private previews need short-lived access and must not enter public caches or search indexes.

**Upload boundary:** Enforce quota, ownership, media type, size, extension/content consistency, decompression limits, and safe storage names. Quarantine suspicious uploads. Prevent uploads from becoming executable on WordPress hosting. Strip unnecessary sensitive metadata when policy requires it. Asset processing should be resumable and its failures visible.

**Secrets and audit:** Encrypt recoverable connection credentials; hash tokens that only need verification. Redact logs and never embed tokens in export bundles. Write important audit events transactionally or through a durable outbox. Protect audit copies from ordinary application deletion and define retention. Hash chains alone do not make logs immutable against an administrator who controls both data and keys.

**Supply chain:** Pin toolchains and lockfiles; run dependency, secret, and license checks; use least-privileged CI tokens; build from clean checkouts; produce an SBOM and build provenance; retain artifact checksums. Review plugin distribution against the current WordPress.org guidelines before submission. Optional cloud telemetry requires explicit product privacy treatment rather than a hidden default dependency. [S9]

## 12. Reliability targets and observability

The following are **proposed engineering targets**, not measurements or contractual commitments for the current repository. Confirm cost and hosting design before adopting an SLA.

| Area | Initial target and measurement scope |
|---|---|
| Published standalone delivery | 99.95% successful valid public requests per calendar month for the managed platform |
| Cloud editing API | 99.9% successful eligible requests; report dependency incidents and client errors separately |
| Draft save latency | p95 below 500 ms at the API boundary for a documented document size and concurrency; excludes debounce and client-network delay |
| Editor interaction | p95 below 100 ms on a named mid-range device and representative 1,000-node fixture; measure typing, selection and inspector changes |
| In-region acknowledged-write durability | No lost acknowledged writes in the declared single-node/zone failover test, with the required replication/commit configuration |
| Regional disaster recovery | Candidate RPO <= 5 minutes; RTO <= 60 minutes, demonstrated by a drill |
| Rollback | Origin activation within 60 seconds under the specified load; separately measure CDN convergence |
| Native WordPress | No universal hosting SLA; publish measured reference-host budgets and compatibility results |

RPO is the maximum tolerated data-loss interval; RTO is the recovery-time objective. Replication is not a backup: deletion or corruption can propagate. Operate point-in-time database recovery, versioned objects, separate-account backup protection, credential/key recovery, and documented restoration procedures. Restore both data and asset references, not just database rows.

Record structured logs and distributed trace/correlation IDs across request, revision, outbox, job, release, destination, and receipt. Measure save failures, authorization-evaluation errors, oldest pending job age, retry age, reconciliation backlog, destination latency, rollback success, and actual customer-facing failures. Keep tenant/page IDs out of unbounded metric labels; use logs/traces for high-cardinality details. Redact personal data.

Maintain separate liveness, readiness, dependency checks, and synthetic journey checks. A constant `healthy: true` response is not evidence that save or publish works. Run a synthetic create/edit/save/publish/view/rollback journey against dedicated test resources. Alert on user-impact and error-budget burn, not merely CPU.

Design operational runbooks for failed migration, database failover, lost Redis instance, exhausted storage, expired WordPress credentials, invalid TLS, uncertain activation, incompatible plugin upgrade, compromised connection, and recovery from accidental deletion. Each runbook needs an owner and a tested exit condition.

## 13. Build, release, and compatibility policy

Build the cloud applications and plugin ZIP from the same reviewed document/editor sources, but version the deployables independently. The cloud API, document schema, widget schema, and plugin package each have a versioning purpose; do not force them all to increment together.

Define a compatibility policy before public release. A starting proposal is support for the current and previous plugin release lines for connected publishing, plus a separately agreed security-maintenance period. Make the actual supported versions explicit in machine-readable capabilities and documentation. Do not silently reinterpret a document from a newer editor. Safe read-only display, export, or an update-required explanation is preferable to destructive conversion.

```text
Clean reproducible dependency install
  -> formatting, lint, type checks and dependency-boundary checks
  -> document/property/adapter contract tests
  -> cloud API and worker integration tests with disposable PostgreSQL/Redis
  -> TypeScript renderer fixtures
  -> PHP static analysis, coding checks and unit tests
  -> plugin editor asset build and ZIP validation
  -> real WordPress + PHP + MySQL/MariaDB compatibility matrix
  -> theme, permissions, multisite, import and upgrade tests
  -> browser journey and visual/semantic parity tests
  -> security and dependency scans
  -> staging deploy, synthetic journeys, recovery checks
  -> independent canary cloud release / staged plugin release
  -> production observation and rollback decision
```

Test skipped plugin upgrades, not only the immediately previous version. Test that an older cloud client is rejected safely where its schema is no longer writable. Keep old original documents and read-support or an export tool for the published retention policy.

Use security-reviewed dependency versions with a documented update process. Do not interpret the version strings in this repository as independently verified availability, support status, or installation compatibility. The build matrix must establish that evidence.

## 14. Migration plan: preserve existing user work

Create fixtures from representative existing documents, including nested elements, all responsive modes, reusable components, popups, forms, custom code, global styles, page routes, and draft-versus-published differences. Preserve the original JSON and its checksum before conversion.

Move `frontend/` and `backend/` into workspace application paths with import and build updates in a mechanical change. Keep database migrations in one canonical location. Do not combine relocation with changed rendering behavior in the same pull request.

Add a legacy-document reader and explicit converter to the new page/site-resource model. Support dual **reading** temporarily, with one designated write owner per migrated site. Avoid unsynchronized dual writes to old and new representations. Backfill in bounded, restartable batches with migration status and error reports.

For each site, verify page count, element IDs, asset references, routes, permissions, draft content, and published output. Cut over behind a site-scoped flag. Preserve the old snapshot for investigation and rollback, but do not blindly roll back code across a newer incompatible schema. Migration rollback and release rollback are separate procedures.

Retire legacy read paths only after a compatibility window, successful conversion reports, and a restore drill. Replace temporary feature flags with permanent architecture once the cutover is complete; otherwise every new feature acquires two implementations.

## 15. Sequential implementation roadmap

### Phase 0 — Establish a trustworthy baseline

**Work:** Pin the review commit and create an architecture branch; capture build and test results in disposable environments; classify all simulated adapters; disable production use of simulations; fix permission failure behavior, raw webhook receipt, unsafe test setup, startup DDL, and stale publish-state overwrites. Add standard test commands and CI.

**Done means:** Fresh install and upgraded-database checks are repeatable; no test selects real customer users; unavailable destinations do not return verified/published; permission failures cannot fall back to an unintended allow. Baseline failures are tracked rather than hidden.

### Phase 1 — Introduce the shared document and workspace boundaries

**Work:** Create the workspace/package layout, pure document contract, schema migrations, fixture corpus, version vocabulary, validation, and import-boundary checks. Map existing page/site data into the contract without discarding unsupported properties.

**Done means:** Existing fixture documents can be read and round-tripped with an explicit compatibility report; malformed and future documents are handled safely; application and public-runtime imports obey boundaries.

### Phase 2 — Extract the editor and cloud adapter incrementally

**Work:** Introduce the adapter interface, wrap existing cloud operations, extract editor shell/canvas/layers/inspector/history/autosave and core widgets in small PRs. Separate UI session state from documents. Preserve layout and interactions unless a change is approved.

**Done means:** The same visual-editor package runs in the cloud host and a test host; core journeys have browser tests; save conflicts and delayed acknowledgements preserve edits; no core editor import calls a cloud-only service.

### Phase 3 — Deliver native WordPress editing and publishing

**Work:** Implement plugin bootstrap, local editor mount, permissions, native media, page repository, revisions, bounded upgrades, PHP rendering, local activation/recovery, and core widget parity. Package a installable ZIP.

**Done means:** Install on a clean supported WordPress site without cloud credentials, create/edit/upload/publish/restore locally, and view output with ForgeStudio cloud blocked. Unauthorized users cannot edit. Deactivation preserves data. Declared themes/database combinations pass.

### Phase 4 — Replace cloud publication with immutable releases

**Work:** Page/release data model, durable outbox, BullMQ workers, idempotency, fenced activation, public build output, origin/CDN separation, release receipts, and rollback that does not touch the draft. Use the same document/renderer fixtures as WordPress.

**Done means:** Kill workers and fail storage at each transition without losing accepted intent or replacing the previous live release with partial output. Queue loss is recoverable from the journal. Existing public pages do not read the editor database per view.

### Phase 5 — Implement real connected publishing

**Work:** Verified connection establishment, encrypted credential references, installation identity, negotiated capabilities, authority epochs, ID/asset mapping, stage/activate/receipt endpoints, conflict UI, disconnection/revocation, and reconciler.

**Done means:** A real page/media transfer succeeds and reads back correctly. Repeated publish requests do not create duplicate posts. Destination edits cause conflicts. A timeout after remote commit reconciles correctly. A cloned installation cannot silently overwrite the original mapping.

### Phase 6 — Certify security, compatibility and recovery

**Work:** Expand the widget matrix, TS/PHP visual and semantic parity, supported WordPress/PHP/theme/multisite testing, migrations across skipped releases, threat-model tests, backup restoration, fault injection, and load benchmarks.

**Done means:** Published support claims are backed by test reports. Restore drills recover both content and assets. The system meets the adopted targets under documented hardware, document size, workload and dependency assumptions.

### Phase 7 — Scale and differentiate from measured demand

**Work:** Tune hot queries and bundles; improve caching; isolate noisy workloads; add managed-hosting tiers and regional cells only when required. Add agency governance, portable design-system libraries, content reviews, and optional AI-assisted document commands.

**Done means:** A scale change has a measured bottleneck, cost model, capacity result, rollback plan, and named operator. Optional AI/cloud enhancements do not compromise local core operation.

These phases are dependency gates, not promises that an entire phase should be one huge pull request. Complete and test one vertical slice before widening widget or infrastructure scope.

## 16. First pull requests and their acceptance evidence

| Order | Suggested PR title | Required evidence |
|---|---|---|
| 1 | `Add reproducible builds and isolated test databases` | Clean install/build report; tests refuse production-like database targets |
| 2 | `Disable simulated production destinations` | Unconfigured/unreachable WordPress and SFTP cannot report success |
| 3 | `Make authorization failures explicit` | Stored deny survives policy-lookup failure; missing scope rejected |
| 4 | `Persist webhook receipts before acknowledgement` | Raw-body signature, mandatory timestamp, duplicate-event and DB-outage tests |
| 5 | `Move startup schema changes into migrations` | Fresh and upgraded database checks; app role cannot alter schema |
| 6 | `Guard deployment state transitions` | Reconciliation state cannot be overwritten by generic failure handling |
| 7 | `Create the shared document contract and legacy reader` | Round-trip/migration fixtures; unknown content retained |
| 8 | `Introduce the editor host adapter` | Cloud and test adapter pass the same contract suite |
| 9 | `Extract editor canvas, inspector and history` | Behavior/visual comparisons and keyboard journeys |
| 10 | `Add native WordPress draft and media support` | Clean ZIP installation; local save and upload without cloud |
| 11 | `Add PHP rendering and local release activation` | Core widget parity; failed publish preserves previous live revision |
| 12 | `Add immutable cloud releases and durable workers` | Worker-kill, duplicate job, queue-loss and draft-preserving rollback tests |
| 13 | `Add verified WordPress connection and authority ownership` | Actual handshake, revoked credential, old epoch and clone tests |
| 14 | `Publish connected releases with destination receipts` | Real post/media IDs; conflicts and timeout reconciliation |
| 15 | `Certify upgrades, restore drills and performance budgets` | Published compatibility matrix, recovery and benchmark reports |

For each PR require source changes, tests, migration impact, documentation, observability, and a rollback/disable strategy. Claims in comments such as “strict invariant” or “production ready” do not replace executed acceptance evidence.

## 17. Cross-cutting acceptance matrix

| Scenario | Cloud | Native WP | Connected |
|---|---|---|---|
| Create/edit/save/load page | Required | Required without cloud | Required at designated source |
| Stale draft revision | Conflict preserves both versions | Conflict preserves both versions | Authority plus revision enforced |
| Upload and reference media | Tenant-scoped object | Native attachment | Actual copied asset and ID mapping |
| Unsupported widget | Report; preserve source | Report; preserve source | Block or explicit supported fallback |
| Publish interruption | Previous active release retained | Previous active revision retained | Query remote receipt; reconcile |
| Duplicate operation | One logical effect | One logical effect | No duplicate post or release activation |
| Rollback with newer draft | Draft unchanged | Draft unchanged | Destination expected revision enforced |
| Permission store fails | No fallback allow | No fallback allow | Both hosts enforce authorization |
| Cloud blocked | Existing public static serving independently tested | Core editing/rendering continues | Local core remains; remote operation pending/unavailable |
| Plugin upgrade skipped | Compatible API handling | Content preserved | Negotiated capability handling |
| Export/reimport | Portable schema and manifest | Portable schema and manifest | Loss/compatibility report |
| Restore from backups | Content, assets and key access verified | Host-specific recovery procedure verified | Mapping/authority reconciliation verified |

Include property-based document migration tests, malicious HTML/SVG/URL fixtures, cross-tenant tests, browser accessibility checks, PHP/TypeScript output fixtures, cache-isolation tests, and slow-client/reordered-response tests. Visual snapshots should be accompanied by semantic assertions for links, forms, accessibility, and document content; pixel similarity alone is not sufficient.

## 18. Product differentiation and scope control

Build a demonstrable product position rather than claiming uniqueness without market evidence: **portable ownership, native operation, predictable rendering, and verifiable publishing**.

A user should see the current editing owner, saved revision, destination compatibility, exact changes about to publish, deployment progress, destination receipt, and rollback history. Agencies should be able to set design-token governance and content-editor permissions without forcing every client onto managed hosting. Export and authority handoff should be first-class features, not support-ticket procedures.

Add optional AI only through validated document commands. AI may propose text, layout, accessibility fixes, or token changes, but its output must pass the same schema, permission, and review pipeline as a human edit. Do not let AI execute arbitrary server code or publish implicitly. Define provider privacy, budget, cancellation, and audit behavior separately.

Defer existing Elementor document import, third-party Elementor widget support, real-time multi-author merging, arbitrary plugin marketplaces, and a large independent commerce engine. These need dedicated compatibility/security projects. SFTP can remain disabled until a supported business need and a real adapter are available. Kafka and RabbitMQ should not both be added merely because they are recognized infrastructure names.

## 19. Ownership, decisions, and release readiness

Assign named owners to editor/document contracts, cloud persistence/publication, WordPress runtime, security, and operations. One person may cover several roles initially, but ownership must be explicit. A WordPress specialist should review native lifecycle and compatibility behavior; cloud-only review is insufficient for the plugin.

Create architecture decision records for tenant hierarchy, document schema, queue/outbox semantics, renderer equivalence, WordPress storage/activation, custom-code policy, authority transfer, and the compatibility window. Each record should state the alternatives, choice, tradeoff, and conditions that would justify revisiting it.

Before public release, obtain evidence for: reproducible builds; isolated test environments; real rather than simulated destinations; tenant isolation; content-preserving migrations; raw-byte webhook verification and durable receipt; draft-preserving rollback; plugin operation without cloud; destination conflicts and uncertain outcomes; restoration of content/assets; tested compatibility combinations; and measured performance under a documented workload.

**Recommended first product milestone:** The same core editor opens and saves an existing fixture through either adapter, a clean native WordPress installation publishes it without a cloud account, and a failed publication leaves the previous live content and the user's draft intact.

## Repository evidence

All repository links below are pinned to the reviewed commit. Source ranges are review scope, not a claim that the rest of each large file was audited.

- [R1 — WordPress connector](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/backend/src/services/wordpress/connector.service.ts): connection, verification, simulated publishing, mapping, credential handling.
- [R2 — SFTP publisher](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/backend/src/services/destinations/sftp.publisher.ts): compilation/path listing, configuration-only verification.
- [R3 — Publishing service](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/backend/src/services/publishing.service.ts): inspected lines 1–825; validation, approval lookup, candidate assembly, destination calls, local verification, revision linking, error transitions, rollback and version allocation.
- [R4 — Job runner](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/backend/src/services/jobs/jobRunner.ts): memory fallback, claim/completion and interval logic.
- [R5 — Permission service](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/backend/src/services/permission.service.ts): capability matrix and override error handling.
- [R6a — App setup](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/backend/src/app.ts), [R6b — WordPress controller](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/backend/src/controllers/wordpress.controller.ts), [R6c — Webhook service](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/backend/src/services/wordpress/webhook.service.ts): parser order, signature input, replay and persistence behavior.
- [R7 — Prisma initialization](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/backend/src/config/prisma.ts): import-time DDL.
- [R8 — Editor](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/frontend/src/pages/editor/WebsiteEditor.tsx): directory metadata and inspected imports, lines 1–190.
- [R9 — Public renderer](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/frontend/src/pages/published/PublishedSite.tsx): inspected lines 1–210; no-op helpers, breakpoints and imports.
- [R10 — Prisma schema](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/backend/prisma/schema.prisma): inspected lines 1–300.
- [R11a — Backend test directory](https://github.com/navinray12/forgestudio/tree/e6e126ff02a962cafbce16093250dbb7d279e1fd/backend/src/tests), [R11b — WordPress test suite](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/backend/src/tests/phase5-wordpress.test.ts): inspected lines 1–180, including user selection and plan mutation.
- [R12a — Repository root](https://github.com/navinray12/forgestudio/tree/e6e126ff02a962cafbce16093250dbb7d279e1fd), [R12b — Frontend tree](https://github.com/navinray12/forgestudio/tree/e6e126ff02a962cafbce16093250dbb7d279e1fd/frontend), [R12c — Editor directory](https://github.com/navinray12/forgestudio/tree/e6e126ff02a962cafbce16093250dbb7d279e1fd/frontend/src/pages/editor): active layout and temporary/rejected files.
- [R13a — Backend manifest](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/backend/package.json), [R13b — Frontend manifest](https://github.com/navinray12/forgestudio/blob/e6e126ff02a962cafbce16093250dbb7d279e1fd/frontend/package.json): declared dependencies and scripts.

## Primary technical references

Consulted for this review; product support claims still require testing.

- [S1 — WordPress requirements](https://wordpress.org/about/requirements/).
- [S2 — WordPress plugin database tables](https://developer.wordpress.org/plugins/creating-tables-with-plugins/).
- [S3 — WordPress metadata registration and revision support](https://developer.wordpress.org/reference/functions/register_meta/).
- [S4 — PostgreSQL row-security policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
- [S5 — BullMQ production considerations](https://docs.bullmq.io/guide/going-to-production).
- [S6 — WordPress REST authentication](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/).
- [S7 — WordPress REST routes and endpoints](https://developer.wordpress.org/rest-api/extending-the-rest-api/routes-and-endpoints/).
- [S8 — OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).
- [S9 — WordPress.org detailed plugin guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/).

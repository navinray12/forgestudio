# F-484: ForgeStudio WordPress Connector Plugin Specification & Architecture

## Overview
The **ForgeStudio WordPress Connector Plugin (`forgestudio-connector`)** establishes a secure, high-performance bridge between the ForgeStudio SaaS visual editor and a customer's WordPress installation.

ForgeStudio acts as the visual canonical engine ("the brain"), while WordPress serves as a live destination node.

---

## 1. Architecture & Data Flow

```
+------------------------------------+        HMAC-SHA256 Signed REST        +-----------------------------------+
|          ForgeStudio SaaS          |  ---------------------------------->  |      Customer WordPress Site      |
|  - Visual Editor Engine            |                                       |  - forgestudio-connector plugin   |
|  - Canonical Document JSON         |  <----------------------------------  |  - REST Namespace: forgestudio/v1 |
|  - Page <-> WP Post Mapping        |           Status & Sync Response       |  - WP DB (wp_posts, wp_options)   |
+------------------------------------+                                       +-----------------------------------+
```

---

## 2. Security Architecture

1. **Zero-Plain-Text Credential Policy**:
   - The user generates an API key in the WordPress admin dashboard (`Settings -> ForgeStudio Connector`).
   - The backend hashes the API key using **SHA-256** before storing it in `wordpress_connections.apiKeyHash`. Plaintext keys are never stored.

2. **HMAC-SHA256 Signature Verification**:
   - Every HTTP REST request sent from ForgeStudio to the WordPress plugin includes headers:
     - `X-ForgeStudio-Timestamp`: UNIX timestamp in seconds.
     - `X-ForgeStudio-Signature`: `hmac_sha256(raw_body, apiKeyHash)`.
   - The plugin validates the signature against its stored key hash.
   - Replay Protection: Requests older than **300 seconds** are rejected (`401 Unauthorized`).

3. **Capability Checks**:
   - Admin settings page access requires `manage_options`.
   - REST endpoints verify appropriate capabilities (`edit_posts` / valid HMAC signature).

---

## 3. WordPress Plugin REST API (`forgestudio/v1`)

| Endpoint | Method | Description |
|---|---|---|
| `/wp-json/forgestudio/v1/status` | GET | Plugin status, WordPress version, API version |
| `/wp-json/forgestudio/v1/connect` | POST | Validate initial API key handshake |
| `/wp-json/forgestudio/v1/verify` | POST | Verify active connection health |
| `/wp-json/forgestudio/v1/disconnect` | POST | Safe disconnection |
| `/wp-json/forgestudio/v1/publish` | POST | Receive canonical page JSON and upsert WP pages |
| `/wp-json/forgestudio/v1/pages` | GET/POST | List or create WP posts |
| `/wp-json/forgestudio/v1/pages/:id` | GET/PUT/DELETE | Manage WP post lifecycle |
| `/wp-json/forgestudio/v1/media` | POST | Sync media attachments |

---

## 4. Frontend & Download Workflow

1. Users access the **Publish Modal** in the visual editor under the **WordPress** tab.
2. Clicking **"⬇ Download Plugin (.zip)"** invokes `GET /api/websites/:id/wordpress/download-plugin`, streaming a zip archive of the plugin (`forgestudio-connector.zip`).
3. After installing and activating in WP Admin, the user pastes their Site URL and Secret Token into ForgeStudio.
4. ForgeStudio establishes the connection and displays version metrics (`Plugin v1.0.0`, `API v1`, `Last Verified`, `Mapped Pages`).

---

## 5. F-485: Site Connection Specification

### Connection Lifecycle States
A WordPress destination connection transitions through the following formal states:
- `PENDING`: Connection initialized but handshake not yet attempted.
- `CONNECTING`: Saas backend performing remote URL validation, SSRF checks, and remote handshake ping.
- `CONNECTED`: Remote plugin discovered, key hash verified, and connection active.
- `FAILED`: Handshake or verification failed (e.g. unreachable site, plugin not found, authentication failure). `failureReason` contains diagnostic error details.
- `DISCONNECTED`: User or system disconnected the site cleanly; mappings and local workspace retained.
- `REVOKED`: Connection credentials or token revoked; `revokedAt` timestamp recorded.

### Security & SSRF Protection
- **URL Sanitization**: All site URLs are normalized (stripping trailing slashes, enforcing HTTP/HTTPS protocol).
- **SSRF Target Filtering**: Connections to `localhost`, loopback addresses (`127.0.0.1`, `::1`), private IP ranges (`10.x.x.x`, `192.168.x.x`, `172.16-31.x.x`), and cloud metadata endpoints (`169.254.169.254`) are blocked and return `WORDPRESS_URL_INVALID`.
- **Duplicate Connection Prevention**: Connecting a WordPress site URL already active on another project returns `WORDPRESS_CONNECTION_EXISTS` (409 Conflict).
- **Tenant Isolation**: Connection operations require `MANAGE_INTEGRATIONS` / `PUBLISH` permissions on the website resource.

### F-486 Connection Verification Architecture
- **HMAC Signed Health Handshake**: Verification executes a signed remote `POST /verify` request against the remote WordPress connector.
- **Latency Measurement**: Captures high-precision roundtrip wall-clock response latency (`responseTimeMs`).
- **Dynamic Capability Detection**: Evaluates remote site capabilities (`pages`, `media`, `publishing`, `gutenberg`, `webhooks`, `menus`, `acf`).
- **Failure Classification Engine**:
  - **Transient / Temporary Failures** (e.g. timeout, DNS lag, 502/503/504 gateway issues): Reported as `healthy: false` with warning badges; preserves `CONNECTED` status in database to avoid unnecessary reconnection workflows.
  - **Permanent / Action Required Failures** (e.g. 401 Auth Failed, Invalid HMAC Signature, 404 Plugin Missing, Incompatible Version): Demotes connection status to `FAILED`, records `failureReason`, and prompts immediate user action.
- **Rate Limiting**: Enforces max 10 verification requests per minute per website (`RATE_LIMIT_EXCEEDED` 429).

### F-487 Connection Disconnect Architecture
- **Non-Destructive Disconnection**: Disconnecting a WordPress destination revokes active token credentials and sets connection status to `DISCONNECTED`. All ForgeStudio website data, document revisions, deployment records, media mappings, and published remote WordPress posts remain completely preserved.
- **Fail-Closed Token Invalidation**: If the remote WordPress site is offline, unreachable, or times out during disconnection, ForgeStudio credentials are still immediately invalidated locally to guarantee security (*fail closed*).
- **Idempotency**: Disconnecting an already disconnected (`DISCONNECTED`) or revoked (`REVOKED`) connection is safe, idempotent, and returns a success response.
- **Publishing Protection**: Any publishing attempt to a disconnected or revoked site is immediately rejected with `WORDPRESS_NOT_CONNECTED` (400).
- **Reconnection Path**: The website workspace retains its mapping and can be reconnected at any time using the F-485 connection workflow.

### F-488 Site Information Architecture
- **Real-Time Technical Metadata Retrieval**: Retrieves verified remote technical information from the connected WordPress installation (`GET /wp-json/forgestudio/v1/site-info`).
- **Structured Site Information Schema**:
  1. **General**: Site URL, Home URL, WordPress Core Version, Locale, Language, Timezone offset, REST API availability, Multisite status (`SINGLE_SITE` / `MULTISITE`).
  2. **ForgeStudio Connector**: Plugin Version, API Version, Connection Status (`CONNECTED`), Last Verified timestamp, Last Synced timestamp, Response Latency (`responseTimeMs`).
  3. **Active Theme**: Theme Name, Theme Version, Theme Architecture (`BLOCK` / `CLASSIC`), Parent Theme details.
  4. **Capabilities**: Array of verified site capabilities (`pages`, `media`, `publishing`, `gutenberg`, `webhooks`, `menus`, `acf`).
- **Fail-Closed Connection Protection**: Site information requests are strictly blocked if the connection is `DISCONNECTED` or `REVOKED` without making remote network calls.
- **Sanitization & URL Defense**: All remote URLs are sanitized and verified before returning to the frontend. Plaintext API secret keys are never included in DTO responses.
- **Frontend Information Panel**: Displays technical metadata in a 4-section UI grid inside `PublishModal.tsx` with an active `[🔄 Refresh Information]` button.

### F-489 Site Health & Compatibility Diagnostics Architecture
- **Real-Time Health Evaluation**: Evaluates overall reachability, authentication validity, WordPress version compatibility, required & optional capabilities, publishing readiness, and HTTPS security (`GET /wp-json/forgestudio/v1/site-health`).
- **Deterministic Health Model & Score (0–100%)**:
  - `HEALTHY` (Score 90–100%): All required capabilities active, WP >= 5.8.0, SSL enabled, latency < 500ms.
  - `WARNING` (Score 50–89%): Non-critical warnings present (e.g. latency > 500ms, HTTP instead of HTTPS, or missing optional Gutenberg plugin).
  - `CRITICAL` (Score 0–49%): Critical failures (e.g. WP < 5.8.0, missing required `pages` or `media` capabilities, or site unreachable).
  - `UNKNOWN`: Uninitialized or corrupt diagnostic state.
- **Publishing Readiness Classification**:
  - `READY`: Site fully ready to receive published content and upload media assets.
  - `READY_WITH_WARNINGS`: Site ready for basic publishing, but optional block features or performance are degraded.
  - `BLOCKED`: Publishing is strictly blocked with actionable error message (e.g., `WP_VERSION_OUTDATED`, `MEDIA_PERMISSION_MISSING`).
- **Security & Version Policy**: Enforces minimum supported WordPress version **5.8.0** and flags insecure HTTP connections with code `HTTPS_DISABLED`.
- **Frontend Health Panel**: Provides a dedicated 5-section diagnostic UI panel in `PublishModal.tsx` alongside Site Information, featuring an interactive `[🔄 Refresh Health]` button with duplicate click protection and loading state.

### Error Codes & Diagnostics
| Error Code | HTTP Status | Description |
|---|---|---|
| `WORDPRESS_URL_INVALID` | 400 | Invalid URL format or SSRF target rejected |
| `WORDPRESS_UNREACHABLE` | 502 | Remote WordPress site unreachable or offline |
| `WORDPRESS_PLUGIN_NOT_FOUND` | 404 | ForgeStudio Connector plugin endpoint missing on target site |
| `WORDPRESS_REST_UNAVAILABLE` | 503 | WordPress REST API disabled or failing |
| `WORDPRESS_AUTH_FAILED` | 401 | HMAC signature or API key invalid |
| `WORDPRESS_TIMEOUT` | 504 | Handshake ping timed out |
| `WORDPRESS_CONNECTION_EXISTS` | 409 | WordPress URL is connected to another ForgeStudio project |
| `WORDPRESS_CONNECTION_REVOKED` | 400 | Connection token has been revoked |
| `WORDPRESS_CONNECTION_DISCONNECTED` | 400 | Connection is currently in disconnected state |
| `WORDPRESS_CONNECTION_NOT_FOUND` | 404 | No connection configured for target website |
| `WORDPRESS_SITE_UNREACHABLE` | 502 | Site health/information request failed or timed out |
| `WORDPRESS_API_VERSION_UNSUPPORTED` | 400 | Remote API version is incompatible with platform |
| `WORDPRESS_PLUGIN_VERSION_UNSUPPORTED` | 400 | Connector plugin version requires upgrade |
| `WP_VERSION_OUTDATED` | 400 | WordPress core version is below minimum supported 5.8.0 |
| `HTTPS_DISABLED` | 200/400 | Remote site serves content over insecure HTTP |
| `RATE_LIMIT_EXCEEDED` | 429 | Exceeded 10 verification requests per minute |

### Audit Logging Events
All connection lifecycle events generate structured audit records:
- `CONNECTION_STARTED`
- `CONNECTION_SUCCESS`
- `CONNECTION_FAILED`
- `CONNECTION_VERIFIED` (Includes response latency `responseTimeMs`, health status, and capability counts)
- `CONNECTION_DISCONNECT_STARTED`
- `CONNECTION_DISCONNECTED`
- `CONNECTION_REVOKED`
- `SITE_INFO_RETRIEVED`
- `SITE_HEALTH_CHECK_COMPLETED` (Includes overallStatus, score, responseTimeMs, readinessStatus, wordpressVersion)
- `WORDPRESS_PAGE_CREATED`
- `WORDPRESS_PAGE_UPDATED`
- `WORDPRESS_PAGE_TRASHED`
- `WORDPRESS_PAGE_DELETED`
- `WORDPRESS_PAGE_DUPLICATED` (Includes sourceWpPageId, newWpPageId, sourceSlug, newSlug, status)
- `WORDPRESS_PAGE_REORDERED` (Includes pageId, oldParentId, newParentId, position, targetPageId, affectedPageIds, status)
- `WORDPRESS_MEDIA_UPLOADED` (Includes websiteId, wordpressMediaId, mimeType, fileSize, filename, status)

---

## 6. F-490, F-491 & F-492: WordPress Page Management Architecture

### Page CRUD & Hierarchy (F-490)
- REST Endpoints:
  - `GET /api/websites/:id/wordpress/pages`: List pages with pagination, search, status filtering, and hierarchy context.
  - `GET /api/websites/:id/wordpress/pages/:pageId`: Get single page DTO.
  - `POST /api/websites/:id/wordpress/pages`: Create page (supports status, parent ID, menuOrder, template).
  - `PATCH /api/websites/:id/wordpress/pages/:pageId`: Update page attributes.
  - `DELETE /api/websites/:id/wordpress/pages/:pageId`: Trash (soft delete `force=false`) or permanently delete (`force=true`).
- Page Mapping: Synchronizes local `WordPressPageMapping` DB table with remote WP post ID and URL.
- Hierarchy & Slug Protection: Enforces parent page existence validation and prevents self-parenting loops.

### Page Duplicate Architecture (F-491)
- REST Endpoint: `POST /api/websites/:id/wordpress/pages/:pageId/duplicate`
- Deterministic Duplication Strategy:
  - **Title Generation**: Appends "Copy", "Copy 2", "Copy 3" deterministically (`generateDuplicateTitle`). Custom title option overrides.
  - **Slug Generation**: Generates unique URL-safe candidate slug (`generateDuplicateSlug`). Custom slug option overrides.
  - **Status Enforcement**: Always defaults new duplicate to **`draft`**, regardless of whether the source page is published, pending, or private.
  - **Field Cloning**: Copies content, excerpt, template, and valid parent hierarchy. Resets `menuOrder` to 0.
  - **Atomic DB Mapping & Recovery**: Creates `WordPressPageMapping` DB record. If DB creation fails, the remote draft page is force-cleaned up to prevent orphan remote posts.

### Page Reorder Architecture (F-492)
- REST Endpoint: `PATCH /api/websites/:id/wordpress/pages/:pageId/reorder`
- Reorder Semantics:
  - **Position Modes**: `BEFORE`, `AFTER`, `FIRST`, `LAST`.
  - **Same-Parent Reorder**: Recalculates sibling `menu_order` sequentially (0, 1, 2...).
  - **Cross-Parent Move**: Validates target parent existence and hierarchy integrity.
  - **Circular Hierarchy Prevention**: Ancestor chain walk detects and blocks cycle formation (`WORDPRESS_PAGE_INVALID_PARENT`).
  - **Atomic Batch Update & Rollback Recovery**: Batch applies remote updates; automatically rolls back modified pages if any batch update fails (`WORDPRESS_PAGE_REORDER_FAILED`).
  - **Frontend Drag-and-Drop UI**: Interactive HTML5 drag handles (⋮⋮), top/bottom drop indicators, optimistic reordering with error rollback, and automatic authoritative refresh from WordPress.

---

## 7. F-493: WordPress Media Upload Architecture

### Overview & Security
- REST Endpoint: `POST /api/websites/:id/wordpress/media`
- Infrastructure Reuse: Reuses existing multipart upload parsing and `sendSignedWordPressRequest()` HMAC-SHA256 signature verification infrastructure.
- File Security Validation Policy:
  - **File Size Limit**: Hard 10MB maximum file size limit (`WORDPRESS_MEDIA_FILE_TOO_LARGE`).
  - **MIME & Extension Allowlist**: Supported formats: JPEG (`jpg`/`jpeg`), PNG (`png`), GIF (`gif`), WebP (`webp`), PDF (`pdf`).
  - **Magic Byte Signature Verification**: Validates file content headers (e.g. JPEG `FF D8 FF`, PNG `89 50 4E 47`, GIF `47 49 46`, WebP `RIFF`/`WEBP`, PDF `%PDF`). Prevents disguised malicious payloads (e.g., PHP disguised as JPG, executable disguised as PNG).
  - **SVG Security Policy**: SVG upload is disabled because no trusted backend SVG sanitization pipeline exists. SVG files return `WORDPRESS_MEDIA_UNSUPPORTED_TYPE`.
  - **Filename Security**: Rejects or sanitizes path traversal (`../`, `..\`), null-byte injection (`\0`), and dangerous extensions (`.php`, `.phtml`, `.exe`, `.sh`, `.bat`, `.cmd`, `.js`, `.html`).
- Connection State & Tenant Isolation:
  - Requires `CONNECTED` connection state; fail-closed immediately for `DISCONNECTED` or `REVOKED` sites without remote requests.
  - Requires `EDIT` RBAC capability on website workspace.
- Response Normalization (`WordPressMediaDTO`):
  - Returns normalized metadata: `id` (WordPress attachment ID), `filename`, `mimeType`, `url`, `sourceUrl`, `title`, `altText`, `caption`, `description`, `width`, `height`, `filesize`, `date`, `modified`.
- Audit Logging:
  - Audits `WORDPRESS_MEDIA_UPLOADED` event with `websiteId`, `wordpressMediaId`, `mimeType`, `fileSize`, `filename`, `status` with zero secret/token leakage.
- Frontend Media Upload UI (`PublishModal.tsx` & `publishingService.ts`):
  - Interactive upload button `[🖼️ Upload Media]` in Page Manager toolbar.
  - File picker with client-side format & size guidance, metadata fields, progress bar, error state banner, and uploaded asset preview card.

---

## 9. F-494: WordPress Media Management Architecture

### Overview & Capabilities
- REST Endpoints:
  - `GET /api/websites/:id/wordpress/media` (List media with search, filter, pagination, ordering)
  - `GET /api/websites/:id/wordpress/media/:mediaId` (Fetch single media attachment details)
  - `PUT/PATCH /api/websites/:id/wordpress/media/:mediaId` (Update media metadata: title, altText, caption, description)
  - `DELETE /api/websites/:id/wordpress/media/:mediaId` (Trash or force permanently delete media)
- Search & Filtering:
  - Supports keyword search (`search`), mediaType filter (`image`, `document`, `all`), mimeType filter, ordering (`date`, `modified`, `title`, `filename`), order direction (`ASC`, `DESC`), and pagination (`page`, `perPage` max 100).
- Metadata Sanitization & Security:
  - Plain-text fields (`title`, `altText`, `caption`) sanitized via `sanitize_text_field`.
  - Rich description sanitized via `wp_kses_post` to strip unsafe script and iframe injection while permitting standard HTML formatting.
- Deletion Policies:
  - Default trash deletion (`force=false`), permanent deletion when `force=true`.
- RBAC & Isolation:
  - Requires `VIEW` capability for list/get, `EDIT` for metadata update, `DELETE` for media deletion.

---

## 10. F-495: WordPress Publish Architecture

### Overview & Core Pipeline
- REST Endpoint: `POST /api/websites/:id/wordpress/publish-page`
- Publishing Contract & Workflow:
  1. **Pre-publish Validation**: Verifies website ownership, RBAC permissions (`PUBLISH`), status allowlist (`publish`, `draft`, `private`), and title non-emptiness.
  2. **Connection & Site Health Readiness**: Checks connection state (`CONNECTED`). Runs health diagnostic checks (F-489 reuse); blocks publish if site health status is `CRITICAL` or publishing readiness is `BLOCKED`. Attaches advisory notices for non-blocking warnings.
  3. **Document Transformation**: Converts canonical JSON editor document into native WordPress Gutenberg blocks via `transformPageToWordPress`.
  4. **Media Resolution**: Resolves media image/document URLs to connected WordPress media attachments.
  5. **Durable Mapping & Idempotency**: Checks existing `WordPressPageMapping` by `forgePageId`. Updates existing remote WordPress post (action `UPDATED`) or creates a new remote page (action `CREATED`) via signed REST requests (`sendSignedWordPressRequest`). If remote post was manually deleted (404), falls back to creation.
  6. **Concurrency Protection**: In-memory mutex locks (`publishLocks`) prevent race conditions and duplicate publishing under parallel requests.
  7. **Audit & Synchronization**: Updates connection `lastSyncedAt`, records audit logs (`WORDPRESS_PUBLISH_STARTED`, `WORDPRESS_PUBLISH_SUCCEEDED`, `WORDPRESS_PUBLISH_FAILED`), and returns canonical URL, post ID, action type, and status.

### Frontend UI & Interaction (`PublishModal.tsx` & `publishingService.ts`)
- Pre-publish review panel in WordPress destination tab:
  - Target site URL, page count, health status, and status selector (`PUBLISH` / `DRAFT` / `PRIVATE`).
  - Progress state indicator (`Validating...` → `Transforming...` → `Resolving Media...` → `Sending REST Payload...` → `Published!`).
  - Success banner with action badge (`CREATED` / `UPDATED`), post ID, last published timestamp, and clickable canonical page URL (`View Published Page ↗`).
  - Advisory health warnings display and structured error notification banners.

---

## 11. F-496: WordPress Publish Status Architecture

### Overview & Core Engine
- REST Endpoints:
  - `GET /api/websites/:id/wordpress/pages/:pageId/publish-status`
  - `GET /api/websites/:id/wordpress/publish-status` (Primary page fallback)
- Purpose & Authoritative State Resolution:
  - F-495 performs publishing; F-496 provides real-time, authoritative visibility into the publish status, content freshness, and remote post existence.
  - Queries local `WordPressPageMapping` and `WordPressConnection`.
  - Performs non-destructive, read-only remote verification (`GET /pages/:wpPostId`) via HMAC signed requests to confirm post existence.

### State Machine Definition
1. `NEVER_PUBLISHED`: No `WordPressPageMapping` exists for the given `forgePageId`. (Immediate return, zero remote requests made).
2. `DISCONNECTED`: `WordPressConnection` status is `DISCONNECTED` or `REVOKED`. Returns error code `WORDPRESS_PUBLISH_STATUS_NOT_CONNECTED`.
3. `PUBLISHING`: Active publish operation currently in progress for the page (`publishLocks.has(lockKey)`).
4. `REMOTE_MISSING`: Mapped `wpPostId` returns 404 Not Found from remote WordPress REST API. Returns error code `WORDPRESS_PUBLISH_STATUS_REMOTE_MISSING`.
5. `FAILED`: Last publish attempt recorded failure in audit log / publish status.
6. `STALE`: Remote page exists, but ForgeStudio page content or website settings were modified after `lastSyncedAt` timestamp (`contentState = CHANGES_PENDING`).
7. `PUBLISHED`: Remote page exists and ForgeStudio page content is up-to-date (`contentState = CURRENT`).
8. `UNKNOWN`: Temporary network error, DNS failure, or server 500 when verifying remote page existence (`remoteState = UNKNOWN`, attaches advisory warning; does NOT mark as `REMOTE_MISSING`).

### Content Freshness Comparison
- Compares `sourceUpdatedAt` (page/website updated timestamp) against `publishedSourceUpdatedAt` (`lastSyncedAt` mapping timestamp).
- Includes 1-second clock tolerance to handle subtle system clock skew.

### Security, RBAC & Performance Invariants
- **Permissions**: Requires `VIEW` capability (`authorizeCapability("VIEW")`).
- **Tenant Isolation**: Strictly checked via `getWebsiteById(websiteId, userId)`.
- **Zero Polling**: Explicit refresh triggered on demand (`[🔄 Refresh]` button), modal launch, or post-publish.
- **Audit Logging**: Logs `WORDPRESS_PUBLISH_STATUS_CHECKED` with zero secret or credential leakage.

---

## 12. F-497: WordPress Publish Rollback Architecture

### Overview & Core Engine
- REST Endpoints:
  - `GET /api/websites/:id/wordpress/pages/:pageId/rollback-targets` (Retrieve historical publish snapshots)
  - `POST /api/websites/:id/wordpress/pages/:pageId/rollback` (Execute rollback to selected snapshotId)
- Purpose & Snapshot Immutability:
  - Reuses `WebsiteRevision` records tagged with `revisionType = "PUBLISH"` or `"RESTORE"` as immutable historical publish snapshots.
  - Restores WordPress page content to a previously published state without altering remote `wpPostId`, destroying local working drafts, or breaking public URLs.

### 11 Server-Side Validation Checks
1. **Authenticated User**: Valid user token required.
2. **Website Ownership / Tenant Isolation**: Enforced via `getWebsiteById(websiteId, userId)`.
3. **RBAC Permission**: Requires `PUBLISH` capability (`authorizeCapability("PUBLISH")`). Requests from `VIEW`/`EDIT` users without `PUBLISH` rights are rejected with 403 `WORDPRESS_ROLLBACK_PERMISSION_DENIED`.
4. **Page Ownership**: Target `pageId` validated against website document.
5. **WordPress Connection Status**: Connection must be active (`CONNECTED`). Disconnected sites return 400 `WORDPRESS_ROLLBACK_NOT_CONNECTED`.
6. **Mapping Ownership**: Durable `WordPressPageMapping` must exist for target page.
7. **Snapshot Ownership**: `snapshotId` must exist and belong to `websiteId`.
8. **Snapshot Belongs to Target Page**: Document snapshot must contain the requested page.
9. **Snapshot Belongs to Target Website**: Cross-website snapshot usage is strictly blocked.
10. **Snapshot Validity**: Revision must have `revisionType` IN (`"PUBLISH"`, `"RESTORE"`).
11. **Remote Page Existence**: Signed GET `/pages/:wpPostId` executes before mutation. If 404, returns 404 `WORDPRESS_ROLLBACK_REMOTE_MISSING` (never creates a new remote page).

### Network Timeout Safety & Result Ambiguity
- If the remote PUT request times out (`ETIMEDOUT` / `ECONNRESET`), the server does NOT blindly retry.
- Returns 502 `WORDPRESS_ROLLBACK_RESULT_UNKNOWN` and logs audit event `WORDPRESS_ROLLBACK_RESULT_UNKNOWN`.
- Leverages the F-496 status engine (`[Check Status]`) to verify whether remote content was updated.

### History Preservation & Audit Events
- Successful rollback creates a new `WebsiteRevision` tagged `revisionType = "RESTORE"` documenting `sourceSnapshotId` and version.
- Preserves complete historical snapshot chain.
- Audit Log Events:
  - `WORDPRESS_ROLLBACK_STARTED`
  - `WORDPRESS_ROLLBACK_SUCCEEDED`
  - `WORDPRESS_ROLLBACK_FAILED`
  - `WORDPRESS_ROLLBACK_RESULT_UNKNOWN`

---

## 13. Invariants
- **Data Preservation**: Disconnecting a WordPress destination never deletes ForgeStudio website data, revisions, deployment history, or remote WP posts.
- **Durable Mapping**: Page synchronization maintains a 1-to-1 link between `forgePageId` and `wpPostId`.
- **Zero Plain-Text Credential Storage**: Plaintext API keys are never stored in the database or exposed in DTO responses.
- **Verification Non-Destructiveness**: Connection health verification and site information retrieval are strictly read-only and never mutate site options or post records.
- **Fail-Closed Security**: Token credentials are invalidated locally on disconnect regardless of remote server responsiveness, and site info requests fail closed for disconnected/revoked sites.





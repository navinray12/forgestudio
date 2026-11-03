# ForgeStudio Phase 7: Theme Builder, Dynamic CMS & Custom Post Types

## 1. Executive Summary
Phase 7 introduces the dynamic content backbone and deterministic Theme Builder engine for ForgeStudio:
1. **Dynamic CMS & Custom Post Types (CPT):** Relational schema and API infrastructure supporting arbitrary custom post types, structured dynamic custom fields, and hierarchical entries with stable field reconciliation.
2. **Deterministic Theme Builder Engine:** Rule-based template assignment system supporting global headers, footers, single post templates, and archive templates with strict mathematical specificity scoring and exclusion overriding.
3. **Dynamic Content Resolution & Token Interpolation:** Dual-syntax token interpolator supporting both single (`{post:title}`) and mustache (`{{post.data.field_slug}}`) syntax across static and dynamic renderers.
4. **Tri-Renderer Dynamic Loop Widgets:** Deep integration of `loop-grid` and `loop-carousel` widgets across the Visual Editor Canvas, Published Website Runtime, and Static HTML Compiler.

---

## 2. Relational Schema & Persistence Architecture

The Phase 7 data layer leverages PostgreSQL via Prisma with multi-tenant boundaries (`websiteId` foreign keys):

### `CustomPostType`
- `id` (UUID, Primary Key)
- `websiteId` (UUID, Foreign Key -> `Website.id`, `onDelete: Cascade`)
- `name` (String, display name e.g. "Portfolio Projects")
- `slug` (String, URL-safe slug e.g. "portfolio-projects", unique per website)
- `description` (String, optional)
- `icon` (String, optional icon identifier)
- `supports` (String array, e.g. `['title', 'editor', 'thumbnail', 'custom-fields']`)
- `hasArchive` (Boolean, default `true`)
- `isPublic` (Boolean, default `true`)
- `createdAt` / `updatedAt` (DateTime)

### `CustomField`
- `id` (UUID, Primary Key)
- `customPostTypeId` (UUID, Foreign Key -> `CustomPostType.id`, `onDelete: Cascade`)
- `name` (String, display label)
- `slug` (String, machine identifier e.g. `client_name`)
- `type` (`text` | `number` | `textarea` | `media` | `boolean` | `date` | `select` | `relation`)
- `options` (JSON, for select options or field validation rules)
- `isRequired` (Boolean, default `false`)
- `defaultValue` (String, optional)
- `order` (Int, display ordering index)

### `CustomEntry`
- `id` (UUID, Primary Key)
- `customPostTypeId` (UUID, Foreign Key -> `CustomPostType.id`, `onDelete: Cascade`)
- `websiteId` (UUID, Foreign Key -> `Website.id`, `onDelete: Cascade`)
- `title` (String, primary entry title)
- `slug` (String, URL identifier unique within CPT and website)
- `data` (JSON, structured key-value map mapping field slugs/IDs to values)
- `status` (`DRAFT` | `PUBLISHED` | `ARCHIVED`)
- `publishedAt` (DateTime, optional)
- `authorId` (UUID, optional reference to `User.id`)
- `createdAt` / `updatedAt` (DateTime)

### `ThemeLocationRule`
- `id` (UUID, Primary Key)
- `websiteId` (UUID, Foreign Key -> `Website.id`, `onDelete: Cascade`)
- `templatePageId` (UUID, Foreign Key -> `Page.id`, `onDelete: Cascade`)
- `location` (`header` | `footer` | `single` | `archive` | `section` | `404`)
- `condition` (`include` | `exclude`)
- `ruleType` (`entire_site` | `all_pages` | `homepage` | `specific_page` | `cpt_archive` | `specific_cpt` | `specific_entry` | `error_404`)
- `targetId` (String, optional ID or slug of specific target)
- `priority` (Int, base specificity score)
- `createdAt` / `updatedAt` (DateTime)

---

## 3. Deterministic Specificity & Conflict Resolution Algorithm

Theme location rules are evaluated deterministically using an explicit priority scoring model implemented in `backend/src/services/themeBuilder.service.ts`:

### Specificity Hierarchy
| Rule Type | Specificity Score | Description |
|:---|:---:|:---|
| `specific_entry` | **100** | Matches a specific post/entry ID or slug within a CPT |
| `specific_page` | **90** | Matches a specific Page ID or slug |
| `cpt_archive` | **80** | Matches the archive view for a specific Custom Post Type |
| `specific_cpt` | **70** | Matches any single entry belonging to a specific CPT |
| `error_404` | **60** | Matches 404 / error fallback views |
| `homepage` | **50** | Matches the root homepage |
| `all_pages` | **40** | Matches any standard static page |
| `entire_site` | **10** | Default global catch-all rule |

### Exclusion Overrides
If an `exclude` rule matches the current context, it strictly supersedes any `include` rule of equal or lower specificity. If an exclusion has higher or equal specificity, the template match is vetoed.

---

## 4. Dynamic Token Interpolation Engine

Dynamic bindings in widgets and templates are resolved using dual-syntax regex parsing (`{token}` and `{{token}}`):

### Supported Token Patterns
- Standard Post Fields:
  - `{post:title}`, `{{post:title}}`, `{{post.title}}` -> Entry title
  - `{post:slug}`, `{{post:slug}}`, `{{post.slug}}` -> Entry slug
  - `{post:id}`, `{{post:id}}`, `{{post.id}}` -> Entry UUID
  - `{post:date}`, `{post:publishedAt}`, `{{post.publishedAt}}` -> Formatted date
  - `{post:featured_image}`, `{post:image}` -> Featured thumbnail image URL
- Custom Field Values (`data` JSON bag):
  - `{post:data.fieldName}`, `{{post.data.fieldName}}`
  - `{post:custom_field_slug}`, `{{post.custom_field_slug}}`
  - `{custom:field_slug}`, `{{custom:field_slug}}`
- Site Context:
  - `{site:name}`, `{{site.name}}` -> Website name
  - `{site:url}`, `{{site.url}}` -> Website URL

---

## 5. Non-Destructive Field Reconciliation

When updating custom fields on an existing Custom Post Type:
- Existing field definitions are matched against incoming fields by stable `id` or slug.
- Field modifications preserve the underlying UUIDs, ensuring that existing `CustomEntry.data` JSON payloads remain valid and non-corrupted.
- Unchanged and modified fields maintain their relational associations, preventing data loss across schema adjustments.

---

## 6. API Inventory & Endpoints

### Custom Post Types (`/api/v1/cpt`)
- `POST /api/v1/cpt` — Create custom post type
- `GET /api/v1/cpt/website/:websiteId` — List all CPTs for a website
- `GET /api/v1/cpt/:id` — Get CPT details with fields
- `PUT /api/v1/cpt/:id` — Update CPT metadata
- `DELETE /api/v1/cpt/:id` — Soft/Hard delete CPT and cascade child definitions
- `POST /api/v1/cpt/:id/fields` — Reconcile and save custom fields schema

### Custom Entries (`/api/v1/cpt/:cptSlug/entries` or `/:cptId/entries`)
- `GET /api/v1/cpt/:cptSlug/entries` — List entries with pagination, status filtering, and search
- `POST /api/v1/cpt/:cptSlug/entries` — Create entry
- `GET /api/v1/cpt/:cptSlug/entries/:entryId` — Retrieve single entry
- `PUT /api/v1/cpt/:cptSlug/entries/:entryId` — Update entry and custom field data
- `DELETE /api/v1/cpt/:cptSlug/entries/:entryId` — Delete entry
- `GET /api/v1/websites/:websiteId/public/types/:cptSlug/entries` — Unauthenticated public entry read for published dynamic loop rendering

### Theme Builder (`/api/v1/theme`)
- `POST /api/v1/theme/rules` — Create theme location rule
- `GET /api/v1/theme/rules/website/:websiteId` — List all location rules for a site
- `PUT /api/v1/theme/rules/:ruleId` — Update rule condition, type, or priority
- `DELETE /api/v1/theme/rules/:ruleId` — Delete location rule
- `POST /api/v1/theme/evaluate` — Evaluate active header, footer, or template for a specific context payload

---

## 7. Tri-Renderer Parity for Dynamic Widgets

### 1. Visual Editor Canvas (`frontend/src/features/atomic-editor/components/LoopDataSourceSelector.tsx` & `renderers.tsx`)
- Interactive inspector control to bind `loop-grid` and `loop-carousel` to any custom post type.
- Live preview queries dynamic CPT entries or falls back to synthetic preview items.
- Dynamic responsive slides per view calculation (desktop 3, tablet 2, mobile 1).

### 2. Published Website Runtime (`frontend/src/pages/published/PublishedSite.tsx`)
- Resolves location rules for header and footer dynamically using `matchesThemeCondition`.
- Hydrates `loop-grid` and `loop-carousel` widgets with real published entries from `/public/types/:cptSlug/entries`.
- Renders responsive swiper/grid structures directly in React DOM.

### 3. Static Compiler Export (`backend/src/services/destinations/staticCompiler.ts`)
- Evaluates conditional header and footer placement at static export compilation time.
- Compiles `loop-grid` and `loop-carousel` to pure standalone HTML/CSS with pre-rendered dynamic cards.
- Injects standalone JavaScript carousel controllers without React runtime requirements.

---

## 8. Role-Based Access Control (RBAC) & Multi-Tenancy

- **Boundary Enforcement:** Every query scopes to `websiteId`. Access across tenant boundaries is strictly rejected with `403 Forbidden` or `404 Not Found`.
- **Role Permissions:**
  - `OWNER` & `ADMIN`: Full authority over CPT schema definition, field deletion, entries, and theme location rules.
  - `EDITOR`: Manage CPT entries, edit content, and create drafts.
  - `VIEWER`: Read-only access to entries in the workspace.
  - `ANONYMOUS`: Read-only access restricted strictly to published entries via unauthenticated public routes. Unpublished drafts are isolated.

---

## 9. Verification & Test Suite Summary

All test suites pass deterministically against the disposable PostgreSQL test environment (`forgestudio_disposable_fresh`):

- **Phase 7 (Theme Builder & Dynamic CMS):** `tests/phase7-theme-cms.test.ts` -> **22 PASSED | 0 FAILED**
- **Phase 6 (Widget Tri-Renderer Parity):** `tests/phase6-widget-parity.test.ts` -> **17 PASSED | 0 FAILED**
- **Phase 5 (Visual Editor Stability):** `tests/phase5-editor-stability.test.ts` -> **23 PASSED | 0 FAILED**
- **Phase 4 (Page Lifecycle):** `tests/phase4-page-lifecycle.test.ts` -> **41 PASSED | 0 FAILED**
- **Phase 3 (Auth & RBAC):** `tests/phase3-auth-rbac.test.ts` -> **29 PASSED | 0 FAILED**
- **Phase 2 (Admin Operations):** `tests/phase2-admin.test.ts` -> **22 PASSED | 0 FAILED**
- **Build Status:**
  - Backend: `npm run build` (`tsc`) exited 0.
  - Frontend: `npm run build` (`tsc -b && vite build`) exited 0.

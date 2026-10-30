# Dashboard Custom Post Types

The Custom post types.pdf is the visual reference for `/dashboard/tools?tab=cpts`. The page uses the existing Developer Tools shell, personalized local-time greeting, welcome panel, four functional shortcuts, Quick Guide, illustrated empty state and creation action. A website selector is retained for website-scoped data. Cards show real field/entry counts; native dialogs provide creation, field management and entry editing in the same dark theme. Mobile layouts stack controls. The new page adds no permanent deletion buttons.

## Database/API mapping

Existing tables are reused: custom_post_types, custom_fields and custom_entries. The old controller used nonexistent Prisma properties and could erase/recreate fields. Correct mappings are now:

- Field API key -> custom_fields.slug.
- Field API required/options -> existing config JSON, preserving other config properties.
- Entry API values -> custom_entries.data; update merges with stored values so omitted legacy keys survive.
- Singular/plural/archive preferences -> additive dashboard_post_type_settings table keyed by post type ID. Existing post types use their current name as fallback labels, without rewriting records. supports remains untouched.

Targeted installer: `cd backend; npm run db:post-types`. SQL: prisma/migrations/20261029200000_dashboard_post_types/migration.sql. It verifies existing rows and migration history are unchanged. No blanket migration deployment, reset, or Prisma schema regeneration is used.

The existing /api/cpt and /api/v1/cpt route URLs remain. Creation/listing/fields/entries now work against the actual schema. Legacy PATCH requests can update only selected entry properties; full new forms send expectedUpdatedAt for conflict protection. Existing legacy DELETE routes remain protected for compatible callers; the new UI preserves types and entries.

## Permissions and preservation

Every route requires a session and ACTIVE account. VIEW permits listing, MANAGE_SETTINGS permits post type/field creation and structural changes, EDIT_CONTENT permits entry changes, PUBLISH additionally gates published entry changes, and DELETE gates legacy deletion. Post type deletion containing published entries also requires PUBLISH. Website access uses the existing permission service, including collaborator roles and overrides. Writes check frontend Origin when present and require JSON for POST/PATCH.

Validation covers UUIDs, bounded labels/slugs, unique field keys, recognized field types, integer ordering, required values, basic field formats and duplicate entry slugs. Transactional parent locks serialize field and entry changes. Field saves update existing IDs by ID/key, preserve options and existing config, and only remove unused fields. A field whose key appears in entry data cannot be removed or change key/type. Failed changes roll back. Fields and entries support optimistic timestamp conflicts; monotonic timestamps prevent same-millisecond version collisions. Website/editor data is untouched.

Load failures show retries instead of fake empty data. Failed saves retain inputs. Site/dialog loads are aborted on navigation to prevent stale responses. Pending writes disable repeated actions. Draft/published entry statuses are explicit, and no entry is published by merely opening the page. The archive preference is persisted; configuring an archive layout still belongs to the website editor.

## Checks

- Backend and frontend `npm run build`.
- Backend `npm run test:post-types-dashboard`: actual API/database persistence, mapping, labels, roles/account/site isolation, IDs/options/value preservation, stale-write conflicts, duplicate slugs, counts, partial legacy updates, and snapshots proving existing websites/content/settings/migration ledger remain unchanged.
- Frontend `npm run test:post-types`: stable slug and field-save payload behavior.
- Backend `npm run test:post-types-browser`: local Vite/API and disposable Chrome CDP on 9227. PDF desktop view, guide, creation and failure recovery, fields/counts, entry create/edit/publish, used-field protection, stale field conflicts, reload/site switching, load retries, mobile/modal overflow and empty accounts.

Tests use disposable example.invalid accounts/sites and clean them up. Screenshots/report are ignored under `.integration-review/post-types-e2e`. No existing site is edited, published or deleted during tests.

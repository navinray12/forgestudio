# Account/workspace membership authority (FS-040)

The supplied blueprint requires consolidated account -> workspace -> site -> page
authority, established before tenant-facing operation storage (FS-010 and later).
Before this change, the repository had four uncoordinated tenancy paths: direct
`Website.userId` ownership, a live-but-disconnected `Team`/`TeamMember` HTTP surface
that granted no actual website permission, and an `Organization`/`Workspace` pair
that was schema-complete but unreachable from any route. This is the first pass at
consolidating that into one enforced authority path. **It does not migrate or retire
`Team`; that remains a separate, explicitly deferred decision (see "Not done" below.)**

## What changed

- `WorkspaceMember` gained `status` (`ACTIVE`/`REVOKED`) and `policyVersion`. Removing
  a member is now a status change, not a delete: history survives, and an in-flight
  authorization decision can be told apart from "never was a member."
- New `WorkspaceInvitation`: single-use, bound to a recipient email/role/expiry.
  Acceptance is a guarded `PENDING -> ACCEPTED` conditional update, so a replayed or
  raced token can win at most once.
- New `SupportGrant`: time-limited, workspace-scoped elevation for platform staff,
  approved only by a platform `ADMIN`/`SUPER_ADMIN`, capped at 24 hours, revocable
  before expiry. There is no ambient support role that bypasses this.
- `Website.workspaceId` is now mandatory (previously one of three optional, mutually
  inconsistent tenant references alongside `teamId` and `organizationId`, none of
  which were read by the authorization path). The migration backfills a personal
  organization + workspace + `OWNER` membership for every existing user who owned a
  website without one, and `createWebsite()` now assigns the caller's personal
  workspace automatically when no workspace is specified.
- `website.service.ts`'s `getWebsiteById` -- the function essentially every route
  authorizes through -- now falls back to the site's workspace membership when there
  is no direct owner/collaborator grant. A workspace `OWNER`/`ADMIN` maps to the
  equivalent site role; a workspace `MEMBER` maps to `DESIGNER` (design/content edit,
  not publish or member management), matching the blueprint's "design editing does
  not automatically grant production publish" default. A failed workspace-membership
  lookup raises `AUTHORIZATION_UNAVAILABLE` (503), the same fail-closed contract
  FS-003 established for `GranularPermission` lookups -- it is never treated as an
  implicit allow or silently downgraded to "not found."
- `backend/src/modules/workspaces/workspace-membership.service.ts` is the new single
  source of truth for active-role checks, invitations and support grants.
  `website.service.ts` depends on it; `workspace.service.ts` (existing CRUD, now
  wired to real HTTP routes at `/api/v1/workspaces` for the first time) delegates its
  member-removal path to it rather than hard-deleting rows.

## Verified

`backend/tests/integration/workspace-authority.test.ts` runs against a real
disposable PostgreSQL container (`npm run test:integration`) and covers exactly the
register's required evidence for FS-040 plus the adjacent invariants it depends on:

- Cross-workspace roles do not leak (a guessed site ID from another workspace's
  owner/admin is rejected; each owner keeps access to their own site).
- A workspace `MEMBER` gets `EDIT` but not `PUBLISH`/`MANAGE_MEMBERS`, with no
  `WebsiteCollaborator` row created.
- Revocation takes effect on the very next check.
- A renamed `workspace_members` table produces `AUTHORIZATION_UNAVAILABLE`, not a
  silent deny or an allow.
- An invitation token is accepted at most once, including under real concurrent
  acceptance (`Promise.allSettled` of two simultaneous accepts: exactly one winner,
  no duplicate membership row).
- An expired invitation and an invitation accepted by the wrong email are rejected.
- A support grant is active only between creation and its expiry/revocation,
  verified by advancing `expiresAt` and by explicit revocation; only a platform
  administrator can approve or revoke one; grants over 24 hours are rejected.
- A personal workspace is created lazily, reused on repeat calls, and -- verified
  under real concurrent first use, not simulated -- exactly one is created when four
  concurrent calls race for the same new user.

The migration itself was verified three ways in the same run: applied cleanly to a
fresh database, produced **no schema drift** against `schema.prisma` (the project's
existing `prisma migrate diff` check), and applied cleanly as an upgrade to a
populated database while preserving existing draft/published content (the existing
upgrade-preservation check). `npm run check` (build, source boundaries, docs
coverage, typecheck across all workspaces, the full unit suite, production build,
bundle budget) passed after this change.

## Not done

This closes the specific FS-040 evidence gap, not the entire "tenant hierarchy"
item from `production-blueprint-status.md`. Still open:

- `Team`/`TeamMember`/`TeamInvitation` remain live at `/api/v1/teams` and continue to
  write real rows, but (as before this change) grant no actual site permission and
  are not migrated into `Workspace`. Deciding whether to fold them in or retire them
  is a separate, deliberate product decision, not a passive side effect of this pass.
- `Website.teamId` and `Website.organizationId` remain as deprecated, unused, un-
  dropped columns (existing content preserved, per the migration-safety requirement).
- No row-level security (RLS) policies were added; isolation is enforced entirely in
  the application layer (`getWebsiteById`), consistent with the rest of the codebase
  today. RLS as defense-in-depth is still open.
- `GranularPermission`/`WebsiteCollaborator`-based per-resource overrides
  (`permission.service.ts`) are unchanged and still require a `WebsiteCollaborator`
  row to target a user; a workspace-derived member cannot yet receive a granular
  override without also being added as a direct collaborator.
- Scheduled/queued-job re-authorization against current workspace membership
  (relevant once FS-010's durable operations exist) is not implemented here.
- No account-level (as opposed to workspace-level) billing/entitlement concept was
  added; `Organization` continues to serve only as the workspace's optional parent.

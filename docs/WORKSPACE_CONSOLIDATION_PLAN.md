# Personal workspace consolidation

Prepared 27 October 2026. The dashboard mapping is fixed in code. The shared database has **not** been merged or migrated.

## Read-only inventory

For Ashwani (`a19b4e9e-56ce-421f-b4d0-888051a4dec9`):

| Source | Workspace ID | Organization ID | Sites | Members | Pending legacy workspace invitations |
| --- | --- | --- | ---: | ---: | ---: |
| Virtual `personal` scope | No database row | None | 0 unassigned for this owner | None | None |
| Personal websites | `d7326f63-0c04-4e50-9573-5406e4e3b6af` | `1da1e7e0-9871-429c-ba5b-0d6d96458168` | 2 | 1 OWNER | 0 |
| Personal workspace | `6dd0671e-413e-4be9-aae0-d5fa895c6969` | `ea324f22-e97c-4262-98c5-4c30410b075f` | 1 | 1 OWNER | 2 ADMIN |

The canonical workspace is `6dd0671e-413e-4be9-aae0-d5fa895c6969`, because its invitation links already name that workspace. No other member is currently attached to either workspace. The two sites in the legacy workspace have no website collaborators or website invitations. The third site and both workspace invitations stay in the canonical workspace. The owner is also the sole member of each organization.

Other owners' workspaces and unassigned websites are distinct and must be retained. The dashboard now identifies an owner's legacy personal workspace aliases by their persisted slug format, returns one canonical selector entry with the real owner name, and reads authorized sites across both IDs. Site creation is directed to the canonical ID. The `personal` option appears only for users with unassigned sites or no real workspace. The Members toolbar uses the dashboard selector; old alias URLs resolve to the canonical route.

## Backup

A full custom-format `pg_dump` was taken before any merge, at `C:\Users\coolr\AppData\Local\Temp\forgestudio-workspace-merge\before-merge-2026-10-27T09-22-43-409Z-77e3a499-9273-4f76-abd5-419c5b038e3c.dump`. SHA-256: `20af320c22fb2176b7d8d56fd4b5ccbc767a5c4687bec517b481814f2fa6dfd1`; size 789,225 bytes. `pg_restore --list` read 1,620 archive entries. The backup has not yet been restore-tested. This is a planning snapshot; take and verify a fresh backup immediately before any approved live write.

## Physical merge gate

The two workspaces belong to **different organizations**. A database trigger rejects changing a site's workspace unless `websites.organizationId` also matches the destination workspace's organization. Moving the two sites therefore changes both tenant links. The legacy organization has 28 undispatched website-document outbox events and 28 command-journal entries. The canonical organization has six undispatched events, including two invitation events, and four journal entries. These records must remain intact. The legacy organization settings also differ (`kind` versus empty settings).

For these reasons, no live website reassignment, member deletion, workspace deletion, archival, or organization change was made. Phase 2's new invitation table and Members counter also remain unapplied; the old two invitation rows are in the separate legacy `workspace_invitations` table. The dashboard display fix does not imply that the Phase 2 Members API is ready on the shared database.

Before a physical consolidation is approved and executed:

1. Resolve the pending outbox event behavior with the owning system. Confirm whether those events can safely dispatch with their original organization IDs after the two sites move, or drain them before the change. Do not rewrite historical journal or outbox rows merely to make IDs match.
2. Pause API/worker writers. Take a fresh full backup, verify restoration on an isolated database, and rerun `backend/scripts/audit-workspace-duplicates.mjs`. Abort if owner, memberships, site IDs, invitation IDs/statuses, organization links, or reference counts differ from this inventory.
3. Rehearse the guarded transaction on that disposable restore. Preserve each site's ID, owner, content, version, direct permissions, and timestamps; change only `workspaceId` and `organizationId` for the two legacy sites. Check the website admission and document-version triggers, RLS, all linked records, and the three-site dashboard result. The destination is the invitation-bearing canonical workspace and its organization.
4. After explicit approval, run the same transaction on the shared database, then archive the empty legacy workspace while retaining its owner membership, organization, journal, and outbox history. Do not delete either workspace or organization until references and retention requirements have been separately reviewed. Verify all three sites, both invitations, owner membership, direct site permissions, and old editor URLs after cutover.

The approved physical change would leave one **active** personal workspace for Ashwani. The archived legacy row remains for history until a separate safe deletion review. The UI already shows one logical workspace and all three authorized sites; it requires no database write to do so.

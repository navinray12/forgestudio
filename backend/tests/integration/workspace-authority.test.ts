/**
 * @file Workspace authority test: regression coverage for FS-040 (account/workspace
 * membership authority established before tenant-facing features). Covers the tracked
 * required evidence directly: cross-workspace roles, reused invitation, and support
 * grant expiry, plus revocation immediacy and fail-closed policy lookups (FS-003 parity).
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/platform/database/prisma.js";
import { canUserAccessResource } from "../../src/modules/permissions/permission.service.js";
import { getWebsiteById, createWebsite } from "../../src/modules/websites/website.service.js";
import { createWorkspace, addWorkspaceMember } from "../../src/modules/workspaces/workspace.service.js";
import {
  getActiveWorkspaceRole,
  getOrCreatePersonalWorkspace,
  inviteToWorkspace,
  acceptWorkspaceInvitation,
  revokeWorkspaceMember,
  createSupportGrant,
  revokeSupportGrant,
  hasActiveSupportGrant,
} from "../../src/modules/workspaces/workspace-membership.service.js";

let ownerA: string, ownerB: string, memberX: string, admin: string;
const userIds: string[] = [];

/**
 * Make User.
 * @param overrides Overrides supplied to this operation (type: Partial<{ role: string }>). Optional.
 */
async function makeUser(overrides: Partial<{ role: "USER" | "ADMIN" | "SUPER_ADMIN" }> = {}) {
  const user = await prisma.user.create({
    data: { email: `${crypto.randomUUID()}@example.invalid`, role: overrides.role },
  });
  userIds.push(user.id);
  return user.id;
}

beforeAll(async () => {
  ownerA = await makeUser();
  ownerB = await makeUser();
  memberX = await makeUser();
  admin = await makeUser({ role: "ADMIN" });
});

/**
 * Make Site. Creates a website directly (bypassing the per-account website-count
 * subscription limit enforced by the createWebsite() service) so a single fixture
 * owner can hold several sites across a test file, matching foundation.test.ts.
 * @param userId User identifier used to scope this operation.
 * @param workspaceId Identifier of the workspace containing the affected resources.
 * @param name Name supplied to this operation (type: string).
 */
async function makeSite(userId: string, workspaceId: string, name: string) {
  return prisma.website.create({
    data: { userId, name, slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID()}`, workspaceId },
  });
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("cross-workspace roles", () => {
  it("does not leak access from one workspace's role into another workspace's site", async () => {
    const workspaceA = await createWorkspace(ownerA, `Workspace A ${crypto.randomUUID()}`);
    const workspaceB = await createWorkspace(ownerB, `Workspace B ${crypto.randomUUID()}`);
    const siteA = await makeSite(ownerA, workspaceA.id, "Site A");
    const siteB = await makeSite(ownerB, workspaceB.id, "Site B");

    // Owner B is OWNER of workspace B, which grants nothing in workspace A's site.
    await expect(getWebsiteById(siteA.id, ownerB)).rejects.toMatchObject({ code: "WEBSITE_NOT_FOUND" });
    await expect(canUserAccessResource(ownerB, siteA.id, "*", "VIEW")).rejects.toMatchObject({
      code: "WEBSITE_NOT_FOUND",
    });

    // Owner A likewise gets nothing from site B via a guessed ID.
    await expect(getWebsiteById(siteB.id, ownerA)).rejects.toMatchObject({ code: "WEBSITE_NOT_FOUND" });

    // Each owner's own site remains reachable through their own workspace role.
    expect((await getWebsiteById(siteA.id, ownerA)).userPermission).toBe("OWNER");
    expect((await getWebsiteById(siteB.id, ownerB)).userPermission).toBe("OWNER");
  });

  it("grants a workspace MEMBER edit access but not publish, without a WebsiteCollaborator row", async () => {
    const workspace = await createWorkspace(ownerA, `Design workspace ${crypto.randomUUID()}`);
    const site = await makeSite(ownerA, workspace.id, "Design site");
    await addWorkspaceMember(workspace.id, ownerA, memberX, "MEMBER");

    expect(await prisma.websiteCollaborator.findUnique({
      where: { websiteId_userId: { websiteId: site.id, userId: memberX } },
    })).toBeNull();

    expect((await getWebsiteById(site.id, memberX)).userPermission).toBe("DESIGNER");
    expect(await canUserAccessResource(memberX, site.id, "*", "EDIT")).toBe(true);
    expect(await canUserAccessResource(memberX, site.id, "*", "PUBLISH")).toBe(false);
    expect(await canUserAccessResource(memberX, site.id, "*", "MANAGE_MEMBERS")).toBe(false);
  });

  it("revokes access immediately: a subsequent check sees no active role", async () => {
    const workspace = await createWorkspace(ownerA, `Revocable workspace ${crypto.randomUUID()}`);
    const site = await makeSite(ownerA, workspace.id, "Revocable site");
    await addWorkspaceMember(workspace.id, ownerA, memberX, "ADMIN");
    expect(await getActiveWorkspaceRole(memberX, workspace.id)).toBe("ADMIN");
    expect((await getWebsiteById(site.id, memberX)).userPermission).toBe("ADMIN");

    await revokeWorkspaceMember(workspace.id, ownerA, memberX);

    expect(await getActiveWorkspaceRole(memberX, workspace.id)).toBeNull();
    await expect(getWebsiteById(site.id, memberX)).rejects.toMatchObject({ code: "WEBSITE_NOT_FOUND" });
  });

  it("fails closed instead of silently denying when workspace membership cannot be evaluated", async () => {
    const workspace = await createWorkspace(ownerA, `Fragile workspace ${crypto.randomUUID()}`);
    const site = await makeSite(ownerA, workspace.id, "Fragile site");
    await addWorkspaceMember(workspace.id, ownerA, memberX, "MEMBER");
    expect((await getWebsiteById(site.id, memberX)).userPermission).toBe("DESIGNER");

    await prisma.$executeRawUnsafe(`ALTER TABLE workspace_members RENAME TO test_hidden_workspace_members`);
    try {
      await expect(getWebsiteById(site.id, memberX)).rejects.toMatchObject({ code: "AUTHORIZATION_UNAVAILABLE" });
    } finally {
      await prisma.$executeRawUnsafe(`ALTER TABLE test_hidden_workspace_members RENAME TO workspace_members`);
    }
  });
});

describe("reused workspace invitations", () => {
  it("accepts a valid invitation exactly once and rejects a replay of the same token", async () => {
    const workspace = await createWorkspace(ownerA, `Invite workspace ${crypto.randomUUID()}`);
    const invitee = await prisma.user.create({ data: { email: `invitee-${crypto.randomUUID()}@example.invalid` } });
    userIds.push(invitee.id);
    const { token } = await inviteToWorkspace(workspace.id, ownerA, invitee.email!, "MEMBER");

    const first = await acceptWorkspaceInvitation(token, invitee.id);
    expect(first).toMatchObject({ success: true, workspaceId: workspace.id, role: "MEMBER" });
    expect(await getActiveWorkspaceRole(invitee.id, workspace.id)).toBe("MEMBER");

    await expect(acceptWorkspaceInvitation(token, invitee.id)).rejects.toMatchObject({
      code: "INVITATION_ALREADY_USED",
    });
  });

  it("allows exactly one winner when the same token is accepted concurrently", async () => {
    const workspace = await createWorkspace(ownerA, `Race workspace ${crypto.randomUUID()}`);
    const invitee = await prisma.user.create({ data: { email: `race-${crypto.randomUUID()}@example.invalid` } });
    userIds.push(invitee.id);
    const { token } = await inviteToWorkspace(workspace.id, ownerA, invitee.email!, "MEMBER");

    const results = await Promise.allSettled([
      acceptWorkspaceInvitation(token, invitee.id),
      acceptWorkspaceInvitation(token, invitee.id),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.code).toBe("INVITATION_ALREADY_USED");

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: invitee.id } },
    });
    expect(membership).toMatchObject({ status: "ACTIVE", role: "MEMBER" });
  });

  it("rejects an expired invitation and an invitation sent to a different email", async () => {
    const workspace = await createWorkspace(ownerA, `Expiry workspace ${crypto.randomUUID()}`);
    const invitee = await prisma.user.create({ data: { email: `expired-${crypto.randomUUID()}@example.invalid` } });
    const stranger = await prisma.user.create({ data: { email: `stranger-${crypto.randomUUID()}@example.invalid` } });
    userIds.push(invitee.id, stranger.id);
    const { token, invitationId } = await inviteToWorkspace(workspace.id, ownerA, invitee.email!, "MEMBER");

    await expect(acceptWorkspaceInvitation(token, stranger.id)).rejects.toMatchObject({
      code: "INVITATION_EMAIL_MISMATCH",
    });

    await prisma.workspaceInvitation.update({ where: { id: invitationId }, data: { expiresAt: new Date(0) } });
    await expect(acceptWorkspaceInvitation(token, invitee.id)).rejects.toMatchObject({
      code: "INVITATION_EXPIRED",
    });
  });

  it("rejects invitations from a non-admin member", async () => {
    const workspace = await createWorkspace(ownerA, `Guarded invite workspace ${crypto.randomUUID()}`);
    await addWorkspaceMember(workspace.id, ownerA, memberX, "MEMBER");
    await expect(
      inviteToWorkspace(workspace.id, memberX, `nobody-${crypto.randomUUID()}@example.invalid`, "MEMBER"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("support grant expiry", () => {
  it("grants access only while active, denies once expired, and denies once revoked", async () => {
    const workspace = await createWorkspace(ownerA, `Support workspace ${crypto.randomUUID()}`);
    expect(await hasActiveSupportGrant(workspace.id, memberX)).toBe(false);

    const grant = await createSupportGrant(workspace.id, memberX, "Investigating a customer ticket", admin, 60_000);
    expect(await hasActiveSupportGrant(workspace.id, memberX)).toBe(true);

    // Backdate to just after creation (not before it, which the DB's
    // expiry-after-create check constraint rejects) so it reads as already expired.
    await prisma.supportGrant.update({
      where: { id: grant.id },
      data: { expiresAt: new Date(grant.createdAt.getTime() + 1) },
    });
    expect(await hasActiveSupportGrant(workspace.id, memberX)).toBe(false);

    const grant2 = await createSupportGrant(workspace.id, memberX, "Second ticket", admin, 60_000);
    expect(await hasActiveSupportGrant(workspace.id, memberX)).toBe(true);
    await revokeSupportGrant(grant2.id, admin);
    expect(await hasActiveSupportGrant(workspace.id, memberX)).toBe(false);
  });

  it("rejects a support grant approved by a non-administrator", async () => {
    const workspace = await createWorkspace(ownerA, `Unapproved support workspace ${crypto.randomUUID()}`);
    await expect(
      createSupportGrant(workspace.id, memberX, "Should be refused", ownerA, 60_000),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a support grant longer than 24 hours", async () => {
    const workspace = await createWorkspace(ownerA, `Bounded support workspace ${crypto.randomUUID()}`);
    await expect(
      createSupportGrant(workspace.id, memberX, "Too long", admin, 25 * 60 * 60 * 1000),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("personal workspace bootstrap", () => {
  it("is created lazily and reused idempotently", async () => {
    const user = await prisma.user.create({ data: { email: `solo-${crypto.randomUUID()}@example.invalid` } });
    userIds.push(user.id);

    const first = await getOrCreatePersonalWorkspace(user.id);
    const second = await getOrCreatePersonalWorkspace(user.id);
    expect(second.id).toBe(first.id);

    const site = await createWebsite({ userId: user.id, name: "Auto workspace site" });
    expect(site.workspaceId).toBe(first.id);
  });

  it("creates exactly one personal workspace under concurrent first use", async () => {
    const user = await prisma.user.create({ data: { email: `concurrent-${crypto.randomUUID()}@example.invalid` } });
    userIds.push(user.id);

    const results = await Promise.all(
      Array.from({ length: 4 }, () => getOrCreatePersonalWorkspace(user.id)),
    );
    const ids = new Set(results.map((w) => w.id));
    expect(ids.size).toBe(1);
    expect(await prisma.workspace.count({ where: { ownerId: user.id } })).toBe(1);
  });
});

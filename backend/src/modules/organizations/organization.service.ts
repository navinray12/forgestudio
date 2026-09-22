/**
 * @file Organizations: business operations and coordination with persistence or external services. File responsibility: organization service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";

const db = prisma as any;

/**
 * Generate Slug.
 * @param name Name supplied to this operation (type: string).
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .concat("-", Math.random().toString(36).substring(2, 7));
}

/**
 * Create Organization.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 * @param name Name supplied to this operation (type: string).
 * @param slug Slug supplied to this operation (type: string). Optional; callers may omit it.
 * @param settings Settings supplied to this operation (type: Record<string, any>). Defaults to {}.
 */
export async function createOrganization(
  userId: string,
  name: string,
  slug?: string,
  settings: Record<string, any> = {}
) {
  if (!name || !name.trim()) {
    throw new AppError("Organization name is required", 400, "BAD_REQUEST");
  }

  const finalSlug = slug?.trim() || generateSlug(name);

  const org = await db.organization.create({
    data: {
      name: name.trim(),
      slug: finalSlug,
      ownerId: userId,
      settings,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
      },
    },
  });

  // Durable Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId,
        action: "ORGANIZATION_CREATED",
        targetResource: `organization:${org.id}`,
        details: { name: org.name, slug: org.slug },
      },
    });
  } catch (_) {}

  return org;
}

/**
 * Get Organization.
 * @param orgId Org Id supplied to this operation (type: string).
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 */
export async function getOrganization(orgId: string, userId: string) {
  const membership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
  });

  if (!membership) {
    throw new AppError("Organization not found or access denied", 404, "NOT_FOUND");
  }

  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      members: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
      },
      workspaces: true,
      websites: { select: { id: true, name: true, slug: true, status: true } },
    },
  });

  if (!org) {
    throw new AppError("Organization not found", 404, "NOT_FOUND");
  }

  return { ...org, userRole: membership.role };
}

/**
 * Get User Organizations.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 */
export async function getUserOrganizations(userId: string) {
  return await db.organization.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      _count: { select: { members: true, workspaces: true, websites: true } },
    },
  });
}

/**
 * Add Organization Member.
 * @param orgId Org Id supplied to this operation (type: string).
 * @param requesterId Requester Id supplied to this operation (type: string).
 * @param targetEmail Target Email supplied to this operation (type: string).
 * @param role Role supplied to this operation (type: "ADMIN" | "MEMBER"). Defaults to "MEMBER".
 */
export async function addOrganizationMember(
  orgId: string,
  requesterId: string,
  targetEmail: string,
  role: "ADMIN" | "MEMBER" = "MEMBER"
) {
  const requesterMembership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: requesterId } },
  });

  if (!requesterMembership || (requesterMembership.role !== "OWNER" && requesterMembership.role !== "ADMIN")) {
    throw new AppError("Only organization owners and admins can manage members", 403, "FORBIDDEN");
  }

  const targetUser = await db.user.findUnique({ where: { email: targetEmail } });
  if (!targetUser) {
    throw new AppError("User with this email was not found", 404, "USER_NOT_FOUND");
  }

  const existing = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: targetUser.id } },
  });

  if (existing) {
    throw new AppError("User is already a member of this organization", 400, "BAD_REQUEST");
  }

  const member = await db.organizationMember.create({
    data: {
      organizationId: orgId,
      userId: targetUser.id,
      role,
    },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });

  // Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId: requesterId,
        action: "ORGANIZATION_MEMBER_ADDED",
        targetResource: `organization:${orgId}`,
        details: { targetUserId: targetUser.id, role },
      },
    });
  } catch (_) {}

  return member;
}

/**
 * Remove Organization Member.
 * @param orgId Org Id supplied to this operation (type: string).
 * @param requesterId Requester Id supplied to this operation (type: string).
 * @param targetUserId Target User Id supplied to this operation (type: string).
 */
export async function removeOrganizationMember(
  orgId: string,
  requesterId: string,
  targetUserId: string
) {
  const requesterMembership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: requesterId } },
  });

  if (!requesterMembership || (requesterMembership.role !== "OWNER" && requesterMembership.role !== "ADMIN")) {
    throw new AppError("Only organization owners and admins can remove members", 403, "FORBIDDEN");
  }

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (org?.ownerId === targetUserId) {
    throw new AppError("Cannot remove the organization owner", 403, "FORBIDDEN");
  }

  await db.organizationMember.delete({
    where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
  });

  // Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId: requesterId,
        action: "ORGANIZATION_MEMBER_REMOVED",
        targetResource: `organization:${orgId}`,
        details: { targetUserId },
      },
    });
  } catch (_) {}

  return { success: true };
}

/**
 * Update Organization Settings.
 * @param orgId Org Id supplied to this operation (type: string).
 * @param requesterId Requester Id supplied to this operation (type: string).
 * @param settings Settings supplied to this operation (type: Record<string, any>).
 */
export async function updateOrganizationSettings(
  orgId: string,
  requesterId: string,
  settings: Record<string, any>
) {
  const requesterMembership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: requesterId } },
  });

  if (!requesterMembership || requesterMembership.role !== "OWNER") {
    throw new AppError("Only organization owners can modify settings", 403, "FORBIDDEN");
  }

  const updated = await db.organization.update({
    where: { id: orgId },
    data: { settings },
  });

  // Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId: requesterId,
        action: "ORGANIZATION_SETTINGS_UPDATED",
        targetResource: `organization:${orgId}`,
        details: { settings },
      },
    });
  } catch (_) {}

  return updated;
}

import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { checkWebsiteLimit } from "./subscription.service.js";
import crypto from "crypto";
import { canUserAccessResource } from "./permission.service.js";

const db = prisma as any;

/**
 * Ensure websites table exists in PostgreSQL
 */
export async function initWebsiteTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS websites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        "editorData" JSONB NOT NULL DEFAULT '{"version":1,"elements":[]}'::jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites("userId");
    `);
  } catch (error) {
    console.error("Website table initialization log:", error);
  }
}

// Auto-run initialization
initWebsiteTable();

function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${baseSlug || "website"}-${randomSuffix}`;
}

/**
 * Get all websites belonging to a specific user
 */
export async function getUserWebsites(userId: string) {
  try {
    if (db?.website?.findMany) {
      const websites = await db.website.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      if (websites) return websites;
    }

    const rawWebsites: any[] = await prisma.$queryRaw`
      SELECT id, "userId", name, slug, status, "editorData", "createdAt", "updatedAt"
      FROM websites
      WHERE "userId" = ${userId}::uuid
      ORDER BY "createdAt" DESC
    `;
    return rawWebsites || [];
  } catch (error) {
    console.error("Error fetching user websites:", error);
    return [];
  }
}

/**
 * Get a single website by ID with ownership check
 */
export async function getWebsiteById(websiteId: string, userId: string) {
  try {
    let website: any = null;
    let permission = "NONE";

    if (db?.website?.findUnique) {
      website = await db.website.findUnique({
        where: { id: websiteId },
        include: {
          customCodeSnippets: true
        }
      });

      if (website) {
        if (website.userId === userId) {
          permission = "OWNER";
        } else {
          // F-404: Check WebsiteCollaborator explicitly
          const collab = await db.websiteCollaborator.findUnique({
            where: {
              websiteId_userId: { websiteId, userId }
            }
          });
          if (collab) {
            permission = collab.permission;
          } else {
            website = null; // Purge access
          }
        }
      }
    }

    if (!website) {
      // Raw Fallback mapped exactly to original flow logic but integrating permissions
      const rawWebsites: any[] = await prisma.$queryRaw`
        SELECT w.id, w."userId", w.name, w.slug, w.status, w."editorData", w."createdAt", w."updatedAt",
               CASE WHEN w."userId" = ${userId}::uuid THEN 'OWNER' ELSE c.permission END as "userPermission"
        FROM websites w
        LEFT JOIN website_collaborators c ON c."websiteId" = w.id AND c."userId" = ${userId}::uuid
        WHERE w.id = ${websiteId}::uuid AND (w."userId" = ${userId}::uuid OR c.id IS NOT NULL)
        LIMIT 1
      `;
      if (rawWebsites && rawWebsites.length > 0) {
        website = rawWebsites[0];
        permission = website.userPermission || "REVIEWER";
        delete website.userPermission;
      }
    }

    if (!website) {
      throw new AppError(
        "Website not found or access denied",
        404,
        "WEBSITE_NOT_FOUND"
      );
    }

    // Embed current user's explicit authorization
    return { ...website, userPermission: permission };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to fetch website", 500, "WEBSITE_FETCH_FAILED");
  }
}

/**
 * Create a new website with subscription limit check
 */
export async function createWebsite(userId: string, name: string) {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    throw new AppError("Website name is required", 400, "INVALID_NAME");
  }

  // 1. Get current website count for user
  const currentWebsites = await getUserWebsites(userId);
  const currentCount = currentWebsites.length;

  // 2. Check subscription website limit
  const limitCheck = await checkWebsiteLimit(userId, currentCount);

  if (!limitCheck.allowed) {
    const limit = limitCheck.limit || 1;
    throw new AppError(
      `Your current plan allows up to ${limit} website${limit === 1 ? "" : "s"}. Please upgrade your plan to create another website.`,
      403,
      "WEBSITE_LIMIT_EXCEEDED"
    );
  }

  const slug = generateSlug(trimmedName);
  const initialEditorData = {
    version: 1,
    elements: [],
  };

  try {
    if (db?.website?.create) {
      const newWebsite = await db.website.create({
        data: {
          userId,
          name: trimmedName,
          slug,
          status: "DRAFT",
          editorData: initialEditorData,
        },
      });
      return newWebsite;
    }

    // Raw SQL Fallback
    const initialJsonStr = JSON.stringify(initialEditorData);
    const created: any[] = await prisma.$queryRaw`
      INSERT INTO websites (id, "userId", name, slug, status, "editorData", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${userId}::uuid, ${trimmedName}, ${slug}, 'DRAFT', ${initialJsonStr}::jsonb, NOW(), NOW())
      RETURNING id, "userId", name, slug, status, "editorData", "createdAt", "updatedAt"
    `;

    return created[0];
  } catch (error) {
    console.error("Error creating website:", error);
    throw new AppError("Failed to create website", 500, "CREATE_FAILED");
  }
}

/**
 * Update editor JSON structure for a website
 */
export async function updateWebsiteEditorData(
  websiteId: string,
  userId: string,
  editorData: any,
  performanceSettings?: any
) {
  // Ensure website exists and fetch F-404 permission boundaries
  const website = await getWebsiteById(websiteId, userId);

  const canEditDesign = await canUserAccessResource(userId, websiteId, "*", "EDIT_DESIGN");
  const canEditContent = await canUserAccessResource(userId, websiteId, "*", "EDIT_CONTENT");

  if (!canEditDesign && !canEditContent) {
    throw new AppError("You do not have permission to edit this component.", 403, "FORBIDDEN");
  }

  // F-405 / F-404: Safe Component / Content Editing Mode
  const isWebsiteOwner = website.userId === userId;
  const isCollaboratorAdmin = (website as unknown as any).userPermission === "ADMIN";
  const isAdmin = isWebsiteOwner || isCollaboratorAdmin;

  // Retrieve explicitly granted component accesses
  const explicitAccesses = await prisma.componentAccess.findMany({ where: { websiteId, userId } });
  const allowedComponentIds = new Set(explicitAccesses.map(a => a.componentId));

  const currentEditorData = typeof website.editorData === "string" ? JSON.parse(website.editorData) : website.editorData;

  const safeMerge = (currentEls: any[], newEls: any[]): any[] => {
    // 1. We must retain ALL protected components from currentEls, even if newEls omitted them (prevent unauthorized deletion).
    const mergedEls = [];

    // To handle reordering, we iterate through newEls, but we MUST inject missing protected ones.
    const allIds = new Set([...currentEls.map(c => c.id), ...newEls.map(n => n.id)]);

    // Actually, preserving order while mixing deleted/kept is tricky.
    // Let's iterate currentEls. If it's protected, keep it unchanged. If it's not protected, find incoming.
    for (const cEl of currentEls) {
      const isProtectedNode = cEl.isProtected === true;
      const userCanEdit = isAdmin || allowedComponentIds.has(cEl.id);

      // If protected and no rights, strictly preserve untouched.
      if (isProtectedNode && !userCanEdit) {
        mergedEls.push(cEl);
        continue;
      }

      const incoming = newEls.find(n => n.id === cEl.id);

      // If deleted by user
      if (!incoming) {
        // It's allowed to be deleted because they have rights.
        continue;
      }

      // If !canEditDesign && canEditContent
      if (!canEditDesign && canEditContent) {
        if (incoming.content !== undefined) cEl.content = incoming.content;
        if (incoming.src !== undefined) cEl.src = incoming.src;
        if (incoming.alt !== undefined) cEl.alt = incoming.alt;
        if (incoming.href !== undefined) cEl.href = incoming.href;
      } else {
        // Full design rights! Merge everything (classes, styles, etc).
        Object.assign(cEl, incoming);
      }

      // Recurse children
      if (cEl.children) {
        cEl.children = safeMerge(cEl.children, incoming.children || []);
      }

      mergedEls.push(cEl);
    }

    // Now append any newly created elements that didn't exist in currentEls
    for (const nEl of newEls) {
      if (!currentEls.find(c => c.id === nEl.id)) {
        mergedEls.push(nEl);
      }
    }

    return mergedEls;
  };

  const safeElements = safeMerge(currentEditorData.elements || [], editorData.elements || []);
  const safePopups = (currentEditorData.popups || []).map((p: any) => {
    const incomingP = (editorData.popups || []).find((ip: any) => ip.id === p.id);
    if (incomingP && p.elements && incomingP.elements) {
      p.elements = safeMerge(p.elements, incomingP.elements);
    }
    return p;
  });

  // Preserve multi-page pages and site parts safely without data loss
  let safePages = editorData.pages;
  if (Array.isArray(editorData.pages) && editorData.pages.length > 0) {
    const currentPages = Array.isArray(currentEditorData.pages) ? currentEditorData.pages : [];
    safePages = editorData.pages.map((p: any) => {
      const currentP = currentPages.find((cp: any) => cp.id === p.id);
      if (currentP && Array.isArray(currentP.elements) && Array.isArray(p.elements)) {
        return {
          ...p,
          elements: safeMerge(currentP.elements, p.elements),
        };
      }
      return p;
    });
  } else if (currentEditorData.pages) {
    safePages = currentEditorData.pages;
  }

  // Preserve siteParts (header and footer)
  let safeSiteParts = editorData.siteParts || currentEditorData.siteParts;
  if (safeSiteParts) {
    safeSiteParts = {
      ...(currentEditorData.siteParts || {}),
      ...(editorData.siteParts || {}),
    };
    if (editorData.siteParts?.header && currentEditorData.siteParts?.header?.elements && editorData.siteParts.header.elements) {
      safeSiteParts.header = {
        ...editorData.siteParts.header,
        elements: safeMerge(currentEditorData.siteParts.header.elements, editorData.siteParts.header.elements),
      };
    }
    if (editorData.siteParts?.footer && currentEditorData.siteParts?.footer?.elements && editorData.siteParts.footer.elements) {
      safeSiteParts.footer = {
        ...editorData.siteParts.footer,
        elements: safeMerge(currentEditorData.siteParts.footer.elements, editorData.siteParts.footer.elements),
      };
    }
  }

  editorData = {
    ...currentEditorData,
    ...editorData,
    elements: safeElements,
    popups: safePopups,
    ...(safePages !== undefined ? { pages: safePages } : {}),
    ...(safeSiteParts !== undefined ? { siteParts: safeSiteParts } : {}),
  };

  try {
    if (db?.website?.update) {
      const updateData: any = {
        editorData,
        updatedAt: new Date(),
      };
      if (performanceSettings !== undefined) {
        updateData.performanceSettings = performanceSettings;
      }
      const updated = await db.website.update({
        where: { id: websiteId },
        data: updateData,
      });
      return updated;
    }

    const jsonStr = JSON.stringify(editorData);
    let updated: any[];

    if (performanceSettings !== undefined) {
      const perfStr = JSON.stringify(performanceSettings);
      updated = await prisma.$queryRaw`
         UPDATE websites
         SET "editorData" = ${jsonStr}::jsonb, "performanceSettings" = ${perfStr}::jsonb, "updatedAt" = NOW()
         WHERE id = ${websiteId}::uuid
         RETURNING id, "userId", name, slug, status, "editorData", "performanceSettings", "createdAt", "updatedAt"
       `;
    } else {
      updated = await prisma.$queryRaw`
         UPDATE websites
         SET "editorData" = ${jsonStr}::jsonb, "updatedAt" = NOW()
         WHERE id = ${websiteId}::uuid
         RETURNING id, "userId", name, slug, status, "editorData", "performanceSettings", "createdAt", "updatedAt"
       `;
    }

    return updated[0];
  } catch (error) {
    console.error("Error updating website editor data:", error);
    throw new AppError("Failed to save website changes", 500, "SAVE_FAILED");
  }
}

/**
 * Delete a website with ownership check
 */
export async function deleteWebsite(websiteId: string, userId: string) {
  // Extract F-404 permission boundaries
  const website = await getWebsiteById(websiteId, userId);

  if (website.userPermission !== "OWNER") {
    throw new AppError("Only the owner can delete this project.", 403, "FORBIDDEN");
  }

  try {
    if (db?.website?.delete) {
      await db.website.delete({
        where: { id: websiteId },
      });
      return { success: true };
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM websites WHERE id = $1::uuid`,
      websiteId
    );

    return { success: true };
  } catch (error) {
    console.error("Error deleting website:", error);
    throw new AppError("Failed to delete website", 500, "DELETE_FAILED");
  }
}

export async function getWebsiteRoles(websiteId: string, userId: string) {
  const website = await getWebsiteById(websiteId, userId);

  const ownerData = await db.user.findUnique({ where: { id: website.userId } });
  const members = [{
    id: ownerData.id,
    name: ownerData.fullName || ownerData.email,
    email: ownerData.email,
    role: "OWNER"
  }];

  const collabs = await db.websiteCollaborator.findMany({
    where: { websiteId },
    include: { user: true }
  });

  for (const c of collabs) {
    if (c.user) {
      members.push({
        id: c.userId,
        name: c.user.fullName || c.user.email,
        email: c.user.email,
        role: c.permission
      });
    }
  }
  const invitationsList = await db.websiteInvitation.findMany({
    where: { websiteId, status: "PENDING" }
  });

  return { members, invitations: invitationsList };
}

export async function updateWebsiteRole(websiteId: string, requesterUserId: string, targetUserId: string, newRole: string) {
  const validRoles = ["ADMIN", "DESIGNER", "CONTENT_EDITOR", "REVIEWER"];
  if (!validRoles.includes(newRole)) {
    throw new AppError("Invalid role specified.", 400, "INVALID_ROLE");
  }

  const requesterSite = await getWebsiteById(websiteId, requesterUserId);
  const requesterRole = requesterSite.userPermission;

  if (requesterRole !== "OWNER" && requesterRole !== "ADMIN") {
    throw new AppError("You do not have permission to manage roles.", 403, "FORBIDDEN");
  }
  if (requesterUserId === targetUserId) {
    throw new AppError("You cannot change your own role.", 403, "FORBIDDEN");
  }

  const website = await db.website.findUnique({ where: { id: websiteId } });
  if (website.userId === targetUserId) {
    throw new AppError("Cannot change the role of the project owner.", 403, "FORBIDDEN");
  }

  const existing = await db.websiteCollaborator.findUnique({
    where: { websiteId_userId: { websiteId, userId: targetUserId } }
  });

  if (!existing) {
    throw new AppError("Collaborator not found.", 404, "NOT_FOUND");
  }

  await db.websiteCollaborator.update({
    where: { id: existing.id },
    data: { permission: newRole }
  });

  return { success: true };
}

export async function inviteWebsiteMember(websiteId: string, inviterId: string, email: string, role: string = "DESIGNER") {
  const website = await getWebsiteById(websiteId, inviterId);
  if (website.userPermission !== "OWNER" && website.userPermission !== "ADMIN") {
    throw new AppError("You do not have permission to invite members.", 403, "FORBIDDEN");
  }

  const validRoles = ["ADMIN", "DESIGNER", "CONTENT_EDITOR", "REVIEWER"];
  if (!validRoles.includes(role)) {
    throw new AppError("Invalid role specified.", 400, "BAD_REQUEST");
  }

  const existingMember = await db.user.findUnique({
    where: { email },
    include: { collaborations: { where: { websiteId } } }
  });

  if (existingMember && (existingMember.collaborations.length > 0 || existingMember.id === website.userId)) {
    throw new AppError("User is already a member of this project.", 400, "BAD_REQUEST");
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);

  const invite = await db.websiteInvitation.create({
    data: {
      websiteId,
      email,
      role,
      tokenHash,
      status: "PENDING",
      expiresAt: expiry,
      invitedBy: inviterId
    }
  });

  return { inviteId: invite.id, token };
}

export async function acceptWebsiteInvitation(token: string, userId: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const invite = await db.websiteInvitation.findUnique({ where: { tokenHash } });
  if (!invite) throw new AppError("Invalid invitation", 400, "BAD_REQUEST");
  if (invite.status !== "PENDING") throw new AppError("Invitation is already processed.", 400, "BAD_REQUEST");
  if (invite.expiresAt < new Date()) throw new AppError("Invitation expired.", 400, "BAD_REQUEST");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (user?.email !== invite.email) throw new AppError("This invitation was sent to a different email address.", 400, "BAD_REQUEST");

  const existing = await db.websiteCollaborator.findUnique({
    where: { websiteId_userId: { websiteId: invite.websiteId, userId } }
  });

  if (existing) {
    await db.websiteInvitation.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
    return { success: true, websiteId: invite.websiteId };
  }

  await db.$transaction([
    db.websiteCollaborator.create({
      data: {
        websiteId: invite.websiteId,
        userId,
        permission: invite.role
      }
    }),
    db.websiteInvitation.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" }
    })
  ]);

  return { success: true, websiteId: invite.websiteId };
}

export async function removeWebsiteMember(websiteId: string, requesterId: string, targetUserId: string) {
  const website = await getWebsiteById(websiteId, requesterId);

  if (website.userPermission !== "OWNER" && website.userPermission !== "ADMIN") {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  const project = await db.website.findUnique({ where: { id: websiteId } });
  if (project?.userId === targetUserId) {
    throw new AppError("Cannot remove the project owner.", 403, "FORBIDDEN");
  }

  await db.websiteCollaborator.delete({
    where: { websiteId_userId: { websiteId, userId: targetUserId } }
  });

  return { success: true };
}

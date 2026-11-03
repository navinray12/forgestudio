import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getWebsiteById } from "./website.service.js";

const db = prisma as any;

/**
 * Standard slug generator
 */
export function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function fieldKeySlugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Project-level role ranking for CMS operations
 */
const ROLE_RANK: Record<string, number> = {
  OWNER: 50,
  ADMIN: 40,
  EDITOR: 30,
  CONTENT_EDITOR: 30,
  DESIGNER: 20,
  REVIEWER: 10,
  VIEWER: 10,
  NONE: 0,
};

/**
 * Asserts user access to a website and verifies necessary capability
 */
export async function assertCmsAccess(
  websiteId: string,
  userId: string,
  requiredRole: "VIEWER" | "CONTENT_EDITOR" | "ADMIN" | "OWNER" = "VIEWER"
) {
  if (!userId) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }

  // Check user suspension
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, role: true },
  });
  if (!user || user.status === "SUSPENDED" || user.status === "DELETED") {
    throw new AppError("User account suspended or inactive", 403, "FORBIDDEN");
  }

  const website = await getWebsiteById(websiteId, userId);
  if (!website) {
    throw new AppError("Website not found or access denied", 404, "WEBSITE_NOT_FOUND");
  }

  const userPerm = String(website.userPermission || "NONE").toUpperCase();
  const normalizedPerm = userPerm === "EDITOR" ? "CONTENT_EDITOR" : userPerm;

  const currentRank = ROLE_RANK[normalizedPerm] || 0;
  const requiredRank = ROLE_RANK[requiredRole] || 0;

  if (currentRank < requiredRank) {
    throw new AppError(
      `Forbidden: '${normalizedPerm}' role cannot perform this CMS action (requires ${requiredRole})`,
      403,
      "FORBIDDEN"
    );
  }

  return { website, userPermission: normalizedPerm };
}

/**
 * Resolves CPT by ID and asserts tenant boundary
 */
export async function assertCptBelongsToWebsite(cptId: string, websiteId?: string) {
  const cpt = await prisma.customPostType.findUnique({
    where: { id: cptId },
    include: { website: { select: { id: true, userId: true } } },
  });

  if (!cpt) {
    throw new AppError("Custom Post Type not found", 404, "CPT_NOT_FOUND");
  }

  if (websiteId && cpt.websiteId !== websiteId) {
    throw new AppError("Custom Post Type does not belong to specified website", 404, "CPT_NOT_FOUND");
  }

  return cpt;
}

/**
 * Resolves Entry by ID and asserts tenant boundary
 */
export async function assertEntryBelongsToCpt(entryId: string, cptId?: string) {
  const entry = await prisma.customEntry.findUnique({
    where: { id: entryId },
    include: {
      postType: {
        include: {
          website: { select: { id: true, userId: true } },
        },
      },
      author: { select: { id: true, fullName: true, email: true } },
    },
  });

  if (!entry) {
    throw new AppError("CMS Entry not found", 404, "ENTRY_NOT_FOUND");
  }

  if (cptId && entry.postTypeId !== cptId) {
    throw new AppError("Entry does not belong to specified Custom Post Type", 404, "ENTRY_NOT_FOUND");
  }

  return entry;
}

// ============================================================================
// 1. CPT MANAGEMENT
// ============================================================================

export async function listCustomPostTypes(websiteId: string, userId: string) {
  await assertCmsAccess(websiteId, userId, "VIEWER");

  const cpts = await prisma.customPostType.findMany({
    where: { websiteId },
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
      _count: {
        select: { entries: true, fields: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return cpts.map((cpt: any) => {
    let supportsData: any = {};
    if (cpt.supports) {
      if (typeof cpt.supports === "string") {
        try { supportsData = JSON.parse(cpt.supports); } catch (_) {}
      } else if (typeof cpt.supports === "object") {
        supportsData = cpt.supports;
      }
    }

    const formattedFields = (cpt.fields || []).map((f: any) => ({
      id: f.id,
      postTypeId: f.postTypeId,
      name: f.name,
      slug: f.slug,
      key: f.slug,
      type: f.type,
      order: f.order,
      required: Boolean(f.config?.required),
      options: f.config?.options || [],
      config: f.config || {},
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    return {
      id: cpt.id,
      websiteId: cpt.websiteId,
      name: cpt.name,
      slug: cpt.slug,
      description: cpt.description,
      singular: supportsData.singular || cpt.name,
      plural: supportsData.plural || `${cpt.name}s`,
      hasArchive: supportsData.hasArchive !== false,
      icon: supportsData.icon || "file-text",
      capabilities: supportsData.capabilities || ["title", "editor", "thumbnail"],
      supports: supportsData,
      fields: formattedFields,
      _count: cpt._count,
      createdAt: cpt.createdAt,
      updatedAt: cpt.updatedAt,
    };
  });
}

export async function createCustomPostType(
  websiteId: string,
  userId: string,
  payload: {
    name: string;
    slug?: string;
    description?: string;
    singular?: string;
    plural?: string;
    hasArchive?: boolean;
    icon?: string;
    capabilities?: string[];
  }
) {
  await assertCmsAccess(websiteId, userId, "ADMIN");

  const name = String(payload.name || "").trim();
  if (!name) {
    throw new AppError("Custom Post Type name is required", 400, "INVALID_INPUT");
  }

  const slug = slugify(payload.slug || name);
  if (!slug) {
    throw new AppError("Invalid CPT slug", 400, "INVALID_SLUG");
  }

  const existing = await prisma.customPostType.findFirst({
    where: { websiteId, slug },
  });
  if (existing) {
    throw new AppError(`A Custom Post Type with slug '${slug}' already exists for this website`, 409, "SLUG_CONFLICT");
  }

  const supports = {
    singular: payload.singular?.trim() || name,
    plural: payload.plural?.trim() || `${name}s`,
    hasArchive: payload.hasArchive !== false,
    icon: payload.icon || "file-text",
    capabilities: payload.capabilities || ["title", "editor", "thumbnail"],
  };

  const cpt = await prisma.customPostType.create({
    data: {
      websiteId,
      name,
      slug,
      description: payload.description?.trim() || null,
      supports: supports as any,
    },
    include: {
      fields: true,
      _count: { select: { entries: true, fields: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CPT_CREATED",
      targetResource: `cpt:${cpt.id}`,
      details: { websiteId, name, slug },
    },
  });

  return {
    ...cpt,
    singular: supports.singular,
    plural: supports.plural,
    hasArchive: supports.hasArchive,
    icon: supports.icon,
    capabilities: supports.capabilities,
  };
}

export async function updateCustomPostType(
  cptId: string,
  userId: string,
  payload: {
    name?: string;
    description?: string;
    singular?: string;
    plural?: string;
    hasArchive?: boolean;
    icon?: string;
    capabilities?: string[];
  }
) {
  const cpt = await assertCptBelongsToWebsite(cptId);
  await assertCmsAccess(cpt.websiteId, userId, "ADMIN");

  let existingSupports: any = {};
  if (cpt.supports) {
    if (typeof cpt.supports === "string") {
      try { existingSupports = JSON.parse(cpt.supports); } catch (_) {}
    } else if (typeof cpt.supports === "object") {
      existingSupports = cpt.supports;
    }
  }

  const updatedSupports = {
    ...existingSupports,
    singular: payload.singular !== undefined ? payload.singular.trim() : existingSupports.singular,
    plural: payload.plural !== undefined ? payload.plural.trim() : existingSupports.plural,
    hasArchive: payload.hasArchive !== undefined ? payload.hasArchive : existingSupports.hasArchive,
    icon: payload.icon !== undefined ? payload.icon : existingSupports.icon,
    capabilities: payload.capabilities !== undefined ? payload.capabilities : existingSupports.capabilities,
  };

  const updated = await prisma.customPostType.update({
    where: { id: cptId },
    data: {
      name: payload.name !== undefined ? payload.name.trim() : cpt.name,
      description: payload.description !== undefined ? payload.description?.trim() || null : cpt.description,
      supports: updatedSupports as any,
    },
    include: {
      fields: { orderBy: { order: "asc" } },
      _count: { select: { entries: true, fields: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CPT_UPDATED",
      targetResource: `cpt:${cptId}`,
      details: { websiteId: cpt.websiteId, updates: payload },
    },
  });

  return {
    ...updated,
    singular: updatedSupports.singular,
    plural: updatedSupports.plural,
    hasArchive: updatedSupports.hasArchive,
    icon: updatedSupports.icon,
    capabilities: updatedSupports.capabilities,
  };
}

export async function deleteCustomPostType(cptId: string, userId: string) {
  const cpt = await assertCptBelongsToWebsite(cptId);
  await assertCmsAccess(cpt.websiteId, userId, "ADMIN");

  await prisma.$transaction(async (tx) => {
    await tx.customField.deleteMany({ where: { postTypeId: cptId } });
    await tx.customEntry.deleteMany({ where: { postTypeId: cptId } });
    await tx.customPostType.delete({ where: { id: cptId } });
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CPT_DELETED",
      targetResource: `cpt:${cptId}`,
      details: { websiteId: cpt.websiteId, name: cpt.name, slug: cpt.slug },
    },
  });

  return { success: true, message: "Custom Post Type and related content deleted successfully." };
}

// ============================================================================
// 2. CUSTOM FIELDS (NON-DESTRUCTIVE RECONCILIATION)
// ============================================================================

export async function getCustomFields(cptId: string, userId?: string) {
  const cpt = await assertCptBelongsToWebsite(cptId);
  if (userId) {
    await assertCmsAccess(cpt.websiteId, userId, "VIEWER");
  }

  const fields = await prisma.customField.findMany({
    where: { postTypeId: cptId },
    orderBy: { order: "asc" },
  });

  return fields.map((f: any) => ({
    id: f.id,
    postTypeId: f.postTypeId,
    name: f.name,
    slug: f.slug,
    key: f.slug,
    type: f.type,
    order: f.order,
    required: Boolean(f.config?.required),
    options: f.config?.options || [],
    config: f.config || {},
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }));
}

export async function saveCustomFields(cptId: string, userId: string, fields: any[]) {
  const cpt = await assertCptBelongsToWebsite(cptId);
  await assertCmsAccess(cpt.websiteId, userId, "ADMIN");

  if (!Array.isArray(fields)) {
    throw new AppError("Fields must be an array", 400, "INVALID_INPUT");
  }

  // Validate duplicate slugs inside incoming payload
  const seenSlugs = new Set<string>();
  for (const f of fields) {
    const slug = fieldKeySlugify(f.slug || f.key || f.name);
    if (!slug) throw new AppError("Each field must have a valid name or key", 400, "INVALID_FIELD_SLUG");
    if (seenSlugs.has(slug)) {
      throw new AppError(`Duplicate field key/slug '${slug}' in request`, 409, "DUPLICATE_FIELD_KEY");
    }
    seenSlugs.add(slug);
  }

  // Non-destructive update: update existing fields by ID or slug, insert new ones, and remove deleted ones
  await prisma.$transaction(async (tx) => {
    const existingFields = await tx.customField.findMany({
      where: { postTypeId: cptId },
    });

    const existingById = new Map<string, any>(existingFields.map((f) => [f.id, f]));
    const existingBySlug = new Map<string, any>(existingFields.map((f) => [f.slug, f]));
    const keptFieldIds = new Set<string>();

    for (let idx = 0; idx < fields.length; idx++) {
      const f = fields[idx];
      const slug = fieldKeySlugify(f.slug || f.key || f.name);
      const name = String(f.name || slug).trim();
      const type = String(f.type || "text").toLowerCase();
      const config = {
        required: Boolean(f.required || f.config?.required),
        options: f.options || f.config?.options || [],
        ...(typeof f.config === "object" ? f.config : {}),
      };

      let matched = f.id ? existingById.get(f.id) : null;
      if (!matched && existingBySlug.has(slug)) {
        matched = existingBySlug.get(slug);
      }

      if (matched) {
        keptFieldIds.add(matched.id);
        await tx.customField.update({
          where: { id: matched.id },
          data: {
            name,
            slug,
            type,
            order: idx,
            config: config as any,
          },
        });
      } else {
        const created = await tx.customField.create({
          data: {
            postTypeId: cptId,
            name,
            slug,
            type,
            order: idx,
            config: config as any,
          },
        });
        keptFieldIds.add(created.id);
      }
    }

    // Delete fields that were explicitly omitted from the updated schema
    const idsToDelete = existingFields
      .filter((f) => !keptFieldIds.has(f.id))
      .map((f) => f.id);

    if (idsToDelete.length > 0) {
      await tx.customField.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CPT_FIELDS_SAVED",
      targetResource: `cpt:${cptId}`,
      details: { websiteId: cpt.websiteId, fieldCount: fields.length },
    },
  });

  return await getCustomFields(cptId);
}

// ============================================================================
// 3. CMS ENTRIES (CRUD, FILTERING, SORTING, DRAFT ISOLATION)
// ============================================================================

export interface ListEntriesOptions {
  status?: string;
  search?: string;
  sortBy?: "createdAt" | "updatedAt" | "title" | "slug";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  category?: string;
}

export async function listCustomEntries(
  cptId: string,
  userId?: string,
  options: ListEntriesOptions = {}
) {
  const cpt = await assertCptBelongsToWebsite(cptId);

  let isPrivileged = false;
  if (userId) {
    try {
      const { userPermission } = await assertCmsAccess(cpt.websiteId, userId, "VIEWER");
      if (["OWNER", "ADMIN", "CONTENT_EDITOR", "DESIGNER"].includes(userPermission)) {
        isPrivileged = true;
      }
    } catch (_) {
      isPrivileged = false;
    }
  }

  const whereClause: any = { postTypeId: cptId };

  // Status filtering & anonymous draft isolation
  if (isPrivileged && options.status && options.status.toUpperCase() !== "ALL") {
    whereClause.status = options.status.toUpperCase();
  } else if (!isPrivileged) {
    whereClause.status = "PUBLISHED";
  }

  // Search filter
  if (options.search && options.search.trim()) {
    const term = options.search.trim();
    whereClause.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
    ];
  }

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const skip = (page - 1) * limit;

  const validSortColumns = ["createdAt", "updatedAt", "title", "slug"];
  const sortBy = validSortColumns.includes(options.sortBy || "") ? options.sortBy! : "updatedAt";
  const order = options.order === "asc" ? "asc" : "desc";

  const [total, entries] = await Promise.all([
    prisma.customEntry.count({ where: whereClause }),
    prisma.customEntry.findMany({
      where: whereClause,
      include: {
        author: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
  ]);

  const formatted = entries.map((entry: any) => ({
    id: entry.id,
    postTypeId: entry.postTypeId,
    title: entry.title,
    slug: entry.slug,
    status: entry.status,
    data: entry.data || {},
    values: entry.data || {}, // backward compatibility contract
    authorId: entry.authorId,
    author: entry.author,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }));

  return {
    entries: formatted,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getCustomEntry(entryId: string, userId?: string) {
  const entry = await assertEntryBelongsToCpt(entryId);

  if (userId) {
    await assertCmsAccess(entry.postType.websiteId, userId, "VIEWER");
  } else if (entry.status !== "PUBLISHED") {
    throw new AppError("CMS Entry not found", 404, "ENTRY_NOT_FOUND");
  }

  return {
    id: entry.id,
    postTypeId: entry.postTypeId,
    title: entry.title,
    slug: entry.slug,
    status: entry.status,
    data: entry.data || {},
    values: entry.data || {},
    authorId: entry.authorId,
    author: entry.author,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export async function createCustomEntry(
  cptId: string,
  userId: string,
  payload: {
    title: string;
    slug?: string;
    status?: string;
    data?: any;
    values?: any;
  }
) {
  const cpt = await assertCptBelongsToWebsite(cptId);
  await assertCmsAccess(cpt.websiteId, userId, "CONTENT_EDITOR");

  const title = String(payload.title || "").trim();
  if (!title) {
    throw new AppError("Entry title is required", 400, "INVALID_INPUT");
  }

  let slug = slugify(payload.slug || title);
  if (!slug) {
    slug = `entry-${Date.now()}`;
  }

  // Check unique slug within CPT
  const existing = await prisma.customEntry.findFirst({
    where: { postTypeId: cptId, slug },
  });
  if (existing) {
    if (payload.slug) {
      throw new AppError(`Slug '${slug}' already exists in this post type`, 409, "SLUG_CONFLICT");
    }
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const status = (payload.status || "PUBLISHED").toUpperCase() === "DRAFT" ? "DRAFT" : "PUBLISHED";
  const entryData = payload.data || payload.values || {};

  const entry = await prisma.customEntry.create({
    data: {
      postTypeId: cptId,
      title,
      slug,
      status,
      data: entryData as any,
      authorId: userId,
    },
    include: {
      author: { select: { id: true, fullName: true, email: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CPT_ENTRY_CREATED",
      targetResource: `entry:${entry.id}`,
      details: { websiteId: cpt.websiteId, cptId, title, slug, status },
    },
  });

  return {
    ...entry,
    values: entry.data,
  };
}

export async function updateCustomEntry(
  entryId: string,
  userId: string,
  payload: {
    title?: string;
    slug?: string;
    status?: string;
    data?: any;
    values?: any;
  }
) {
  const entry = await assertEntryBelongsToCpt(entryId);
  await assertCmsAccess(entry.postType.websiteId, userId, "CONTENT_EDITOR");

  const title = payload.title !== undefined ? payload.title.trim() : entry.title;
  let slug = entry.slug;

  if (payload.slug !== undefined) {
    const candidate = slugify(payload.slug);
    if (!candidate) throw new AppError("Slug cannot be empty", 400, "INVALID_SLUG");

    if (candidate !== entry.slug) {
      const existing = await prisma.customEntry.findFirst({
        where: {
          postTypeId: entry.postTypeId,
          slug: candidate,
          id: { not: entryId },
        },
      });
      if (existing) {
        throw new AppError(`Slug '${candidate}' already exists in this post type`, 409, "SLUG_CONFLICT");
      }
      slug = candidate;
    }
  }

  const status = payload.status !== undefined
    ? (payload.status.toUpperCase() === "DRAFT" ? "DRAFT" : "PUBLISHED")
    : entry.status;

  const entryData = payload.data !== undefined || payload.values !== undefined
    ? (payload.data || payload.values || {})
    : entry.data;

  const updated = await prisma.customEntry.update({
    where: { id: entryId },
    data: {
      title,
      slug,
      status,
      data: entryData as any,
    },
    include: {
      author: { select: { id: true, fullName: true, email: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CPT_ENTRY_UPDATED",
      targetResource: `entry:${entryId}`,
      details: { websiteId: entry.postType.websiteId, cptId: entry.postTypeId, title, slug, status },
    },
  });

  return {
    ...updated,
    values: updated.data,
  };
}

export async function deleteCustomEntry(entryId: string, userId: string) {
  const entry = await assertEntryBelongsToCpt(entryId);
  await assertCmsAccess(entry.postType.websiteId, userId, "CONTENT_EDITOR");

  await prisma.customEntry.delete({ where: { id: entryId } });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CPT_ENTRY_DELETED",
      targetResource: `entry:${entryId}`,
      details: { websiteId: entry.postType.websiteId, cptId: entry.postTypeId, title: entry.title },
    },
  });

  return { success: true, message: "CMS Entry deleted successfully." };
}

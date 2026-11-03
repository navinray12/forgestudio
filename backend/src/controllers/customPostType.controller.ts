import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import { canUserAccessResource } from "../services/permission.service.js";
import { AppError } from "../utils/app-error.js";
import { z } from "zod";
import { typeInput, fieldsInput, entryInput, fieldValueError } from "../services/post-types-input.js";
import * as cptService from "../services/cpt.service.js";

const db = prisma as any;

const handle = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await fn(req, res);
  } catch (e: any) {
    if (e?.code === "P2025") next(new AppError("This content changed. Reload before trying again.", 409, "CONFLICT"));
    else if (e?.code === "P2002") next(new AppError("This slug already exists.", 409, "CONFLICT"));
    else if (e?.code === "P2021" || ["42P01", "42703"].includes(e?.meta?.code)) next(new AppError("Post type storage is temporarily unavailable.", 503, "UNAVAILABLE"));
    else next(e);
  }
};

function id(value: unknown) {
  if (!z.uuid().safeParse(value).success) throw new AppError("Invalid content identifier.", 400, "INVALID_REQUEST");
  return value as string;
}

function input(schema: z.ZodType, value: unknown): any {
  const p = schema.safeParse(value);
  if (!p.success) throw new AppError("Check the content fields and try again.", 400, "INVALID_REQUEST");
  return p.data;
}

async function permission(res: Response, websiteId: string, capability: string) {
  if (!await canUserAccessResource(res.locals.user.id, websiteId, "*", capability)) {
    throw new AppError("You do not have permission for this website content.", 403, "FORBIDDEN");
  }
}

async function type(req: Request, res: Response, capability: string) {
  const row = await db.customPostType.findUnique({ where: { id: id(req.params.cptId) } });
  if (!row) throw new AppError("Post type not found.", 404, "NOT_FOUND");
  await permission(res, row.websiteId, capability);
  return row;
}

async function entry(req: Request, res: Response, capability: string) {
  const row = await db.customEntry.findUnique({ where: { id: id(req.params.entryId) }, include: { postType: true } });
  if (!row) throw new AppError("Entry not found.", 404, "NOT_FOUND");
  await permission(res, row.postType.websiteId, capability);
  return row;
}

const lock = async (tx: any, cptId: string) => tx.$queryRaw`SELECT id FROM custom_post_types WHERE id=${cptId}::uuid FOR UPDATE`;

// ====== CPT Management ======

export const getCustomPostTypesHandler = handle(async (req, res) => {
  const websiteId = id(req.params.websiteId);
  await permission(res, websiteId, "VIEW");
  const rows = await db.customPostType.findMany({
    where: { websiteId },
    include: { _count: { select: { entries: true, fields: true } } },
    orderBy: { createdAt: "desc" },
  });
  const settings: any[] = await db.$queryRaw`SELECT s.* FROM dashboard_post_type_settings s JOIN custom_post_types p ON p.id=s."postTypeId" WHERE p."websiteId"=${websiteId}::uuid`;
  const mapped = new Map(settings.map((s: any) => [s.postTypeId, s]));
  res.json({
    success: true,
    data: rows.map((row: any) => ({
      ...row,
      singular: mapped.get(row.id)?.singular || row.name,
      plural: mapped.get(row.id)?.plural || row.name,
      hasArchive: mapped.get(row.id)?.hasArchive || false,
    })),
  });
});

export const createCustomPostTypeHandler = handle(async (req, res) => {
  const websiteId = id(req.params.websiteId);
  await permission(res, websiteId, "MANAGE_SETTINGS");
  const v = input(typeInput, req.body);
  const row = await db.$transaction(async (tx: any) => {
    const row = await tx.customPostType.create({
      data: { websiteId, name: v.name, slug: v.slug, description: v.description },
    });
    await tx.$executeRaw`INSERT INTO dashboard_post_type_settings ("postTypeId",singular,plural,"hasArchive") VALUES (${row.id}::uuid,${v.singular},${v.plural},${v.hasArchive})`;
    return row;
  });
  res.status(201).json({ success: true, data: { ...row, ...v } });
});

export const updateCustomPostTypeHandler = handle(async (req, res) => {
  const row = await type(req, res, "MANAGE_SETTINGS");
  const name = req.body.name !== undefined ? String(req.body.name).trim() : row.name;
  const description = req.body.description !== undefined ? String(req.body.description).trim() : row.description;
  const singular = req.body.singular !== undefined ? String(req.body.singular).trim() : row.name;
  const plural = req.body.plural !== undefined ? String(req.body.plural).trim() : row.name;
  const hasArchive = req.body.hasArchive !== undefined ? Boolean(req.body.hasArchive) : false;

  const updated = await db.$transaction(async (tx: any) => {
    await lock(tx, row.id);
    const updatedRow = await tx.customPostType.update({
      where: { id: row.id },
      data: { name, description },
    });
    await tx.$executeRaw`
      INSERT INTO dashboard_post_type_settings ("postTypeId", singular, plural, "hasArchive")
      VALUES (${row.id}::uuid, ${singular}, ${plural}, ${hasArchive})
      ON CONFLICT ("postTypeId") DO UPDATE
      SET singular = ${singular}, plural = ${plural}, "hasArchive" = ${hasArchive}
    `;
    return updatedRow;
  });
  res.status(200).json({ success: true, data: { ...updated, singular, plural, hasArchive } });
});

export const deleteCustomPostTypeHandler = handle(async (req, res) => {
  const row = await type(req, res, "DELETE");
  await permission(res, row.websiteId, "MANAGE_SETTINGS");
  if (await db.customEntry.count({ where: { postTypeId: row.id, status: "PUBLISHED" } })) {
    await permission(res, row.websiteId, "PUBLISH");
  }
  await db.customPostType.delete({ where: { id: row.id } });
  res.json({ success: true });
});

// ====== Custom Fields ======

export const getCustomFieldsHandler = handle(async (req, res) => {
  const row = await type(req, res, "VIEW");
  const fields = await db.customField.findMany({ where: { postTypeId: row.id }, orderBy: { order: "asc" } });
  res.json({
    success: true,
    updatedAt: row.updatedAt,
    data: fields.map((f: any) => ({
      ...f,
      key: f.slug,
      required: !!f.config?.required,
      options: f.config?.options || {},
    })),
  });
});

export const saveCustomFieldsHandler = handle(async (req, res) => {
  const row = await type(req, res, "MANAGE_SETTINGS");
  const v = input(fieldsInput, req.body);
  await db.$transaction(async (tx: any) => {
    await lock(tx, row.id);
    const current = await tx.customPostType.findUnique({ where: { id: row.id } });
    if (v.expectedUpdatedAt && new Date(v.expectedUpdatedAt).getTime() !== current.updatedAt.getTime()) {
      throw new AppError("Fields changed. Reload them before saving.", 409, "CONFLICT");
    }
    const existing = await tx.customField.findMany({ where: { postTypeId: row.id } });
    const entries = await tx.customEntry.findMany({ where: { postTypeId: row.id }, select: { data: true } });
    const kept = new Set<string>();

    for (const [order, f] of v.fields.entries()) {
      const old = f.id ? existing.find((o: any) => o.id === f.id) : existing.find((o: any) => o.slug === f.key);
      if (f.id && !old) throw new AppError("A field does not belong to this post type.", 400, "INVALID_REQUEST");
      if (old && kept.has(old.id)) throw new AppError("Duplicate field.", 400, "INVALID_REQUEST");
      if (old && (old.slug !== f.key || old.type !== f.type) && entries.some((e: any) => Object.hasOwn(e.data || {}, old.slug))) {
        throw new AppError("A field with stored entry values cannot change key or type.", 409, "CONFLICT");
      }
      const data = {
        name: f.name,
        slug: f.key,
        type: f.type,
        order,
        config: { ...(old?.config || {}), required: f.required, options: f.options || old?.config?.options || {} },
      };
      if (old) {
        await tx.customField.update({ where: { id: old.id }, data });
        kept.add(old.id);
      } else {
        const added = await tx.customField.create({ data: { ...data, postTypeId: row.id } });
        kept.add(added.id);
      }
    }
    for (const old of existing) {
      if (!kept.has(old.id)) {
        if (entries.some((e: any) => Object.hasOwn(e.data || {}, old.slug))) {
          throw new AppError("A field with stored entry values cannot be removed.", 409, "CONFLICT");
        }
        await tx.customField.delete({ where: { id: old.id } });
      }
    }
    await tx.customPostType.update({
      where: { id: row.id },
      data: { updatedAt: new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1)) },
    });
  });
  res.json({ success: true });
});

// ====== Custom Entries ======

export const getCustomEntriesHandler = handle(async (req, res) => {
  const row = await type(req, res, "VIEW");
  const { search, status, sortBy, order, page, limit } = req.query;

  const where: any = { postTypeId: row.id };
  if (status && String(status).toUpperCase() !== "ALL") {
    where.status = String(status).toUpperCase();
  }
  if (search && String(search).trim()) {
    const term = String(search).trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
    ];
  }

  const validSortColumns = ["createdAt", "updatedAt", "title", "slug"];
  const sortCol = validSortColumns.includes(String(sortBy || "")) ? String(sortBy) : "updatedAt";
  const sortOrder = order === "asc" ? "asc" : "desc";

  const isPaginated = page !== undefined || limit !== undefined;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const total = await db.customEntry.count({ where });
  const rows = await db.customEntry.findMany({
    where,
    include: { author: { select: { fullName: true, email: true } } },
    orderBy: { [sortCol]: sortOrder },
    ...(isPaginated ? { skip, take: limitNum } : {}),
  });

  const mapped = rows.map((e: any) => ({ ...e, values: e.data }));
  res.json({
    success: true,
    data: mapped,
    entries: mapped,
    pagination: {
      total,
      page: pageNum,
      limit: isPaginated ? limitNum : total,
      totalPages: isPaginated ? (Math.ceil(total / limitNum) || 1) : 1,
    },
  });
});

export const getCustomEntryHandler = handle(async (req, res) => {
  const row = await entry(req, res, "VIEW");
  res.status(200).json({ success: true, data: { ...row, values: row.data } });
});

export const createCustomEntryHandler = handle(async (req, res) => {
  const row = await type(req, res, "EDIT_CONTENT");
  const v = input(entryInput, req.body);
  if (v.status === "PUBLISHED") await permission(res, row.websiteId, "PUBLISH");
  const added = await db.$transaction(async (tx: any) => {
    await lock(tx, row.id);
    if (await tx.customEntry.findFirst({ where: { postTypeId: row.id, slug: v.slug } })) {
      throw new AppError("Entry slug already exists.", 409, "CONFLICT");
    }
    const fields = await tx.customField.findMany({ where: { postTypeId: row.id } });
    const error = fieldValueError(fields, v.values);
    if (error) throw new AppError(error, 400, "INVALID_REQUEST");
    return tx.customEntry.create({
      data: {
        postTypeId: row.id,
        title: v.title,
        slug: v.slug,
        status: v.status,
        data: v.values,
        authorId: res.locals.user.id,
      },
    });
  });
  res.status(201).json({ success: true, data: { ...added, values: added.data } });
});

export const updateCustomEntryHandler = handle(async (req, res) => {
  const row = await entry(req, res, "EDIT_CONTENT");
  const v = input(entryInput, { title: row.title, slug: row.slug, status: row.status, values: {}, ...req.body });
  if (row.status === "PUBLISHED" || v.status === "PUBLISHED") await permission(res, row.postType.websiteId, "PUBLISH");
  const updated = await db.$transaction(async (tx: any) => {
    await lock(tx, row.postTypeId);
    const current = await tx.customEntry.findUnique({ where: { id: row.id } });
    if (v.expectedUpdatedAt && new Date(v.expectedUpdatedAt).getTime() !== current.updatedAt.getTime()) {
      throw new AppError("Entry changed. Reload it before saving.", 409, "CONFLICT");
    }
    if (await tx.customEntry.findFirst({ where: { postTypeId: row.postTypeId, slug: v.slug, NOT: { id: row.id } } })) {
      throw new AppError("Entry slug already exists.", 409, "CONFLICT");
    }
    const values = { ...current.data, ...v.values };
    const fields = await tx.customField.findMany({ where: { postTypeId: row.postTypeId } });
    const error = fieldValueError(fields, values);
    if (error) throw new AppError(error, 400, "INVALID_REQUEST");
    return tx.customEntry.update({
      where: { id: row.id },
      data: {
        title: v.title,
        slug: v.slug,
        status: v.status,
        data: values,
        updatedAt: new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1)),
      },
    });
  });
  res.json({ success: true, data: { ...updated, values: updated.data } });
});

export const deleteCustomEntryHandler = handle(async (req, res) => {
  const row = await entry(req, res, "DELETE");
  if (row.status === "PUBLISHED") await permission(res, row.postType.websiteId, "PUBLISH");
  await db.customEntry.delete({ where: { id: row.id } });
  res.json({ success: true });
});

// ====== Public Anonymous CPT Entries ======

export async function getPublicEntriesByCptSlugHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.websiteId);
    const cptSlug = String(req.params.cptSlug);
    const { search, sortBy, order, page, limit } = req.query;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cptSlug);
    const targetCpt = await prisma.customPostType.findFirst({
      where: {
        websiteId,
        ...(isUuid ? { OR: [{ slug: cptSlug }, { id: cptSlug }] } : { slug: cptSlug }),
      },
    });

    if (!targetCpt) {
      return res.status(404).json({ success: false, error: { message: "Post type not found" } });
    }

    const result = await cptService.listCustomEntries(targetCpt.id, undefined, {
      status: "PUBLISHED",
      search: search ? String(search) : undefined,
      sortBy: sortBy as any,
      order: order as any,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result.entries,
      entries: result.entries,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (e) {
    next(e);
  }
}

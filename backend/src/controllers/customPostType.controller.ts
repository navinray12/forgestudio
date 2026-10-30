import type { Request, Response, NextFunction } from "express";
import * as cptService from "../services/cpt.service.js";
import { prisma } from "../config/prisma.js";

// ====== CPT Management ======

export async function getCustomPostTypesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = req.params.websiteId as string;
    const userId = res.locals.user?.id;
    const cpts = await cptService.listCustomPostTypes(websiteId, userId);
    res.status(200).json({ success: true, data: cpts });
  } catch (e) {
    next(e);
  }
}

export async function createCustomPostTypeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = req.params.websiteId as string;
    const userId = res.locals.user?.id;
    const cpt = await cptService.createCustomPostType(websiteId, userId, req.body);
    res.status(201).json({ success: true, data: cpt });
  } catch (e) {
    next(e);
  }
}

export async function updateCustomPostTypeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const cptId = req.params.cptId as string;
    const userId = res.locals.user?.id;
    const cpt = await cptService.updateCustomPostType(cptId, userId, req.body);
    res.status(200).json({ success: true, data: cpt });
  } catch (e) {
    next(e);
  }
}

export async function deleteCustomPostTypeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const cptId = req.params.cptId as string;
    const userId = res.locals.user?.id;
    const result = await cptService.deleteCustomPostType(cptId, userId);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

// ====== Custom Fields ======

export async function getCustomFieldsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const cptId = req.params.cptId as string;
    const userId = res.locals.user?.id;
    const fields = await cptService.getCustomFields(cptId, userId);
    res.status(200).json({ success: true, data: fields });
  } catch (e) {
    next(e);
  }
}

export async function saveCustomFieldsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const cptId = req.params.cptId as string;
    const userId = res.locals.user?.id;
    const fields = req.body.fields || req.body;
    const saved = await cptService.saveCustomFields(cptId, userId, fields);
    res.status(200).json({ success: true, data: saved });
  } catch (e) {
    next(e);
  }
}

// ====== Custom Entries ======

export async function getCustomEntriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const cptId = req.params.cptId as string;
    const userId = res.locals.user?.id;
    const { search, status, sortBy, order, page, limit } = req.query;

    const result = await cptService.listCustomEntries(cptId, userId, {
      search: search ? String(search) : undefined,
      status: status ? String(status) : undefined,
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

export async function getCustomEntryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const entryId = req.params.entryId as string;
    const userId = res.locals.user?.id;
    const entry = await cptService.getCustomEntry(entryId, userId);
    res.status(200).json({ success: true, data: entry });
  } catch (e) {
    next(e);
  }
}

export async function createCustomEntryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const cptId = req.params.cptId as string;
    const userId = res.locals.user?.id;
    const entry = await cptService.createCustomEntry(cptId, userId, req.body);
    res.status(201).json({ success: true, data: entry });
  } catch (e) {
    next(e);
  }
}

export async function updateCustomEntryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const entryId = req.params.entryId as string;
    const userId = res.locals.user?.id;
    const entry = await cptService.updateCustomEntry(entryId, userId, req.body);
    res.status(200).json({ success: true, data: entry });
  } catch (e) {
    next(e);
  }
}

export async function deleteCustomEntryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const entryId = req.params.entryId as string;
    const userId = res.locals.user?.id;
    const result = await cptService.deleteCustomEntry(entryId, userId);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

// Public entry query handler for anonymous frontends & published views
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

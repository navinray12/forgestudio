import { Router, type Request, type Response, type NextFunction } from "express";
import { pgPool } from "../config/prisma.js";
import { Database } from "../modules/studio-next/database.js";
import { uuid, parse, StudioError } from "../modules/studio-next/validation.js";
const accessDb = new Database(pgPool);
async function scopedCms(req: Request, res: Response, next: NextFunction) {
  try {
    let siteId = req.params.websiteId as string | undefined;
    if (!siteId && req.params.cptId) {
      const r = await pgPool.query('SELECT "websiteId" FROM public.custom_post_types WHERE id=$1', [parse(uuid, req.params.cptId)]);
      siteId = r.rows[0]?.websiteId;
    }
    if (!siteId && req.params.entryId) {
      const r = await pgPool.query('SELECT c."websiteId" FROM public.custom_entries e JOIN public.custom_post_types c ON c.id=e."postTypeId" WHERE e.id=$1', [parse(uuid, req.params.entryId)]);
      siteId = r.rows[0]?.websiteId;
    }
    if (!siteId) throw new StudioError('CMS resource not found', 404, 'NOT_FOUND');
    const capability = req.method === 'GET' ? 'VIEW' : req.path.includes('/entries') ? 'EDIT_CONTENT' : 'EDIT_DESIGN';
    await accessDb.tx(c => accessDb.site(c, res.locals.user, siteId!, capability));
    next();
  } catch (error) { if (error instanceof StudioError) { res.status(error.status).json({ success: false, error: { code: error.code, message: error.message } }); return; } next(error); }
}
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
    getCustomPostTypesHandler,
    createCustomPostTypeHandler,
    deleteCustomPostTypeHandler,
    getCustomFieldsHandler,
    saveCustomFieldsHandler,
    getCustomEntriesHandler,
    createCustomEntryHandler,
    updateCustomEntryHandler,
    deleteCustomEntryHandler
} from "../controllers/customPostType.controller.js";

const router = Router();

// Used behind /api/cpt nested structures
// Ex: /api/cpt/websites/:websiteId/types
router.get("/websites/:websiteId/types", requireAuth, scopedCms, getCustomPostTypesHandler);
router.post("/websites/:websiteId/types", requireAuth, scopedCms, createCustomPostTypeHandler);
router.delete("/types/:cptId", requireAuth, scopedCms, deleteCustomPostTypeHandler);

// Fields
router.get("/types/:cptId/fields", requireAuth, scopedCms, getCustomFieldsHandler);
router.post("/types/:cptId/fields", requireAuth, scopedCms, saveCustomFieldsHandler);

// Entries
router.get("/types/:cptId/entries", requireAuth, scopedCms, getCustomEntriesHandler);
router.post("/types/:cptId/entries", requireAuth, scopedCms, createCustomEntryHandler);
router.patch("/entries/:entryId", requireAuth, scopedCms, updateCustomEntryHandler);
router.delete("/entries/:entryId", requireAuth, scopedCms, deleteCustomEntryHandler);

export default router;

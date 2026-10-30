import { Router } from "express";
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
router.use(requireAuth);
router.use((req,res,next)=>{res.setHeader('Cache-Control','private, no-store');if(res.locals.user.status!=='ACTIVE'){res.status(403).json({message:'An active account is required.'});return;}if(req.method!=='GET'&&req.headers.origin&&req.headers.origin!==new URL(process.env.FRONTEND_URL||'http://localhost:5173').origin){res.status(403).json({message:'This request is not allowed.'});return;}if(['POST','PATCH'].includes(req.method)&&!req.is('application/json')){res.status(415).json({message:'JSON is required.'});return;}next();});

// Used behind /api/cpt nested structures
// Ex: /api/cpt/websites/:websiteId/types
router.get("/websites/:websiteId/types", getCustomPostTypesHandler);
router.post("/websites/:websiteId/types", createCustomPostTypeHandler);
router.delete("/types/:cptId", deleteCustomPostTypeHandler);

// Fields
router.get("/types/:cptId/fields", getCustomFieldsHandler);
router.post("/types/:cptId/fields", saveCustomFieldsHandler);

// Entries
router.get("/types/:cptId/entries", getCustomEntriesHandler);
router.post("/types/:cptId/entries", createCustomEntryHandler);
router.patch("/entries/:entryId", updateCustomEntryHandler);
router.delete("/entries/:entryId", deleteCustomEntryHandler);

export default router;

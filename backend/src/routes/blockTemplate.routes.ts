import { Router } from "express";
import {
  listBlockTemplatesHandler,
  createBlockTemplateHandler,
  updateBlockTemplateHandler,
  deleteBlockTemplateHandler,
  listTemplatePartsHandler,
  createTemplatePartHandler,
  getGlobalStylesHandler,
  saveGlobalStylesHandler,
} from "../controllers/blockTemplate.controller.js";

const router = Router();

// Block Templates (F-517)
router.get("/templates", listBlockTemplatesHandler);
router.post("/templates", createBlockTemplateHandler);
router.put("/templates/:id", updateBlockTemplateHandler);
router.delete("/templates/:id", deleteBlockTemplateHandler);

// Template Parts (F-518)
router.get("/template-parts", listTemplatePartsHandler);
router.post("/template-parts", createTemplatePartHandler);

// Global Styles (F-519)
router.get("/global-styles", getGlobalStylesHandler);
router.post("/global-styles", saveGlobalStylesHandler);

export default router;

import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  listThemeRulesHandler,
  createThemeRuleHandler,
  updateThemeRuleHandler,
  deleteThemeRuleHandler,
  evaluateThemeRuleHandler,
} from "../controllers/themeBuilder.controller.js";

const router = Router();

// /api/theme/websites/:websiteId/rules
router.get("/websites/:websiteId/rules", requireAuth, listThemeRulesHandler);
router.post("/websites/:websiteId/rules", requireAuth, createThemeRuleHandler);

// Single rule operations
router.put("/rules/:ruleId", requireAuth, updateThemeRuleHandler);
router.patch("/rules/:ruleId", requireAuth, updateThemeRuleHandler);
router.delete("/rules/:ruleId", requireAuth, deleteThemeRuleHandler);

// Condition evaluation (both authenticated editor preview & runtime)
router.post("/websites/:websiteId/evaluate", evaluateThemeRuleHandler);

export default router;

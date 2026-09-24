import { Router } from "express";
import {
  listPatterns,
  getPatternById,
  createPattern,
  updatePattern,
  deletePattern,
  detachSyncedPattern,
  resolveBindings,
  transformBlockEndpoint,
} from "../controllers/blockPattern.controller.js";

const router = Router();

router.get("/patterns", listPatterns);
router.get("/patterns/:id", getPatternById);
router.post("/patterns", createPattern);
router.put("/patterns/:id", updatePattern);
router.delete("/patterns/:id", deletePattern);
router.post("/patterns/:id/detach", detachSyncedPattern);
router.post("/bindings/resolve", resolveBindings);
router.post("/transform", transformBlockEndpoint);

export default router;

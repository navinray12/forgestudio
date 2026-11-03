import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { createDashboardUsageService } from "../services/dashboard-usage.service.js";
const input = z.object({ workspaceId: z.union([z.literal("personal"), z.uuid()]).default("personal"), range: z.enum(["current_cycle", "previous_cycle", "last_30_days", "custom"]).default("current_cycle"), start: z.iso.date().optional(), end: z.iso.date().optional() }).strict();
export function createDashboardUsageRouter(auth: RequestHandler, service: ReturnType<typeof createDashboardUsageService>) {
  const router = Router();
  router.get("/dashboard/usage", auth, async (req, res, next) => {
    const parsed = input.safeParse(req.query);
    if (!parsed.success || parsed.data.range === "custom" && (!parsed.data.start || !parsed.data.end)) { res.status(400).json({ message: "Choose a valid workspace and date range" }); return; }
    try { res.setHeader("Cache-Control", "private, no-store"); res.json(await service.read(res.locals.user.id, parsed.data)); } catch (error) { next(error); }
  });
  return router;
}

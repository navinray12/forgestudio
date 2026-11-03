import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { usageQuota, resolveUsagePeriod, createDashboardUsageService } from "../services/dashboard-usage.service.js";
import { createDashboardUsageRouter } from "../routes/dashboard-usage.routes.js";
import { errorMiddleware } from "../middlewares/error.middleware.js";

test("usage quotas preserve zero limits and clamp overages without NaN", () => {
  assert.deepEqual(usageQuota(0, 0), { used: 0, limit: 0, remaining: 0, percentage: 0, isLimitReached: true });
  assert.deepEqual(usageQuota(12, 10), { used: 12, limit: 10, remaining: 0, percentage: 100, isLimitReached: true });
  assert.equal(usageQuota(3, 50).percentage, 6);
  assert.equal(usageQuota(12, 0).percentage, 100);
});
test("usage periods respect recorded cycles, month length, UTC and inclusive custom end dates", () => {
  const now = new Date("2026-10-28T12:00:00Z");
  const sub = { currentPeriodStart: "2026-10-15T00:00:00Z", currentPeriodEnd: "2026-11-15T00:00:00Z", plan: { billingInterval: "monthly" } };
  let range = resolveUsagePeriod({ range: "previous_cycle" }, sub, now);
  assert.equal(range.start.toISOString(), "2026-09-15T00:00:00.000Z"); assert.equal(range.end.toISOString(), "2026-10-15T00:00:00.000Z");
  range = resolveUsagePeriod({ range: "current_cycle" }, sub, now); assert.equal(range.source, "subscription"); assert.equal(range.start.toISOString(), "2026-10-15T00:00:00.000Z");
  range = resolveUsagePeriod({ range: "custom", start: "2026-10-20", end: "2026-10-20" }, null, now);
  assert.equal(+range.end - +range.start, 86_400_000);
  range = resolveUsagePeriod({ range: "previous_cycle" }, null, new Date("2024-03-15T00:00:00Z")); assert.equal(+range.end - +range.start, 29 * 86_400_000);
  range = resolveUsagePeriod({ range: "last_30_days" }, null, now); assert.equal(+range.end - +range.start, 30 * 86_400_000);
  assert.throws(() => resolveUsagePeriod({ range: "custom", start: "2020-01-01", end: "2026-10-28" }, null, now), /366 days/);
  assert.throws(() => resolveUsagePeriod({ range: "custom", start: "2026-10-28", end: "2026-10-20" }, null, now), /valid date range/);
});
test("usage report does not invent default capacity and excludes expired licenses", async () => {
  let fail = false;
  const db: any = {
    user: { findUnique: async () => ({ status: "ACTIVE", optimizationCredits: 0 }) }, userSubscription: { findUnique: async () => null },
    subscriptionPlan: { findUnique: async () => ({ name: "No credits", slug: "free", websiteLimit: 0, storageLimitMb: 0, aiCreditLimit: 0 }) },
    website: { count: async () => 0 }, mediaAsset: { aggregate: async () => ({ _sum: { sizeBytes: null } }) }, mediaOptimizationAsset: { aggregate: async () => ({ _sum: { optimizedBytes: null } }) }, optimizationCreditLedger: { count: async () => 0 },
    license: { findMany: async () => [{ status: "ACTIVE", expiresAt: new Date("2020-01-01"), activations: [{ isLocalhost: false }] }, { status: "REVOKED", activations: [{ isLocalhost: false }] }] },
    $queryRaw: async () => { if (fail) throw Object.assign(new Error("Missing usage table"), { code: "P2010", meta: { code: "42P01" } }); return []; },
  };
  const dashboard: any = { listDashboardSites: async () => [], listDashboardWorkspaces: async () => ({ workspaces: [], personalSiteCount: 0 }) };
  const service = createDashboardUsageService(db, dashboard, () => new Date("2026-10-28T00:00:00Z"));
  const result = await service.read("owner", { workspaceId: "personal", range: "current_cycle" });
  assert.equal(result.quotas.storage.limitMb, 0); assert.equal(result.quotas.websites.limit, 0); assert.equal(result.quotas.aiCredits.limit, 0);
  assert.equal(result.quotas.aiCredits.remainingPercentage, 0); assert.equal(result.quotas.licenses.production, 0); assert.equal(result.billing.resetAt, null);
  assert.equal(result.activity.daily.length, 31); assert.equal(result.activity.usedCredits, 0);
  fail = true; await assert.rejects(service.read("owner", { workspaceId: "personal", range: "current_cycle" }), (error: any) => error.statusCode === 503 && error.code === "USAGE_STORAGE_NOT_READY");
});
test("usage route requires auth, rejects invalid scope/ranges and remains read only", async () => {
  const calls: any[] = []; const app = express();
  app.use(createDashboardUsageRouter((req, res, next) => { if (!req.headers.authorization) { res.sendStatus(401); return; } res.locals.user = { id: "owner" }; next(); }, { read: async (...args: any[]) => { calls.push(args); return { success: true } as any; } }));
  app.get("/public-probe", (_req, res) => { res.json({ public: true }); }); app.use(errorMiddleware);
  const server = app.listen(0, "127.0.0.1"); await new Promise<void>(resolve => server.once("listening", resolve)); const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const request = (path: string) => fetch(base + path, { headers: { authorization: "session" } });
  try {
    assert.equal((await fetch(base + "/public-probe")).status, 200); assert.equal((await fetch(base + "/dashboard/usage")).status, 401);
    for (const query of ["workspaceId=bad", "range=bad", "range=custom", "range=custom&start=2026-02-30&end=2026-03-01", "userId=other"]) assert.equal((await request(`/dashboard/usage?${query}`)).status, 400);
    assert.equal(calls.length, 0);
    const response = await request("/dashboard/usage?workspaceId=personal&range=last_30_days"); assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(calls[0], ["owner", { workspaceId: "personal", range: "last_30_days" }]);
    assert.equal((await fetch(base + "/dashboard/usage", { method: "POST", headers: { authorization: "session" } })).status, 404);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createWorkspaceDashboardRouter } from "../routes/workspace-dashboard.routes.js";
import { createWorkspaceDashboardServices } from "../services/workspace-dashboard.service.js";
import { mapDashboardWorkspaces } from "../services/dashboard.service.js";
import { errorMiddleware } from "../middlewares/error.middleware.js";

test("workspace commands authenticate and validate input without intercepting unrelated/public endpoints", async () => {
  const calls: any[] = []; const id = "f0000000-0000-4000-8000-000000000001";
  const service = { list: async (...args: any[]) => { calls.push(args); return { workspaces: [], personalSiteCount: 0 }; },
    create: async (...args: any[]) => { calls.push(args); return { id }; }, rename: async (...args: any[]) => { calls.push(args); return { id }; } };
  const app = express(); app.use(express.json());
  app.use(createWorkspaceDashboardRouter((req, res, next) => { if (!req.headers.authorization) { res.sendStatus(401); return; } res.locals.user = { id: "actor" }; next(); }, service));
  app.get("/public-probe", (_req, res) => { res.json({ public: true }); }); app.use(errorMiddleware);
  const server = app.listen(0, "127.0.0.1"); await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const request = (path: string, body?: any, method = body ? "POST" : "GET", extra = {}) => fetch(base + path, { method, headers: { authorization: "session", "content-type": "application/json", "X-Forge-Intent": "workspace-command", "Idempotency-Key": id, ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
  try {
    assert.equal((await fetch(base + "/public-probe")).status, 200);
    assert.equal((await fetch(base + "/dashboard/workspaces")).status, 401);
    assert.equal((await request("/dashboard/workspaces")).status, 200);
    assert.deepEqual(calls.pop(), ["actor"]);
    for (const body of [{ name: " ", workspaceType: "STANDARD" }, { name: "Test", workspaceType: "INVALID" }, { name: "Test", workspaceType: "STANDARD", ownerId: id }]) assert.equal((await request("/dashboard/workspaces", body)).status, 400);
    assert.equal((await request("/dashboard/workspaces", { name: "Test", workspaceType: "STANDARD" }, "POST", { "X-Forge-Intent": "" })).status, 403);
    assert.equal((await request("/dashboard/workspaces", { name: "Test", workspaceType: "STANDARD" }, "POST", { "Idempotency-Key": "bad" })).status, 400);
    assert.equal(calls.length, 0);
    assert.equal((await request("/dashboard/workspaces", { name: "  Team  ", workspaceType: "DEVELOPER" })).status, 201);
    assert.deepEqual(calls.pop(), ["actor", "Team", "DEVELOPER", id]);
    assert.equal((await request(`/dashboard/workspaces/${id}`, { name: "Renamed" }, "PATCH")).status, 400);
    assert.equal((await request(`/dashboard/workspaces/${id}`, { name: "  Renamed  ", expectedUpdatedAt: "2026-10-28T00:00:00.000Z" }, "PATCH")).status, 200);
    assert.deepEqual(calls.pop(), ["actor", id, "Renamed", "2026-10-28T00:00:00.000Z"]);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("workspace renaming enforces permission/revision and preserves settings", async () => {
  const row: any = { id: "workspace", ownerId: "owner", name: "Team", settings: { locale: "en", timeZone: "Asia/Calcutta", workspaceType: "DEVELOPER" }, lifecycleStatus: "ACTIVE", updatedAt: new Date("2026-10-28T00:00:00.000Z") };
  let membership: any = { role: "OWNER" }; let status = "ACTIVE"; const audits: any[] = [];
  const db: any = { $transaction: async (run: any) => run(db), $queryRaw: async () => [], user: { findUnique: async () => ({ status }) },
    workspaceMember: { findUnique: async () => membership }, workspace: { findUnique: async () => row, update: async ({ data }: any) => Object.assign(row, data) }, auditLog: { create: async (data: any) => audits.push(data) } };
  const service = createWorkspaceDashboardServices(db, async () => ({ workspaces: [], personalSiteCount: 0 }));
  const revision = row.updatedAt.toISOString();
  membership = null; await assert.rejects(service.rename("owner", "workspace", "Name", revision), (error: any) => error.statusCode === 404);
  membership = { role: "MEMBER" }; await assert.rejects(service.rename("owner", "workspace", "Name", revision), (error: any) => error.statusCode === 403);
  membership = { role: "OWNER" }; await assert.rejects(service.rename("outsider", "workspace", "Name", revision), (error: any) => error.statusCode === 403);
  row.lifecycleStatus = "ARCHIVED"; await assert.rejects(service.rename("owner", "workspace", "Name", revision), (error: any) => error.statusCode === 409);
  row.lifecycleStatus = "ACTIVE"; status = "SUSPENDED"; await assert.rejects(service.rename("owner", "workspace", "Name", revision), (error: any) => error.code === "ACCOUNT_INACTIVE"); status = "ACTIVE";
  await service.rename("owner", "workspace", "Developer lab", revision);
  assert.deepEqual(row.settings, { locale: "en", timeZone: "Asia/Calcutta", workspaceType: "DEVELOPER", dashboardName: "Developer lab" });
  assert.equal(row.name, "Developer lab"); assert.equal(audits.length, 1);
  await assert.rejects(service.rename("owner", "workspace", "Stale name", revision), (error: any) => error.code === "WORKSPACE_CHANGED");
  membership = { role: "ADMIN" }; await service.rename("admin", "workspace", "Admin rename", row.updatedAt.toISOString());
  assert.equal(row.name, "Admin rename");
});

test("personal alias grouping honors saved display names and developer type", () => {
  const rows: any[] = [{ id: "primary", name: "Renamed", slug: "personal-ws-owner", ownerId: "owner", owner: { fullName: "Owner" }, _count: { members: 1 }, settings: { dashboardName: "Custom workspace", workspaceType: "DEVELOPER" }, members: [{ role: "OWNER" }] }, { id: "legacy", name: "Legacy", slug: "personal-default-owner", ownerId: "owner", owner: { fullName: "Owner" }, _count: { members: 1 } }];
  const list = mapDashboardWorkspaces(rows, "owner");
  assert.equal(list.length, 1); assert.equal(list[0].name, "Custom workspace"); assert.equal(list[0].workspaceType, "DEVELOPER"); assert.deepEqual(list[0].aliases, ["primary", "legacy"]);
});

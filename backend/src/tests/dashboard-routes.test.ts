import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
const basicWorkspace = ({ workspaceType, userRole, lifecycleStatus, updatedAt, ...workspace }: any) => workspace;
import { createDashboardRouter } from "../routes/dashboard.routes.js";

test("Dashboard routes enforce authentication, validate scope and preserve service errors", async () => {
  const calls: unknown[][] = [];
  const workspaceId = "f0000000-0000-4000-8000-000000000001";
  const app = express(); app.use(express.json());
  app.use("/api", createDashboardRouter({
    requireAuth: (req, res, next) => { if (req.headers.authorization !== "test-session") { res.sendStatus(401); return; } res.locals.user = { id: "current-user" }; next(); },
    listWorkspaces: async id => { calls.push(["workspaces", id]); return { workspaces: [{ id: workspaceId, name: "Design" }], personalSiteCount: 0 }; },
    listSites: async (id, scope) => { calls.push(["sites", id, scope]); if (scope === workspaceId) throw Object.assign(new Error("Access denied"), { statusCode: 404 }); return [{ id: "site-1" }]; },
    createSite: async (...args) => { calls.push(["create", ...args]); return { id: "new-site" }; },
    updateProfile: async (...args) => { calls.push(["profile", ...args]); return { fullName: args[1] }; },
  }));
  app.get("/api/public-probe", (_req, res) => { res.json({ public: true }); });
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.statusCode || 500).json({ message: error.message }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/api`;
  const request = (path: string, body?: unknown, method = "POST") => fetch(base + path, { method: body === undefined ? "GET" : method, headers: { authorization: "test-session", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  try {
    assert.equal((await fetch(base + "/public-probe")).status, 200);
    assert.equal((await fetch(base + "/workspaces")).status, 401);
    assert.equal((await fetch(base + "/dashboard/sites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Example", workspaceId: "personal" }) })).status, 401);
    assert.equal((await request("/workspaces")).status, 200);
    assert.equal((await request("/dashboard/sites")).status, 200);
    assert.deepEqual(calls.at(-1), ["sites", "current-user", "personal"]);
    const count = calls.length;
    assert.equal((await request("/dashboard/sites?workspaceId=invalid")).status, 400);
    assert.equal((await request("/dashboard/sites", { name: " ", workspaceId: "personal" })).status, 400);
    assert.equal(calls.length, count);
    assert.equal((await request(`/dashboard/sites?workspaceId=${workspaceId}`)).status, 404);
    assert.equal((await request("/dashboard/sites", { name: "  New site  ", workspaceId })).status, 201);
    assert.deepEqual(calls.at(-1), ["create", "current-user", "New site", workspaceId]);
    assert.equal((await request("/auth/profile", { fullName: "Alice", role: "ADMIN" }, "PATCH")).status, 400);
    assert.equal((await request("/auth/profile", { fullName: "  Alice  " }, "PATCH")).status, 200);
    assert.deepEqual(calls.at(-1), ["profile", "current-user", "Alice"]);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});


test("Workspace isolation preserves editor permissions and blocks unauthorized creation", async () => {
  const { createDashboardServices } = await import("../services/dashboard.service.js");
  let membership: { role: string } | null = null;
  let query: any;
  let workspaceQuery: any;
  let created: any;
  const services = createDashboardServices({
    workspaceMember: { findUnique: async () => membership },
    workspace: { findMany: async (input: any) => { workspaceQuery = input; return [{ id: "workspace", name: "Design", slug: "design", ownerId: "alice", owner: { fullName: "Alice" }, _count: { members: 1 } }]; } },
    website: { count: async () => 0, findMany: async (input: any) => { query = input; return []; } },
  }, async options => { created = options; return options; });
  const workspaceList = await services.listDashboardWorkspaces("alice");
  assert.deepEqual({ ...workspaceList, workspaces: workspaceList.workspaces.map(basicWorkspace) }, { workspaces: [{ id: "workspace", name: "Design", aliases: ["workspace"] }], personalSiteCount: 0 });
  assert.deepEqual(workspaceQuery, { where: { members: { some: { userId: "alice" } } }, select: { id: true, name: true, slug: true, ownerId: true, settings: true, updatedAt: true, lifecycleStatus: true, members: { where: { userId: "alice" }, select: { role: true } }, owner: { select: { fullName: true } }, _count: { select: { members: true } } }, orderBy: { name: "asc" } });
  await assert.rejects(services.listDashboardSites("alice", "other-workspace"), /access denied/);
  await assert.rejects(services.createDashboardSite("alice", "Site", "other-workspace"), /access denied/);
  assert.equal(created, undefined);
  membership = { role: "MEMBER" };
  await assert.rejects(services.createDashboardSite("alice", "Site", "workspace"), /read only/);
  await services.listDashboardSites("alice", "workspace");
  assert.deepEqual(query.where, { archivedAt: null, workspaceId: "workspace", OR: [{ userId: "alice" }, { collaborators: { some: { userId: "alice" } } }] });
  await services.listDashboardSites("alice", "personal");
  assert.equal(query.where.workspaceId, null);
  membership = { role: "OWNER" };
  await services.createDashboardSite("alice", "Site", "workspace");
  assert.deepEqual(created, { userId: "alice", name: "Site", workspaceId: "workspace" });
  await services.createDashboardSite("alice", "Personal site", "personal");
  assert.equal((created as any).workspaceId, null);
});

test("Personal workspace mapping keeps one owner workspace and all site scopes", async () => {
  const { createDashboardServices, mapDashboardWorkspaces } = await import("../services/dashboard.service.js");
  const owner = "owner";
  const rows = [
    { id: "legacy", name: "Personal websites", slug: "personal-default-owner", ownerId: owner, owner: { fullName: "Ashwani" }, _count: { members: 1 } },
    { id: "primary", name: "Personal workspace", slug: "personal-ws-owner", ownerId: owner, owner: { fullName: "Ashwani" }, _count: { members: 1 } },
    { id: "team", name: "Client work", slug: "client-work", ownerId: owner, owner: { fullName: "Ashwani" }, _count: { members: 2 } },
  ];
  let query: any;
  let created: any;
  const service = createDashboardServices({
    workspace: { findMany: async () => rows },
    workspaceMember: { findUnique: async () => ({ role: "OWNER" }) },
    website: { count: async () => 0, findMany: async (input: any) => { query = input; return []; } },
  }, async input => { created = input; return input; });
  const list = await service.listDashboardWorkspaces(owner);
  assert.deepEqual(list.workspaces.map(basicWorkspace), [
    { id: "primary", name: "Ashwani's Workspace", aliases: ["legacy", "primary"] },
    { id: "team", name: "Client work", aliases: ["team"] },
  ]);
  await service.listDashboardSites(owner, "primary");
  assert.deepEqual(query.where.workspaceId, { in: ["legacy", "primary"] });
  await service.createDashboardSite(owner, "New", "legacy");
  assert.equal(created.workspaceId, "primary");
  assert.equal(mapDashboardWorkspaces([{ ...rows[0], _count: { members: 2 } }, rows[1]], owner).length, 2);
  assert.equal(mapDashboardWorkspaces([rows[0], { ...rows[1], _count: { members: 2 } }], owner).length, 1);
});

test("Members detail exposes the actual workspace owner name", async () => {
  const { createWorkspaceMembersService } = await import("../services/workspace-members.service.js");
  const db: any = {
    $transaction: async (run: (tx: any) => Promise<unknown>) => run(db),
    user: { findUnique: async () => ({ id: "owner", status: "ACTIVE" }) },
    workspace: { findUnique: async () => ({ id: "workspace", ownerId: "owner", owner: { id: "owner", fullName: "Ashwani" }, membersVersion: 1, lifecycleStatus: "ACTIVE" }) },
    workspaceMember: { findUnique: async () => ({ userId: "owner", role: "OWNER" }), findMany: async () => [] },
  };
  const details = await createWorkspaceMembersService(db, () => {}).read("owner", "workspace");
  assert.equal(details.owner.fullName, "Ashwani");
});

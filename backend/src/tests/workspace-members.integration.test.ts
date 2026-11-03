import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import express from "express";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { createWorkspaceMembersService } from "../services/workspace-members.service.js";
import { createWorkspaceMembersRouter } from "../routes/workspace-members.routes.js";
import { createInvitationDispatcher } from "../services/workspace-invitation-delivery.js";
import { invitationToken, invitationTokenHash } from "../services/workspace-invitation-token.js";
import { errorMiddleware } from "../middlewares/error.middleware.js";
import { AppError } from "../utils/app-error.js";

const url = process.env.WORKSPACE_TEST_DATABASE_URL;
test("Workspace Members API, delivery and acceptance against isolated PostgreSQL", { skip: !url }, async t => {
  const schema = `forge_members_test_${randomUUID().replaceAll("-", "")}`;
  assert.match(schema, /^forge_members_test_[a-f0-9]{32}$/);
  const admin = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
  let pool: pg.Pool | undefined; let db: PrismaClient | undefined;
  let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;
  const oldKey = process.env.WORKSPACE_INVITATION_TOKEN_KEY, oldOrigin = process.env.FRONTEND_URL;
  process.env.WORKSPACE_INVITATION_TOKEN_KEY = "a".repeat(64); process.env.FRONTEND_URL = "http://localhost:5173";
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}`, max: 8 });
    await pool.query(`
      CREATE TABLE users (id UUID PRIMARY KEY, "fullName" TEXT, email TEXT UNIQUE, status TEXT NOT NULL DEFAULT 'ACTIVE', "emailVerified" BOOLEAN NOT NULL DEFAULT true);
      CREATE TABLE workspaces (id UUID PRIMARY KEY, "organizationId" UUID, name VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL, "ownerId" UUID NOT NULL REFERENCES users(id), settings JSONB DEFAULT '{}', "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now());
      CREATE TABLE workspace_members (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "workspaceId" UUID NOT NULL REFERENCES workspaces(id), "userId" UUID NOT NULL REFERENCES users(id), role VARCHAR(50) NOT NULL DEFAULT 'MEMBER', "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE("workspaceId","userId"));
      CREATE TABLE audit_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID REFERENCES users(id), action TEXT NOT NULL, "targetResource" TEXT NOT NULL, details JSONB, "ipAddress" TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
    `);
    const migration = await readFile("prisma/migrations/20261026190000_workspace_members_email_invites/migration.sql", "utf8");
    await pool.query(migration);
    db = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
    const client = db;
    const owner = randomUUID(), adminId = randomUUID(), member = randomUUID(), outsider = randomUUID(), workspace = randomUUID();
    for (const [id, name, email] of [[owner, "Owner", "owner@example.com"], [adminId, "Admin", "admin@example.com"], [member, "Member", "member@example.com"], [outsider, "Outsider", "outsider@example.com"]])
      await pool.query('INSERT INTO users(id,"fullName",email) VALUES ($1,$2,$3)', [id,name,email]);
    await pool.query('INSERT INTO workspaces(id,name,slug,"ownerId") VALUES ($1,$2,$3,$4)', [workspace,"Design Team","design-team",owner]);
    for (const [id, role] of [[owner,"OWNER"],[adminId,"ADMIN"],[member,"MEMBER"]]) await pool.query('INSERT INTO workspace_members("workspaceId","userId",role) VALUES ($1,$2,$3)', [workspace,id,role]);
    const service = createWorkspaceMembersService(client, () => {});
    const app = express(); app.use(express.json());
    app.use("/api/v1/tenant-workspaces", createWorkspaceMembersRouter(async (req,res,next) => {
      const actor = req.headers["x-test-actor"];
      if (typeof actor !== "string") { res.sendStatus(401); return; }
      res.locals.user = { id: actor, status: "ACTIVE" }; next();
    }, service, async () => { throw new Error("Not used"); }));
    app.use(errorMiddleware);
    server = app.listen(0,"127.0.0.1");
    await new Promise<void>(resolve => server!.once("listening",resolve));
    const port = (server.address() as {port:number}).port;
    async function request(actor: string | null, path: string, method = "GET", body?: unknown, etag?: string, key = randomUUID()) {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/tenant-workspaces${path}`, { method, headers: {
        ...(actor ? {"x-test-actor":actor} : {}), "Content-Type":"application/json", "X-Forge-Intent":"workspace-command", "Idempotency-Key":key, ...(etag ? {"If-Match":etag} : {}),
      }, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await response.json().catch(()=>null); return {status:response.status,data};
    }
    await t.test("authentication, workspace isolation and owner-only admin invitation", async () => {
      assert.equal((await request(null, "")).status,401);
      assert.equal((await request(outsider,`/${workspace}`)).status,404);
      assert.equal((await request(member,`/${workspace}/invitations`,"POST",{email:"new@example.com",role:"MEMBER"})).status,403);
      assert.equal((await request(adminId,`/${workspace}/invitations`,"POST",{email:"new@example.com",role:"ADMIN"})).status,403);
      assert.equal((await request(owner,`/${workspace}/invitations`,"POST",{email:"new@example.com",role:"OWNER"})).status,400);
    });
    let invitation: any; const key = randomUUID();
    await t.test("invite unknown email, idempotency, duplicate prevention and no premature membership", async () => {
      const result = await request(owner,`/${workspace}/invitations`,"POST",{email:" NewUser@Example.com ",role:"ADMIN"},undefined,key);
      assert.equal(result.status,201); invitation=result.data.invitation;
      assert.equal(invitation.invitedEmail,"newuser@example.com"); assert.equal(invitation.emailStatus,"QUEUED");
      assert.equal(invitation.tokenHash,undefined); assert.equal(invitation.token,undefined);
      const replay=await request(owner,`/${workspace}/invitations`,"POST",{email:"newuser@example.com",role:"ADMIN"},undefined,key);
      assert.equal(replay.data.invitation.id,invitation.id);
      assert.equal((await request(owner,`/${workspace}/invitations`,"POST",{email:"newuser@example.com",role:"MEMBER"})).status,409);
      assert.equal(await client.workspaceMember.count({where:{workspaceId:workspace}}),3);
    });
    const messages: Array<{to:string;text:string;messageId:string}> = [];
    await t.test("durable delivery, SMTP failure retry and no invitation secret at rest", async () => {
      const dispatchFail=createInvitationDispatcher(client,async()=>{throw new Error("SMTP provider detail must not leak");});
      assert.equal(await dispatchFail(),true);
      const failed=await client.workspaceEmailInvitation.findUniqueOrThrow({where:{id:invitation.id}});
      assert.equal(failed.emailStatus,"QUEUED");assert.equal(failed.emailAttempts,1);assert.ok(failed.nextAttemptAt>new Date());
      await client.workspaceEmailInvitation.update({where:{id:invitation.id},data:{nextAttemptAt:new Date(Date.now()-1000)}});
      const dispatch=createInvitationDispatcher(client,async message=>{messages.push(message);});
      assert.equal(await dispatch(),true);assert.equal(await dispatch(),false);
      assert.equal(messages[0].to,"newuser@example.com");assert.match(messages[0].text,/#token=[\w-]{43}/);
      const stored=await client.workspaceEmailInvitation.findUniqueOrThrow({where:{id:invitation.id}});
      assert.equal(stored.emailStatus,"SENT");assert.equal(stored.tokenHash,invitationTokenHash(invitationToken(invitation.id,1)));
      assert.ok(!JSON.stringify(stored).includes(invitationToken(invitation.id,1)));
    });
    const newUser=randomUUID();
    await t.test("signup identity, verified recipient binding, acceptance and Active membership", async () => {
      await pool!.query('INSERT INTO users(id,"fullName",email,"emailVerified") VALUES ($1,$2,$3,false)',[newUser,"New User","NEWUSER@example.com"]);
      const token=invitationToken(invitation.id,1);
      assert.equal((await request(newUser,`/invitations/${invitation.id}/resolve`,"POST",{token})).data.error.code,"VERIFIED_IDENTITY_REQUIRED");
      await pool!.query('UPDATE users SET "emailVerified"=true WHERE id=$1',[newUser]);
      assert.equal((await request(outsider,`/invitations/${invitation.id}/resolve`,"POST",{token})).status,404);
      assert.equal((await request(newUser,`/invitations/${invitation.id}/resolve`,"POST",{token:"x".repeat(43)})).status,404);
      assert.equal((await request(newUser,`/invitations/${invitation.id}/resolve`,"POST",{token})).data.invitation.workspaceName,"Design Team");
      const results=await Promise.all([1,2].map(()=>request(newUser,`/${workspace}/invitations/${invitation.id}/accept`,"POST",{token})));
      assert.ok(results.every(result=>result.status===200));
      const row=await client.workspaceMember.findUniqueOrThrow({where:{workspaceId_userId:{workspaceId:workspace,userId:newUser}}});
      assert.equal(row.role,"ADMIN");assert.equal(await client.workspaceMember.count({where:{workspaceId:workspace,userId:newUser}}),1);
      const details=(await request(owner,`/${workspace}`)).data.workspace;
      assert.equal(details.owner.fullName,"Owner");
      assert.equal(details.members.find((item:any)=>item.userId===newUser).membershipStatus,"ACTIVE");
      assert.equal((await request(newUser,`/${workspace}/invitations/${invitation.id}/accept`,"POST",{token})).status,200);
    });
    await t.test("role changes, stale version rejection and owner protection", async () => {
      const details=(await request(owner,`/${workspace}`)).data.workspace;
      assert.equal((await request(adminId,`/${workspace}/member-role`,"PATCH",{userId:member,role:"ADMIN"},`"${workspace}:${details.version}"`)).status,403);
      assert.equal((await request(owner,`/${workspace}/member-role`,"PATCH",{userId:owner,role:"MEMBER"},`"${workspace}:${details.version}"`)).status,403);
      assert.equal((await request(owner,`/${workspace}/member-role`,"PATCH",{userId:member,role:"ADMIN"},`"${workspace}:${details.version}"`)).status,200);
      assert.equal((await request(owner,`/${workspace}/member-role`,"PATCH",{userId:member,role:"MEMBER"},`"${workspace}:${details.version}"`)).status,412);
    });
    await t.test("resend rotates proof, cooldown, revoke and issuer authority revalidation", async () => {
      const result=await request(owner,`/${workspace}/invitations`,"POST",{email:"outsider@example.com",role:"MEMBER"});const item=result.data.invitation;
      assert.equal((await request(owner,`/${workspace}/invitations/${item.id}/renew`,"POST",{},`"${item.id}:1"`)).status,429);
      await client.workspaceEmailInvitation.update({where:{id:item.id},data:{emailQueuedAt:new Date(Date.now()-61_000)}});
      const renewKey=randomUUID();
      assert.equal((await request(owner,`/${workspace}/invitations/${item.id}/renew`,"POST",{},`"${item.id}:1"`,renewKey)).status,200);
      assert.equal((await request(owner,`/${workspace}/invitations/${item.id}/renew`,"POST",{},`"${item.id}:1"`,renewKey)).status,200);
      assert.equal((await request(outsider,`/${workspace}/invitations/${item.id}/accept`,"POST",{token:invitationToken(item.id,1)})).status,404);
      assert.equal((await request(owner,`/${workspace}/invitations/${item.id}/revoke`,"POST",{},`"${item.id}:1"`)).status,412);
      assert.equal((await request(owner,`/${workspace}/invitations/${item.id}/revoke`,"POST",{},`"${item.id}:2"`)).status,200);
      assert.equal((await request(outsider,`/${workspace}/invitations/${item.id}/accept`,"POST",{token:invitationToken(item.id,2)})).status,409);
      const another=(await request(adminId,`/${workspace}/invitations`,"POST",{email:"outsider@example.com",role:"MEMBER"})).data.invitation;
      await client.workspaceMember.update({where:{workspaceId_userId:{workspaceId:workspace,userId:adminId}},data:{role:"MEMBER"}});
      assert.equal((await request(outsider,`/${workspace}/invitations/${another.id}/accept`,"POST",{token:invitationToken(another.id,1)})).status,403);
      assert.equal(await client.workspaceMember.count({where:{workspaceId:workspace,userId:outsider}}),0);
    });
    await t.test("concurrent invitation requests, worker leases and delivery fencing", async () => {
      const results = await Promise.all([1,2].map(() => service.invite(owner,workspace,"parallel@example.com","MEMBER",randomUUID()).then(value=>({ok:true,value})).catch(error=>({ok:false,error}))));
      assert.equal(results.filter(result=>result.ok).length,1);
      const row = await client.workspaceEmailInvitation.findFirstOrThrow({where:{workspaceId:workspace,invitedEmail:"parallel@example.com"}});
      // Isolate this queued job from earlier fixtures.
      await client.workspaceEmailInvitation.updateMany({where:{id:{not:row.id},emailStatus:"QUEUED"},data:{nextAttemptAt:new Date(Date.now()+3600_000)}});
      let sends=0;
      const dispatch=createInvitationDispatcher(client,async()=>{sends++;await new Promise(resolve=>setTimeout(resolve,50));});
      await Promise.all([dispatch(),dispatch()]);assert.equal(sends,1);
      const replacement=await service.invite(owner,workspace,"fenced@example.com","MEMBER",randomUUID());
      const fenced=createInvitationDispatcher(client,async()=>{
        await service.changeInvitation(owner,workspace,replacement.invitation.id,"REVOKE",1,randomUUID());
      });
      assert.equal(await fenced(),true);
      const revoked=await client.workspaceEmailInvitation.findUniqueOrThrow({where:{id:replacement.invitation.id}});
      assert.equal(revoked.status,"REVOKED");assert.notEqual(revoked.emailStatus,"SENT");
      const terminal=await service.invite(owner,workspace,"terminal@example.com","MEMBER",randomUUID());
      await client.workspaceEmailInvitation.update({where:{id:terminal.invitation.id},data:{emailAttempts:7}});
      await createInvitationDispatcher(client,async()=>{throw new Error("SMTP failed");})();
      assert.equal((await client.workspaceEmailInvitation.findUniqueOrThrow({where:{id:terminal.invitation.id}})).emailStatus,"FAILED");
    });
    await t.test("archived workspaces are read only and pending invitations can still be revoked", async () => {
      const item=await service.invite(owner,workspace,"archived@example.com","MEMBER",randomUUID());
      const recipientId=randomUUID();await pool!.query('INSERT INTO users(id,email) VALUES ($1,$2)',[recipientId,"archived@example.com"]);
      await client.workspace.update({where:{id:workspace},data:{lifecycleStatus:"ARCHIVED"}});
      assert.equal((await service.read(owner,workspace)).lifecycleStatus,"ARCHIVED");
      await assert.rejects(service.invite(owner,workspace,"another@example.com","MEMBER",randomUUID()),/read only/);
      await assert.rejects(service.accept(recipientId,workspace,item.invitation.id,invitationToken(item.invitation.id,1)),/read only/);
      assert.equal((await service.changeInvitation(owner,workspace,item.invitation.id,"REVOKE",1,randomUUID())).success,true);
      await client.workspace.update({where:{id:workspace},data:{lifecycleStatus:"ACTIVE"}});
    });
    await t.test("expiration and transaction rollback on audit failure", async () => {
      const item=await service.invite(owner,workspace,"expired@example.com","MEMBER",randomUUID());
      const expiredId=randomUUID();await pool!.query('INSERT INTO users(id,email) VALUES ($1,$2)',[expiredId,"expired@example.com"]);
      await client.workspaceEmailInvitation.update({where:{id:item.invitation.id},data:{expiresAt:new Date(Date.now()-1000)}});
      await assert.rejects(service.accept(expiredId,workspace,item.invitation.id,invitationToken(item.invitation.id,1)),/expired/);
      const previous=await client.workspaceEmailInvitation.count();
      await pool!.query("ALTER TABLE audit_logs ADD CONSTRAINT reject_invitation_audit CHECK (action <> 'WORKSPACE_INVITATION_CREATED') NOT VALID");
      await assert.rejects(service.invite(owner,workspace,"rollback@example.com","MEMBER",randomUUID()));
      assert.equal(await client.workspaceEmailInvitation.count(),previous);
      await pool!.query('ALTER TABLE audit_logs DROP CONSTRAINT reject_invitation_audit');
      const unavailable=createWorkspaceMembersService(client,()=>{throw new AppError("SMTP missing",503,"INVITATION_DELIVERY_UNAVAILABLE");});
      await assert.rejects(unavailable.invite(owner,workspace,"blocked@example.com","MEMBER",randomUUID()),/SMTP missing/);
      assert.equal(await client.workspaceEmailInvitation.count(),previous);
    });
  } finally {
    if (server) { server.closeAllConnections(); await new Promise<void>(resolve=>server!.close(()=>resolve())); }
    await db?.$disconnect(); await pool?.end();
    // Only the uniquely named test schema created above is ever removed.
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await admin.end();
    if(oldKey===undefined)delete process.env.WORKSPACE_INVITATION_TOKEN_KEY;else process.env.WORKSPACE_INVITATION_TOKEN_KEY=oldKey;
    if(oldOrigin===undefined)delete process.env.FRONTEND_URL;else process.env.FRONTEND_URL=oldOrigin;
  }
});

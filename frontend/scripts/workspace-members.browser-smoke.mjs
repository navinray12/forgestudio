// Run with Vite on FORGE_SMOKE_URL and a disposable Chrome profile on CHROME_DEBUG_URL.
// API responses and OTPs are mocked; no email is sent and no live account is created.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.env.FORGE_SMOKE_URL || "http://127.0.0.1:5178";
const debug = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9226";
const output = process.env.FORGE_SMOKE_ARTIFACTS || ".integration-review/phase2-browser-artifacts";
await mkdir(output, { recursive: true });
const targets = await (await fetch(`${debug}/json`)).json();
const socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
let sequence = 0; const pending = new Map(); const exceptions = []; const unexpected = []; const requests = [];
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
const owner = { id: randomUUID(), fullName: "Alex Owner", email: "owner@example.com", role: "USER", status: "ACTIVE", emailVerified: true };
const newcomer = { id: randomUUID(), fullName: "New Member", email: "newuser@example.com", role: "USER", status: "ACTIVE", emailVerified: true };
const returning = { id: randomUUID(), fullName: "Returning Member", email: "returning@example.com", role: "USER", status: "ACTIVE", emailVerified: true };
let actor = owner, loginActor = newcomer;
const workspace = { id: randomUUID(), name: "Design Team", slug: "design-team", ownerId: owner.id, version: 1, lifecycleStatus: "ACTIVE", organizationId: null };
const members = [{ id: randomUUID(), userId: owner.id, role: "OWNER", membershipStatus: "ACTIVE", createdAt: new Date().toISOString(), user: owner }];
const invitations = []; const emails = [];
const role = () => members.find(item => item.userId === actor?.id)?.role || "MEMBER";
const token = invitation => (invitation.version === 1 ? "a" : "b").repeat(43);
const detail = () => ({ ...workspace, userRole: role(), members, websites: [], hasMoreWebsites: false });
function response(request) {
  const url = new URL(request.url); const path = url.pathname; const body = request.postData ? JSON.parse(request.postData) : {};
  requests.push({ path, method: request.method });
  if (request.method === "OPTIONS") return [200, {}];
  if (path.endsWith("/auth/me")) return actor ? [200, { success: true, data: { user: actor } }] : [401, { success: false }];
  if (path.endsWith("/auth/logout")) { actor = null; return [200, { success: true }]; }
  if (path.endsWith("/auth/signup")) { assert.equal(body.identifier, newcomer.email); return [200, { requireOtp: true, data: { userId: newcomer.id, email: newcomer.email } }]; }
  if (path.endsWith("/auth/signup/verify-otp")) { assert.equal(body.otp, "123456"); actor = newcomer; return [200, { success: true }]; }
  if (path.endsWith("/auth/login")) { assert.equal(body.identifier, loginActor.email); return [200, { requireOtp: true, data: { userId: loginActor.id, email: loginActor.email } }]; }
  if (path.endsWith("/auth/login/verify-otp")) { assert.equal(body.otp, "123456"); actor = loginActor; return [200, { success: true }]; }
  if (path === "/api/v1/workspaces") return [200, { workspaces: actor && members.some(item => item.userId === actor.id) ? [workspace] : [] }];
  if (path === "/api/dashboard/sites") return [200, { websites: [] }];
  const base = "/api/v1/tenant-workspaces";
  if (path === base) return [200, { workspaces: actor && members.some(item => item.userId === actor.id) ? [{ ...workspace, userRole: role() }] : [] }];
  if (path === `${base}/${workspace.id}`) return [200, { workspace: detail() }];
  if (path === `${base}/${workspace.id}/member-role`) { const row = members.find(item => item.userId === body.userId); row.role = body.role; workspace.version++; return [200, { success: true }]; }
  if (path === `${base}/${workspace.id}/invitations`) {
    if (request.method === "GET") return [200, { invitations }];
    const item = { id: randomUUID(), workspaceId: workspace.id, recipientUserId: null, invitedEmail: body.email, role: body.role, status: "PENDING", version: 1,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), emailStatus: "SENT", emailQueuedAt: new Date(Date.now() - 61000).toISOString(), emailSentAt: new Date().toISOString() };
    invitations.push(item); emails.push({ to: item.invitedEmail, link: `${origin}/workspace-invitations/${item.id}#token=${token(item)}` });
    return [201, { success: true, invitation: item }];
  }
  const id = path.split("/invitations/")[1]?.split("/")[0];
  const invitation = invitations.find(item => item.id === id);
  if (invitation) {
    if (path.endsWith("/renew")) { invitation.version++; emails.push({ to: invitation.invitedEmail, link: `${origin}/workspace-invitations/${id}#token=${token(invitation)}` }); return [200, { success: true }]; }
    if (path.endsWith("/revoke")) { invitation.status = "REVOKED"; invitation.version++; return [200, { success: true }]; }
    if (!actor || actor.email !== invitation.invitedEmail || body.token !== token(invitation)) return [404, { error: { code: "NOT_FOUND", message: "Wrong account or invalid link" } }];
    if (invitation.status !== "PENDING") return [409, { error: { code: "INVITATION_UNAVAILABLE", message: "Invitation unavailable" } }];
    if (path.endsWith("/resolve")) return [200, { invitation: { ...invitation, workspaceName: workspace.name } }];
    if (path.endsWith("/accept")) {
      invitation.status = "ACCEPTED"; invitation.recipientUserId = actor.id;
      members.push({ id: randomUUID(), userId: actor.id, role: invitation.role, membershipStatus: "ACTIVE", createdAt: new Date().toISOString(), user: actor }); workspace.version++;
      return [200, { accepted: true, resourceId: workspace.id, invitationId: id }];
    }
  }
  unexpected.push(path); return [500, { message: `Unexpected test API ${path}` }];
}
socket.addEventListener("message", async event => {
  const message = JSON.parse(event.data);
  if (message.id) { const task = pending.get(message.id); pending.delete(message.id); message.error ? task.reject(message.error) : task.resolve(message.result); return; }
  if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.text);
  if (message.method !== "Fetch.requestPaused") return;
  const { requestId, request } = message.params;
  let status, data;
  try { [status, data] = response(request); } catch (error) { exceptions.push(error.message); status = 500; data = { message: error.message }; }
  await send("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [
    { name: "Content-Type", value: "application/json" }, { name: "Access-Control-Allow-Origin", value: origin },
    { name: "Access-Control-Allow-Credentials", value: "true" }, { name: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,OPTIONS" },
    { name: "Access-Control-Allow-Headers", value: "Content-Type,X-Forge-Intent,Idempotency-Key,If-Match" },
  ], body: Buffer.from(JSON.stringify(data)).toString("base64") }).catch(() => {});
});
const evaluate = async expression => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
async function until(expression) { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 150)); } throw new Error(`Timeout: ${expression}`); }
const click = text => evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === ${JSON.stringify(text)} && !button.disabled)?.click()`);
const fill = (selector, value) => evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
async function screenshot(name) { const value = await send("Page.captureScreenshot", { format: "png" }); await writeFile(`${output}/${name}.png`, Buffer.from(value.data, "base64")); }
async function invite(email) {
  await until(`Array.from(document.querySelectorAll('button')).some(button=>button.textContent.trim()==='Invite member' && !button.disabled)`);
  await click("Invite member"); await until(`!!document.querySelector('[aria-label="Email address"]')`);
  await fill('[aria-label="Email address"]', email); await click("Send invite");
  await until(`!document.querySelector('.members-modal') && document.body.innerText.includes(${JSON.stringify(email)})`);
}
try {
  await send("Runtime.enable"); await send("Page.enable"); await send("Fetch.enable", { patterns: [{ urlPattern: "*localhost:5000/*" }] });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${origin}/dashboard` }); await until(`!!document.querySelector('.studio-brand')`);
  await evaluate(`localStorage.clear(); sessionStorage.clear()`);
  await send("Page.navigate", { url: `${origin}/dashboard/workspaces/${workspace.id}` });
  await until(`!!document.querySelector('.member-row')`);
  assert.equal(await evaluate(`document.querySelector('.studio-brand').textContent`), "web studio");
  await invite(newcomer.email); assert.equal(members.length, 1);
  assert.ok(await evaluate(`document.body.innerText.includes('Pending') && document.body.innerText.includes('Email sent')`));
  await evaluate(`document.querySelector('[aria-label="Resend invitation to ${newcomer.email}"]').click()`);
  await until(`document.body.innerText.includes('Invitation email queued again.')`);
  assert.equal(invitations[0].version, 2);
  await evaluate(`document.querySelector('[aria-label="Revoke invitation to ${newcomer.email}"]').click()`);
  await until(`document.body.innerText.includes('Invitation revoked.')`);
  await invite(newcomer.email); const newLink = emails.at(-1).link;
  await screenshot("members-owner-desktop");
  actor = null; await send("Page.navigate", { url: newLink });
  await until(`document.body.innerText.includes('Create an account')`);
  assert.equal(await evaluate("location.hash"), "");
  await click("Create an account"); await until(`location.pathname === '/signup' && !!document.querySelector('#fullName')`);
  assert.ok(await evaluate(`location.search.includes('workspaceInvite=') && !location.href.includes('token=')`));
  await fill("#fullName", newcomer.fullName); await fill("#identifier", newcomer.email); await fill("#password", "test-only-password"); await fill("#confirmPassword", "test-only-password");
  await evaluate("document.querySelector('form').requestSubmit()"); await until(`!!document.querySelector('#otpCode')`);
  await fill("#otpCode", "123456"); await evaluate("document.querySelector('form').requestSubmit()");
  await until(`document.body.innerText.includes('Accept invitation')`); await click("Accept invitation");
  await until(`location.pathname.includes('/dashboard/workspaces/') && !!document.querySelector('.member-row')`);
  assert.ok(await evaluate(`Array.from(document.querySelectorAll('.member-row')).some(row=>row.innerText.includes('${newcomer.fullName}') && row.innerText.includes('Active'))`));
  assert.equal(await evaluate(`!!document.querySelector('[aria-label="Role for ${newcomer.fullName}"]')`),false);
  actor = owner; await send("Page.navigate", { url: `${origin}/dashboard/workspaces/${workspace.id}` }); await until(`!!document.querySelector('[aria-label="Role for ${newcomer.fullName}"]')`);
  await evaluate(`(()=>{const select=document.querySelector('[aria-label="Role for ${newcomer.fullName}"]');select.value='ADMIN';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(`document.body.innerText.includes('Member role updated.')`);
  assert.equal(members.find(item=>item.userId===newcomer.id).role,"ADMIN");
  await invite(returning.email); const existingLink=emails.at(-1).link;
  actor=null; loginActor=returning; await send("Page.navigate",{url:existingLink}); await until(`document.body.innerText.includes('Create an account')`);
  await click("Sign in"); await until(`location.pathname==='/login' && !!document.querySelector('#identifier')`);
  await fill("#identifier",returning.email);await fill("#password","test-only-password");await evaluate("document.querySelector('form').requestSubmit()");await until(`!!document.querySelector('#otpCode')`);
  await fill("#otpCode","123456");await evaluate("document.querySelector('form').requestSubmit()");await until(`document.body.innerText.includes('Accept invitation')`);await click("Accept invitation");
  await until(`!!document.querySelector('.member-row') && document.body.innerText.includes('${returning.fullName}')`);
  await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate("document.documentElement.scrollWidth <= 390"),true);
  await until(`document.querySelector('.studio-sidebar').getBoundingClientRect().right <= 1`);
  await screenshot("members-active-mobile");
  assert.deepEqual(exceptions,[]);assert.deepEqual(unexpected,[]);
  const summary={passed:["Phase 1 shell retained","Members invite and pending delivery UI","Resend","Revoke","No membership before acceptance","Email fragment capture","Signup and OTP return to invitation","Existing login and OTP return to invitation","Accept to Active membership","Owner role change","Member cannot change roles","Mobile no horizontal overflow","No runtime exceptions"],mockEmailCount:emails.length,requestCount:requests.length};
  await writeFile(`${output}/results.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
} finally { await send("Browser.close").catch(()=>{});socket.close(); }

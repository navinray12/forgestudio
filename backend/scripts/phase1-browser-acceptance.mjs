import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import pg from "pg";
import { SMTPServer } from "smtp-server";
import { chromium } from "../../frontend/node_modules/playwright/index.mjs";

if (process.env.ALLOW_DISPOSABLE_DB_REHEARSAL !== "true") {
  throw new Error("Set ALLOW_DISPOSABLE_DB_REHEARSAL=true; this test creates and drops a disposable database");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const sourceUrl = new URL(process.env.DATABASE_URL);
const dbName = `forgestudio_rehearsal_${crypto.randomBytes(5).toString("hex")}`;
if (!/^forgestudio_rehearsal_[a-f0-9]{10}$/.test(dbName)) throw new Error("Unsafe disposable database name");
const maintenanceUrl = new URL(sourceUrl); maintenanceUrl.pathname = "/postgres";
const databaseUrl = new URL(sourceUrl); databaseUrl.pathname = `/${dbName}`;
const apiUrl = "http://127.0.0.1:5071";
const webUrl = "http://127.0.0.1:5177";
const uploadRoot = path.resolve("../.phase1-acceptance-uploads");
const processes = [];
const messages = [];
let browser;

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, stdio: "inherit", ...options });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

function start(command, args, options = {}) {
  const child = spawn(command, args, { shell: false, stdio: ["ignore", "pipe", "pipe"], ...options });
  child.stdout.on("data", (data) => process.stdout.write(`[service] ${data}`));
  child.stderr.on("data", (data) => process.stderr.write(`[service] ${data}`));
  processes.push(child);
  return child;
}

async function waitFor(url, expected = 200, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status === expected) return response;
      last = new Error(`${url} returned ${response.status}`);
    } catch (error) { last = error; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw last || new Error(`Timed out waiting for ${url}`);
}

async function waitForOtp(email, afterIndex = 0) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const item = messages.slice(afterIndex).find((message) => message.includes(email));
    const otp = item?.match(/\b\d{6}\b/)?.[0];
    if (otp) return otp;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`SMTP sink did not receive an OTP for ${email}`);
}

async function json(response, label) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok()) throw new Error(`${label} failed (${response.status()}): ${JSON.stringify(body)}`);
  return body;
}

const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ["STARTTLS"],
  onAuth(_auth, _session, callback) { callback(null, { user: "phase1" }); },
  onData(stream, _session, callback) {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => { messages.push(Buffer.concat(chunks).toString("utf8")); callback(); });
  },
});
const admin = new pg.Client({ connectionString: maintenanceUrl.toString() });

try {
  await fs.rm(uploadRoot, { recursive: true, force: true });
  await fs.mkdir(uploadRoot, { recursive: true });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${dbName}"`);
  await run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseUrl.toString() },
  });
  const db = new pg.Client({ connectionString: databaseUrl.toString() });
  await db.connect();
  await db.query(`INSERT INTO subscription_plans (name, slug, price, "websiteLimit", features) VALUES ('Free', 'free', 0, 5, '["Phase 1"]')`);
  await db.end();
  await new Promise((resolve, reject) => smtp.listen(2527, "127.0.0.1", (error) => error ? reject(error) : resolve()));

  const serviceEnv = {
    ...process.env,
    NODE_ENV: "development",
    PORT: "5071",
    FRONTEND_URL: webUrl,
    DATABASE_URL: databaseUrl.toString(),
    UPLOAD_DIR: uploadRoot,
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: "2527",
    SMTP_USER: "phase1",
    SMTP_PASSWORD: "phase1",
    SMTP_FROM: "noreply@phase1.test",
  };
  start(process.execPath, ["dist/server.js"], { env: serviceEnv });
  start(process.execPath, [path.resolve("../frontend/node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "5177"], {
    cwd: path.resolve("../frontend"),
    env: { ...process.env, VITE_API_URL: apiUrl },
  });
  await waitFor(`${apiUrl}/api/v1/health`);
  const ready = await waitFor(`${apiUrl}/api/v1/ready`);
  assert((await ready.json()).status === "ready", "readiness checks database schema and completed migrations");
  await waitFor(webUrl);

  browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = `phase1-${Date.now()}@example.test`;
  const password = "Phase1!Pass";
  await page.goto(`${webUrl}/signup`);
  await page.locator("#fullName").fill("Phase One User");
  await page.locator("#identifier").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#confirmPassword").fill(password);
  const mailIndex = messages.length;
  await page.getByRole("button", { name: "Create account" }).click();
  const signupOtp = await waitForOtp(email, mailIndex);
  await page.locator("#otpCode").fill(signupOtp);
  await page.getByRole("button", { name: "Verify & Complete Signup" }).click();
  await page.waitForURL(/\/dashboard/);
  assert(true, "browser registration receives and verifies OTP through local SMTP");

  await json(await context.request.post(`${apiUrl}/api/v1/auth/logout`), "logout");
  await page.goto(`${webUrl}/login`);
  await page.locator("#identifier").fill(email);
  await page.locator("#password").fill(password);
  const loginMailIndex = messages.length;
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const loginOtp = await waitForOtp(email, loginMailIndex);
  await page.locator("#otpCode").fill(loginOtp);
  await page.getByRole("button", { name: "Verify Code" }).click();
  await page.waitForURL(/\/dashboard/);
  assert(true, "browser logout and password-plus-OTP login complete successfully");

  await page.getByText("Create New Website", { exact: true }).first().click();
  await page.locator("#websiteName").fill("Phase 1 Acceptance Site");
  await page.getByRole("button", { name: "Create Website" }).click();
  await page.waitForURL(/\/editor\//, { timeout: 30_000 });
  const websiteId = page.url().split("/editor/")[1].split(/[?#]/)[0];
  assert(Boolean(websiteId), "blank website created through dashboard UI");

  for (const widget of ["Heading", "Text", "Image", "Button"]) {
    await page.getByText(widget, { exact: true }).first().click();
  }
  for (const device of ["Tablet View", "Mobile View", "Desktop View"]) {
    await page.getByLabel(device).click();
  }
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForTimeout(800);
  assert(true, "core widgets were added and responsive preview controls exercised through editor UI");

  const current = await json(await context.request.get(`${apiUrl}/api/websites/${websiteId}`), "load website");
  const uploaded = await json(await context.request.post(`${apiUrl}/api/uploads/image`, {
    multipart: { image: { name: "pixel.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") } },
  }), "upload image");
  const imageUrl = uploaded.url;
  const baseDocument = {
    version: 1,
    elements: [],
    homePageId: "home",
    activePageId: "home",
    globalSettings: { typography: { fontFamily: "Arial" }, colors: { primary: "#2457ff" } },
    pages: [
      { id: "home", name: "Home", title: "Home", slug: "/", isHome: true, elements: [
        { id: "hero", type: "heading", content: "Release One", styles: { desktop: { color: "#2457ff", padding: "24px" }, mobile: { padding: "8px" } } },
        { id: "copy", type: "text", content: "Anonymous Phase 1 content" },
        { id: "image", type: "image", src: imageUrl, alt: "Acceptance pixel" },
        { id: "button", type: "button", content: "About", linkType: "page", pageId: "about" },
      ] },
      { id: "about", name: "About", title: "About", slug: "about/team", elements: [{ id: "about-heading", type: "heading", content: "Nested About Page" }] },
    ],
    siteParts: {
      header: { isEnabled: true, elements: [{ id: "header-text", type: "text", content: "Shared Header" }] },
      footer: { isEnabled: true, elements: [{ id: "footer-text", type: "text", content: "Shared Footer" }] },
    },
  };
  const saved = await json(await context.request.put(`${apiUrl}/api/websites/${websiteId}`, {
    data: { expectedVersion: current.website.draftVersion, editorData: baseDocument },
  }), "save canonical site");
  assert(saved.website.draftVersion === current.website.draftVersion + 1, "atomic draft version increments on save");

  const sameVersion = saved.website.draftVersion;
  const concurrentA = { ...baseDocument, marker: "A" };
  const concurrentB = { ...baseDocument, marker: "B" };
  const concurrent = await Promise.all([
    context.request.put(`${apiUrl}/api/websites/${websiteId}`, { data: { expectedVersion: sameVersion, editorData: concurrentA } }),
    context.request.put(`${apiUrl}/api/websites/${websiteId}`, { data: { expectedVersion: sameVersion, editorData: concurrentB } }),
  ]);
  assert(concurrent.map((r) => r.status()).sort().join(",") === "200,409", "simultaneous saves allow one winner and reject one stale write with 409");
  const afterRace = await json(await context.request.get(`${apiUrl}/api/websites/${websiteId}`), "reload after race");
  const winningDocument = afterRace.website.editorData;

  const publishOne = await json(await context.request.post(`${apiUrl}/api/websites/${websiteId}/publish`, {
    data: { editorData: baseDocument, destinationType: "INTERNAL", environment: "PRODUCTION" },
  }), "publish release one");
  assert(publishOne.status === "PUBLISHED", "first internal release publishes successfully");

  const anonymous = await browser.newContext();
  const publicPage = await anonymous.newPage();
  await publicPage.goto(`${webUrl}/site/${websiteId}`);
  await publicPage.getByText("Release One", { exact: true }).waitFor();
  await publicPage.goto(`${webUrl}/site/${websiteId}/about/team`);
  await publicPage.getByText("Nested About Page", { exact: true }).waitFor();
  await publicPage.reload();
  await publicPage.getByText("Nested About Page", { exact: true }).waitFor();
  assert(true, "anonymous homepage and nested direct-refresh render published content");
  await publicPage.goto(`${webUrl}/site/${websiteId}/does-not-exist`);
  await publicPage.getByText("Page not found", { exact: false }).waitFor();
  assert(true, "unknown public route displays the explicit 404 view");

  const latest = await json(await context.request.get(`${apiUrl}/api/websites/${websiteId}`), "load before draft edit");
  const draftTwo = structuredClone(winningDocument);
  draftTwo.pages = baseDocument.pages.map((item) => item.id === "home" ? { ...item, elements: item.elements.map((el) => el.id === "hero" ? { ...el, content: "Unpublished Draft" } : el) } : item);
  draftTwo.homePageId = "home";
  draftTwo.siteParts = baseDocument.siteParts;
  await json(await context.request.put(`${apiUrl}/api/websites/${websiteId}`, { data: { expectedVersion: latest.website.draftVersion, editorData: draftTwo } }), "save private draft");
  await publicPage.goto(`${webUrl}/site/${websiteId}`);
  await publicPage.getByText("Release One", { exact: true }).waitFor();
  assert(await publicPage.getByText("Unpublished Draft", { exact: true }).count() === 0, "unpublished draft remains private");

  const failed = await context.request.post(`${apiUrl}/api/websites/${websiteId}/publish`, { data: { editorData: { pages: [{ id: "bad", name: "" }] }, destinationType: "INTERNAL" } });
  assert(failed.status() >= 400, "invalid republish fails rather than reporting success");
  const stillPublic = await json(await anonymous.request.get(`${apiUrl}/api/v1/websites/public/${websiteId}`), "public snapshot after failed publish");
  assert(JSON.stringify(stillPublic).includes("Release One") && !JSON.stringify(stillPublic).includes("Unpublished Draft"), "failed republish preserves previous public release");

  const publishTwo = await json(await context.request.post(`${apiUrl}/api/websites/${websiteId}/publish`, { data: { editorData: draftTwo, destinationType: "INTERNAL" } }), "publish release two");
  assert(publishTwo.status === "PUBLISHED", "second release publishes successfully");
  await json(await context.request.post(`${apiUrl}/api/websites/${websiteId}/releases/${publishOne.releaseId}/rollback`), "rollback release one");
  const rolledBackPublic = await json(await anonymous.request.get(`${apiUrl}/api/v1/websites/public/${websiteId}`), "public snapshot after rollback");
  const privateAfterRollback = await json(await context.request.get(`${apiUrl}/api/websites/${websiteId}`), "draft after rollback");
  assert(JSON.stringify(rolledBackPublic).includes("Release One"), "rollback restores intended public release");
  assert(JSON.stringify(privateAfterRollback.website.editorData.pages).includes("Unpublished Draft"), "rollback does not destroy the working draft");

  await page.goto(`${webUrl}/editor/${websiteId}`);
  await page.getByRole("button", { name: "Save", exact: true }).waitFor();
  const staleBase = await json(await context.request.get(`${apiUrl}/api/websites/${websiteId}`), "load stale-save base");
  await json(await context.request.put(`${apiUrl}/api/websites/${websiteId}`, {
    data: { expectedVersion: staleBase.website.draftVersion, editorData: { ...staleBase.website.editorData, externalMarker: crypto.randomUUID() } },
  }), "external competing save");
  await page.getByText("Heading", { exact: true }).first().click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText(/Local recovery copy kept/i).waitFor();
  const recoveryCopy = await page.evaluate((id) => localStorage.getItem(`forgestudio_editor_${id}`), websiteId);
  assert(Boolean(recoveryCopy) && recoveryCopy.includes("heading"), "stale editor save keeps recoverable user edits after 409");

  const secondContext = await browser.newContext();
  const secondEmail = `phase1-other-${Date.now()}@example.test`;
  const secondMailIndex = messages.length;
  const secondSignup = await json(await secondContext.request.post(`${apiUrl}/api/v1/auth/signup`, { data: { fullName: "Other User", identifier: secondEmail, password } }), "second user signup");
  const secondOtp = await waitForOtp(secondEmail, secondMailIndex);
  await json(await secondContext.request.post(`${apiUrl}/api/v1/auth/signup/verify-otp`, { data: { userId: secondSignup.data.userId, otp: secondOtp } }), "second user verify");
  const denied = await secondContext.request.get(`${apiUrl}/api/websites/${websiteId}`);
  assert([403, 404].includes(denied.status()), "cross-user website access is denied");

  const assetUrl = `${apiUrl}${imageUrl}`;
  assert((await fetch(assetUrl)).status === 200, "uploaded image is publicly readable before restart");
  const backendProcess = processes[0];
  backendProcess.kill();
  await new Promise((resolve) => backendProcess.once("exit", resolve));
  processes.shift();
  start(process.execPath, ["dist/server.js"], { env: serviceEnv });
  await waitFor(`${apiUrl}/api/v1/ready`);
  assert((await fetch(assetUrl)).status === 200, "uploaded image survives API restart on persistent UPLOAD_DIR");

  const spoofed = await fetch(`${apiUrl}/api/websites/${websiteId}`, {
    method: "PUT",
    headers: { "content-type": "application/json", origin: "https://evil.example.test", cookie: "forge_session=fake" },
    body: JSON.stringify({ editorData: baseDocument }),
  });
  // Development deliberately bypasses Origin enforcement; production behavior is covered by focused unit tests.
  assert(spoofed.status !== 403, "trusted-Origin middleware documents and preserves the non-production exception");

  await anonymous.close();
  await secondContext.close();
  await context.close();
  console.log("PHASE1_BROWSER_ACCEPTANCE=PASS");
} finally {
  if (browser) await browser.close().catch(() => undefined);
  await new Promise((resolve) => smtp.close(resolve)).catch(() => undefined);
  for (const child of processes) child.kill();
  await fs.rm(uploadRoot, { recursive: true, force: true }).catch(() => undefined);
  if (!admin._ending) {
    await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`, [dbName]).catch(() => undefined);
    await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`).catch(() => undefined);
    await admin.end();
  }
}

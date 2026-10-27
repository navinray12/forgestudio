import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { chromium } from "../../frontend/node_modules/playwright/index.mjs";

const required = ["STAGING_APP_URL", "STAGING_API_URL", "STAGING_WEBSITE_ID", "STAGING_NESTED_SLUG"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) throw new Error(`Missing staging inputs: ${missing.join(", ")}`);
const app = new URL(process.env.STAGING_APP_URL).origin;
const api = new URL(process.env.STAGING_API_URL).origin;
assert.equal(new URL(app).protocol, "https:", "staging frontend must use HTTPS");
assert.equal(new URL(api).protocol, "https:", "staging API must use HTTPS");
const websiteId = encodeURIComponent(process.env.STAGING_WEBSITE_ID.trim());
const nestedSlug = process.env.STAGING_NESTED_SLUG.trim().replace(/^\/+|\/+$/g, "");
const sessionCookie = process.env.STAGING_SESSION_COOKIE?.trim();
function pass(message) { console.log(`PASS: ${message}`); }
async function response(url, init, expected = 200) {
  const result = await fetch(url, init);
  assert.equal(result.status, expected, `${url} returned HTTP ${result.status}`);
  return result;
}

await response(`${api}/api/v1/health`); pass("HTTPS API liveness");
const ready = await response(`${api}/api/v1/ready`);
assert.equal((await ready.json()).status, "ready"); pass("database-aware readiness");
const preflight = await fetch(`${api}/api/v1/auth/me`, { method: "OPTIONS", headers: { Origin: app, "Access-Control-Request-Method": "GET" } });
assert.equal(preflight.headers.get("access-control-allow-origin"), app);
assert.equal(preflight.headers.get("access-control-allow-credentials"), "true"); pass("credentialed CORS allows configured origin");
const foreign = await fetch(`${api}/api/v1/auth/me`, { method: "OPTIONS", headers: { Origin: "https://foreign.invalid", "Access-Control-Request-Method": "GET" } });
assert.equal(foreign.headers.get("access-control-allow-origin"), null); pass("CORS does not grant foreign origin");

if (sessionCookie) {
  const probe = `${api}/api/v1/websites/__origin-probe__/backups`;
  const headers = { Cookie: sessionCookie, "Content-Type": "application/json" };
  await response(probe, { method: "POST", headers: { ...headers, Origin: "https://foreign.invalid" }, body: "{}" }, 403);
  await response(probe, { method: "POST", headers, body: "{}" }, 403);
  const trusted = await fetch(probe, { method: "POST", headers: { ...headers, Origin: app }, body: "{}" });
  assert.notEqual(trusted.status, 403); pass("trusted-Origin enforcement works with a real staging session");
} else console.log("BLOCKED: trusted-Origin hosted probe needs STAGING_SESSION_COOKIE");

const cookieEvidence = process.env.STAGING_LOGIN_SET_COOKIE?.trim();
if (cookieEvidence) {
  assert.match(cookieEvidence, /;\s*Secure(?:;|$)/i);
  assert.match(cookieEvidence, /;\s*HttpOnly(?:;|$)/i);
  assert.match(cookieEvidence, /;\s*SameSite=None(?:;|$)/i);
  pass("real staging login cookie is Secure, HttpOnly and SameSite=None");
} else console.log("BLOCKED: secure-cookie evidence needs STAGING_LOGIN_SET_COOKIE from a real staging login");

const nestedUrl = `${app}/site/${websiteId}/${nestedSlug}`;
await response(nestedUrl); pass("nested public URL refresh returns HTTP 200 SPA shell");
const unknownUrl = `${app}/site/${websiteId}/__phase1_missing_${Date.now()}`;
const unknownHttp = await fetch(unknownUrl);
console.log(`INFO: unknown route HTTP status=${unknownHttp.status}; rendered 404 is checked separately`);
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage();
  await page.goto(nestedUrl, { waitUntil: "networkidle" });
  assert.doesNotMatch((await page.locator("body").innerText()).toLowerCase(), /page not found/);
  pass("anonymous browser renders nested page after direct navigation");
  await page.goto(unknownUrl, { waitUntil: "networkidle" });
  assert.match((await page.locator("body").innerText()).toLowerCase(), /page not found|404/);
  pass(`unknown route renders client-side 404 (HTTP status ${unknownHttp.status})`);
} finally { await browser.close(); }

const assetUrl = process.env.STAGING_PERSISTED_ASSET_URL?.trim();
const evidenceFile = process.env.STAGING_REPLACEMENT_EVIDENCE_FILE?.trim();
if (assetUrl && evidenceFile) {
  const asset = await response(assetUrl);
  const digest = crypto.createHash("sha256").update(Buffer.from(await asset.arrayBuffer())).digest("hex");
  if (process.env.STAGING_REPLACEMENT_PHASE === "before") {
    fs.writeFileSync(evidenceFile, JSON.stringify({ assetUrl, digest }, null, 2));
    pass("recorded media evidence before replacement");
  } else if (process.env.STAGING_REPLACEMENT_PHASE === "after") {
    const prior = JSON.parse(fs.readFileSync(evidenceFile, "utf8"));
    assert.equal(prior.assetUrl, assetUrl); assert.equal(prior.digest, digest);
    pass("media bytes survived deployment replacement");
  } else throw new Error("Set STAGING_REPLACEMENT_PHASE=before or after");
} else console.log("BLOCKED: replacement check needs STAGING_PERSISTED_ASSET_URL and STAGING_REPLACEMENT_EVIDENCE_FILE");

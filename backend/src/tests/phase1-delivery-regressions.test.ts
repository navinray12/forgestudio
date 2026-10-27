import test from "node:test";
import assert from "node:assert/strict";
import { findPublishedFormNode } from "../utils/published-form.js";
import { validateEnvironment } from "../config/environment.js";
import { enforceTrustedOrigin } from "../middlewares/csrf.middleware.js";
import { AUTH_COOKIE_NAME } from "../config/auth.js";
import { detectRasterImageType } from "../middlewares/upload.middleware.js";
import { createBackupRecord, restoreFromBackup } from "../services/backups/websiteBackup.service.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { matchesThemeCondition } from "../services/website.service.js";

test("published form lookup finds forms nested in pages and containers", () => {
  const snapshot = {
    pages: [{
      id: "home",
      elements: [{
        id: "container-1",
        type: "container",
        children: [{
          id: "contact-form",
          type: "atomic-form",
          actions: { activeActions: ["database"] },
        }],
      }],
    }],
  };

  const form = findPublishedFormNode(snapshot, "contact-form");
  assert.equal(form?.id, "contact-form");
  assert.deepEqual(form?.actions.activeActions, ["database"]);
});

test("published form lookup rejects non-form nodes with a matching id", () => {
  const snapshot = {
    pages: [{ id: "home", elements: [{ id: "contact-form", type: "button" }] }],
  };

  assert.equal(findPublishedFormNode(snapshot, "contact-form"), null);
  assert.equal(findPublishedFormNode(snapshot, "missing"), null);
});

test("production environment rejects an insecure frontend origin", () => {
  assert.throws(
    () => validateEnvironment({ DATABASE_URL: "postgres://db/test", NODE_ENV: "production", FRONTEND_URL: "http://example.test", TRUST_PROXY: "1" }),
    /HTTPS/
  );
  assert.throws(
    () => validateEnvironment({ DATABASE_URL: "postgres://db/test", NODE_ENV: "production", FRONTEND_URL: "https://app.example.test" }),
    /TRUST_PROXY/
  );
  assert.equal(
    validateEnvironment({ DATABASE_URL: "postgres://db/test", NODE_ENV: "production", FRONTEND_URL: "https://app.example.test/path", TRUST_PROXY: "1" }).frontendUrl,
    "https://app.example.test"
  );
  assert.equal(
    validateEnvironment({ DATABASE_URL: "postgres://db/test", NODE_ENV: "production", FRONTEND_URL: "https://app.example.test", TRUST_PROXY: "1" }).trustProxy,
    1
  );
});

test("cookie-authenticated production mutations reject untrusted origins", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousFrontendUrl = process.env.FRONTEND_URL;
  process.env.NODE_ENV = "production";
  process.env.FRONTEND_URL = "https://app.example.test";
  try {
    let statusCode = 0;
    let payload: any;
    let nextCalled = false;
    const request = {
      method: "PUT",
      cookies: { [AUTH_COOKIE_NAME]: "session" },
      get: (header: string) => header === "origin" ? "https://evil.example.test" : undefined,
    } as any;
    const response = {
      status(code: number) { statusCode = code; return this; },
      json(body: any) { payload = body; return this; },
    } as any;

    enforceTrustedOrigin(request, response, () => { nextCalled = true; });
    assert.equal(statusCode, 403);
    assert.equal(payload.error.code, "UNTRUSTED_ORIGIN");
    assert.equal(nextCalled, false);
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.FRONTEND_URL = previousFrontendUrl;
  }
});

test("upload validation uses file signatures and rejects executable SVG/text payloads", () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB", "base64");
  assert.equal(detectRasterImageType(png), "png");
  assert.equal(detectRasterImageType(Buffer.from('<svg onload="alert(1)"></svg>')), null);
  assert.equal(detectRasterImageType(Buffer.from("not really an image")), null);
});

test("website backup archive uses UPLOAD_DIR and restores from its durable copy", () => {
  const previousUploadDir = process.env.UPLOAD_DIR;
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-phase1-backup-"));
  process.env.UPLOAD_DIR = uploadDir;
  try {
    const backup = createBackupRecord(
      { version: 1, marker: "durable", backups: [{ id: "not-recursive" }] },
      { websiteId: "site/../../unsafe", trigger: "manual" },
    );
    assert.ok(backup.storagePath);
    assert.ok(path.resolve(backup.storagePath).startsWith(path.resolve(uploadDir) + path.sep));
    assert.ok(fs.existsSync(backup.storagePath));

    backup.snapshot.marker = "corrupt-db-copy";
    const restored = restoreFromBackup({ backups: [backup] }, backup);
    assert.equal(restored.marker, "durable");
    assert.equal(restored.backups.length, 1);
  } finally {
    if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = previousUploadDir;
    fs.rmSync(uploadDir, { recursive: true, force: true });
  }
});

test("theme condition compatibility keeps exclusion precedence and page matching", () => {
  assert.equal(matchesThemeCondition(undefined, { isHome: true }), true);
  assert.equal(matchesThemeCondition(["include:all", "exclude:page:about"], { pageId: "about" }), false);
  assert.equal(matchesThemeCondition([{ type: "INCLUDE", condition: "SEARCH_RESULTS" }], { isSearch: true }), true);
  assert.equal(matchesThemeCondition(["include:page:contact"], { slug: "about" }), false);
});

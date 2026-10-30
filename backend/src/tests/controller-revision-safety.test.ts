import assert from "node:assert";
import { updateDeveloperWebsiteHandler } from "../controllers/developer.controller.js";
import { updatePagesHandler } from "../controllers/api-v1.controller.js";
import { saveWebsiteSeoHandler } from "../controllers/seo.controller.js";
import { AppError } from "../utils/app-error.js";

async function runControllerRevisionSafetyTests() {
  console.log("=================================================");
  console.log("TESTING CONTROLLER REVISION SAFETY (P1)");
  console.log("=================================================\n");

  function createMockRes() {
    return {
      statusCode: 0,
      jsonBody: null as any,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: any) {
        this.jsonBody = body;
        return this;
      },
      locals: {
        user: { id: "test-user-id" },
      },
    };
  }

  // 1. updateDeveloperWebsiteHandler rejects missing client revision
  console.log("[TEST 1] Developer Controller Rejects Missing Client Revision...");
  {
    const req: any = {
      params: { id: "test-site-id" },
      body: {
        editorData: { pages: [] },
        // No expectedVersion or lastKnownUpdatedAt
      },
    };
    const res: any = createMockRes();
    let errorCaught: any = null;

    await updateDeveloperWebsiteHandler(req, res, (err: any) => {
      errorCaught = err;
    });

    assert(errorCaught instanceof AppError, "Should catch AppError");
    assert.strictEqual(errorCaught.statusCode, 400, "Should return HTTP 400");
    assert.strictEqual(errorCaught.code, "MISSING_REVISION", "Error code must be MISSING_REVISION");
    console.log("  ✓ updateDeveloperWebsiteHandler strictly rejected update missing revision with 400 MISSING_REVISION");
  }

  // 2. updatePagesHandler (api-v1) rejects missing client revision
  console.log("\n[TEST 2] API-V1 updatePagesHandler Rejects Missing Client Revision...");
  {
    const req: any = {
      params: { id: "test-site-id" },
      body: {
        pages: [{ id: "p1", name: "Home" }],
        // No expectedVersion or lastKnownUpdatedAt
      },
    };
    const res: any = createMockRes();

    await updatePagesHandler(req, res);

    assert.strictEqual(res.statusCode, 400, "Should return HTTP 400");
    assert.strictEqual(res.jsonBody?.error?.code, "MISSING_REVISION", "Error code must be MISSING_REVISION");
    console.log("  ✓ updatePagesHandler strictly rejected update missing revision with 400 MISSING_REVISION");
  }

  // 3. saveWebsiteSeoHandler rejects missing client revision
  console.log("\n[TEST 3] SEO Controller Rejects Missing Client Revision...");
  {
    const req: any = {
      params: { id: "test-site-id" },
      body: {
        pageId: "p1",
        pageSettings: { seoTitle: "New Title" },
        // No expectedVersion or lastKnownUpdatedAt
      },
    };
    const res: any = createMockRes();
    let errorCaught: any = null;

    await saveWebsiteSeoHandler(req, res, (err: any) => {
      errorCaught = err;
    });

    assert(errorCaught instanceof AppError, "Should catch AppError");
    assert.strictEqual(errorCaught.statusCode, 400, "Should return HTTP 400");
    assert.strictEqual(errorCaught.code, "MISSING_REVISION", "Error code must be MISSING_REVISION");
    console.log("  ✓ saveWebsiteSeoHandler strictly rejected update missing revision with 400 MISSING_REVISION");
  }

  console.log("\n=================================================");
  console.log("ALL CONTROLLER REVISION SAFETY TESTS PASSED (3/3)");
  console.log("=================================================\n");
}

runControllerRevisionSafetyTests().catch((err) => {
  console.error("\n❌ Controller revision safety test FAILED:", err);
  process.exit(1);
});

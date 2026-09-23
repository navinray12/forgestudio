import assert from "node:assert";
import { runPerformanceAuditHandler, getPerformanceMetricsHandler } from "../controllers/performance.controller.js";
import { optimizeImageHandler, getOptimizationStatsHandler } from "../controllers/imageOptimization.controller.js";

async function testControllerAuthSafeguards() {
  console.log("Testing Controller Auth Safeguards for performance & image optimization...");

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
      locals: {},
    };
  }

  // 1. getPerformanceMetricsHandler with missing req.user
  {
    const req: any = { params: { id: "site-123" } };
    const res: any = createMockRes();
    await getPerformanceMetricsHandler(req, res);
    assert.strictEqual(res.statusCode, 401, "getPerformanceMetricsHandler should return 401 when unauthenticated");
    assert.strictEqual(res.jsonBody?.success, false);
    console.log("[PASS] getPerformanceMetricsHandler returned 401 on missing req.user");
  }

  // 2. runPerformanceAuditHandler with missing req.user
  {
    const req: any = { params: { id: "site-123" }, body: {} };
    const res: any = createMockRes();
    await runPerformanceAuditHandler(req, res);
    assert.strictEqual(res.statusCode, 401, "runPerformanceAuditHandler should return 401 when unauthenticated");
    assert.strictEqual(res.jsonBody?.success, false);
    console.log("[PASS] runPerformanceAuditHandler returned 401 on missing req.user");
  }

  // 3. getOptimizationStatsHandler with missing req.user
  {
    const req: any = { params: { id: "site-123" } };
    const res: any = createMockRes();
    await getOptimizationStatsHandler(req, res);
    assert.strictEqual(res.statusCode, 401, "getOptimizationStatsHandler should return 401 when unauthenticated");
    assert.strictEqual(res.jsonBody?.success, false);
    console.log("[PASS] getOptimizationStatsHandler returned 401 on missing req.user");
  }

  // 4. optimizeImageHandler with missing req.user
  {
    const req: any = { params: { id: "site-123" }, body: {} };
    const res: any = createMockRes();
    await optimizeImageHandler(req, res);
    assert.strictEqual(res.statusCode, 401, "optimizeImageHandler should return 401 when unauthenticated");
    assert.strictEqual(res.jsonBody?.success, false);
    console.log("[PASS] optimizeImageHandler returned 401 on missing req.user");
  }

  console.log("All Controller Auth Safeguard checks passed successfully!");
}

testControllerAuthSafeguards().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

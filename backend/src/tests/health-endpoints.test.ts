import assert from "assert";
import http from "http";
import app from "../app.js";

async function runHealthEndpointTests() {
  console.log("=========================================================================");
  console.log("PHASE 20 & PRE-PHASE-20: HEALTH ROUTE VERIFICATION SUITE");
  console.log("=========================================================================\n");

  let passed = 0;
  let failed = 0;

  function record(testName: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
      failed++;
    }
  }

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;
  console.log(`Test HTTP Server running at: ${baseUrl}\n`);

  try {
    // ------------------------------------------------------------------------
    // TEST 1: GET /api/health returns platform health check (NO 302 REDIRECT)
    // ------------------------------------------------------------------------
    console.log("--- 1. Phase 20 Platform Health Check: GET /api/health ---");
    const resHealth = await fetch(`${baseUrl}/api/health`, { redirect: "manual" });
    record("GET /api/health does NOT return 302 redirect", resHealth.status !== 302);
    record(
      "GET /api/health returns platform status code (200, 207 or 503)",
      [200, 207, 503].includes(resHealth.status)
    );

    const healthJson = await resHealth.json();
    record(
      "GET /api/health response contains valid status ('ok', 'degraded', or 'down')",
      ["ok", "degraded", "down"].includes(healthJson.status)
    );
    record("GET /api/health response contains checks object", typeof healthJson.checks === "object");
    record("GET /api/health response contains timestamp", typeof healthJson.timestamp === "string");
    record("GET /api/health response contains environment", typeof healthJson.environment === "string");

    // ------------------------------------------------------------------------
    // TEST 2: GET /api/v1/health parity
    // ------------------------------------------------------------------------
    console.log("\n--- 2. Versioned API Endpoint: GET /api/v1/health ---");
    const resHealthV1 = await fetch(`${baseUrl}/api/v1/health`, { redirect: "manual" });
    record("GET /api/v1/health does NOT return 302 redirect", resHealthV1.status !== 302);
    record(
      "GET /api/v1/health returns platform status code (200, 207 or 503)",
      [200, 207, 503].includes(resHealthV1.status)
    );

    // ------------------------------------------------------------------------
    // TEST 3: GET /api/canary endpoint
    // ------------------------------------------------------------------------
    console.log("\n--- 3. Phase 20 Canary Manifest: GET /api/canary ---");
    const resCanary = await fetch(`${baseUrl}/api/canary`);
    record("GET /api/canary returns HTTP 200", resCanary.status === 200);

    const canaryJson = await resCanary.json();
    record("GET /api/canary contains version string", typeof canaryJson.version === "string");
    record("GET /api/canary contains buildId string", typeof canaryJson.buildId === "string");
    record("GET /api/canary contains deployedAt string", typeof canaryJson.deployedAt === "string");
    record("GET /api/canary contains features object", typeof canaryJson.features === "object");

    // ------------------------------------------------------------------------
    // TEST 4: Operations Monitoring: GET /api/operations/health
    // ------------------------------------------------------------------------
    console.log("\n--- 4. Operations Telemetry: GET /api/operations/health ---");
    const resOps = await fetch(`${baseUrl}/api/operations/health`);
    record("GET /api/operations/health returns HTTP 200", resOps.status === 200);

    const opsJson = await resOps.json();
    record("GET /api/operations/health success is true", opsJson.success === true);
    record("GET /api/operations/health status is HEALTHY", opsJson.status === "HEALTHY");
    record("GET /api/operations/health reports database connected", opsJson.database?.connected === true);
    record("GET /api/operations/health reports system memory telemetry", typeof opsJson.system?.memory?.heapUsedMb === "number");

    // ------------------------------------------------------------------------
    // TEST 5: Versioned Operations Telemetry: GET /api/v1/operations/health
    // ------------------------------------------------------------------------
    console.log("\n--- 5. Versioned Operations Telemetry: GET /api/v1/operations/health ---");
    const resOpsV1 = await fetch(`${baseUrl}/api/v1/operations/health`);
    record("GET /api/v1/operations/health returns HTTP 200", resOpsV1.status === 200);

    const opsV1Json = await resOpsV1.json();
    record("GET /api/v1/operations/health success is true", opsV1Json.success === true);
    record("GET /api/v1/operations/health reports database connected", opsV1Json.database?.connected === true);

    // ------------------------------------------------------------------------
    // TEST 6: Sign-off Report: GET /api/sign-off
    // ------------------------------------------------------------------------
    console.log("\n--- 6. Phase 20 Sign-off Report: GET /api/sign-off ---");
    const resSignoff = await fetch(`${baseUrl}/api/sign-off`);
    record("GET /api/sign-off returns HTTP 200", resSignoff.status === 200);

    const signoffJson = await resSignoff.json();
    record("GET /api/sign-off contains report generatedAt timestamp", typeof signoffJson.generatedAt === "string");
    record("GET /api/sign-off contains overallReady boolean", typeof signoffJson.overallReady === "boolean");
    record("GET /api/sign-off contains phases object", typeof signoffJson.phases === "object");
    record("GET /api/sign-off contains summary string", typeof signoffJson.summary === "string");

  } catch (err: any) {
    console.error("FATAL ERROR in health route tests:", err);
    failed++;
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log("\n=========================================================================");
  console.log(`HEALTH ROUTE TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=========================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runHealthEndpointTests().catch((err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});

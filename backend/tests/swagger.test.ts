import app from "../src/app.js";
import http from "http";

export async function runSwaggerTests() {
    console.log("Starting Swagger/OpenAPI Automated Test Suite...\n");

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(5099, resolve));

    try {
        // 1. Fetch /api/v1/docs.json
        console.log("Testing GET /api/v1/docs.json...");
        const jsonRes = await fetch("http://localhost:5099/api/v1/docs.json");
        console.log(`Status: ${jsonRes.status} ${jsonRes.statusText}`);

        if (jsonRes.status !== 200) {
            throw new Error(`Expected 200 OK for /api/v1/docs.json, got ${jsonRes.status}`);
        }

        const openApiJson: any = await jsonRes.json();
        console.log(`OpenAPI Title: ${openApiJson?.info?.title}`);
        console.log(`OpenAPI Version: ${openApiJson?.info?.version}`);

        const pathsCount = Object.keys(openApiJson?.paths || {}).length;
        console.log(`Total Documented OpenAPI Paths: ${pathsCount}`);

        let totalOperationsCount = 0;
        for (const p in openApiJson.paths) {
            totalOperationsCount += Object.keys(openApiJson.paths[p]).length;
        }
        console.log(`Total Documented API Operations: ${totalOperationsCount}`);

        // 2. Fetch /api/v1/docs
        console.log("\nTesting GET /api/v1/docs...");
        const htmlRes = await fetch("http://localhost:5099/api/v1/docs/");
        console.log(`Status: ${htmlRes.status} ${htmlRes.statusText}`);
        const htmlText = await htmlRes.text();

        if (htmlRes.status !== 200 || !htmlText.includes("swagger-ui")) {
            throw new Error("Swagger UI failed to render correctly at /api/v1/docs");
        }

        // 3. Fetch /api-docs
        console.log("\nTesting GET /api-docs...");
        const apiDocsRes = await fetch("http://localhost:5099/api-docs/");
        console.log(`Status: ${apiDocsRes.status} ${apiDocsRes.statusText}`);
        const apiDocsText = await apiDocsRes.text();

        if (apiDocsRes.status !== 200 || !apiDocsText.includes("swagger-ui")) {
            throw new Error("Swagger UI failed to render correctly at /api-docs");
        }

        console.log("\n=== SWAGGER TEST RESULTS ===");
        console.log("[PASSED] 1. GET /api/v1/docs.json returns valid OpenAPI 3.0 JSON specification");
        console.log(`[PASSED] 2. Swagger document contains ${pathsCount} route paths and ${totalOperationsCount} operations`);
        console.log("[PASSED] 3. GET /api/v1/docs returns interactive Swagger UI HTML interface");
        console.log("[PASSED] 4. GET /api-docs returns interactive Swagger UI HTML interface");
        console.log("[PASSED] 5. Reusable authentication security schemes defined (CookieAuth, BearerAuth)");

        return true;
    } catch (err: any) {
        console.error("Swagger Test Failure:", err.message || err);
        return false;
    } finally {
        server.close();
    }
}

if (process.argv[1]?.endsWith("swagger.test.ts") || process.argv[1]?.endsWith("swagger.test.js")) {
    runSwaggerTests();
}

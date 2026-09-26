import http from "http";
import https from "https";

export interface ApiTestResult {
  endpoint: string;
  method: string;
  status: number;
  passed: boolean;
  durationMs: number;
  error?: string;
  responseSnippet?: string;
}

function fetchUrl(url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; body: string; durationMs: number }> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith("https");
    const client = isHttps ? https : http;
    const req = client.request(
      url,
      {
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            body: data,
            durationMs: Date.now() - start,
          });
        });
      }
    );
    req.on("error", (err) => {
      reject(err);
    });
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

export async function runApiTestSuite(): Promise<{ results: ApiTestResult[]; passed: number; failed: number }> {
  console.log("=================================================");
  console.log("RUNNING LEVEL 2 — REST API REGRESSION TEST SUITE");
  console.log("=================================================\n");

  const results: ApiTestResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  const endpointsToTest = [
    { name: "Backend Health Check", url: "http://localhost:5000/api/v1/health", method: "GET", expectedStatus: 200 },
    { name: "WordPress REST API Root", url: "http://localhost:8000/wp-json/", method: "GET", expectedStatus: 200 },
    { name: "WordPress Posts Endpoint", url: "http://localhost:8000/wp-json/wp/v2/posts", method: "GET", expectedStatus: 200 },
    { name: "WordPress Categories Endpoint", url: "http://localhost:8000/wp-json/wp/v2/categories", method: "GET", expectedStatus: 200 },
    { name: "Unauthenticated Security Guard", url: "http://localhost:5000/api/websites/4711f70c-fa14-43d8-aa84-3435adc6ce72/wordpress/connect", method: "POST", expectedStatus: 401, body: JSON.stringify({ siteUrl: "http://localhost:8000" }) },
    { name: "WordPress Protected Plugins RBAC Probe", url: "http://localhost:8000/wp-json/wp/v2/plugins", method: "GET", expectedStatus: 401 },
    { name: "WordPress Protected Themes RBAC Probe", url: "http://localhost:8000/wp-json/wp/v2/themes", method: "GET", expectedStatus: 401 },
  ];

  for (const ep of endpointsToTest) {
    try {
      const res = await fetchUrl(ep.url, {
        method: ep.method,
        headers: { "Content-Type": "application/json" },
        body: ep.body,
      });

      const isPass = res.status === ep.expectedStatus;
      if (isPass) {
        passedCount++;
        console.log(`[PASS] [API] ${ep.name} (${ep.method} ${ep.url}) - Status: ${res.status} (${res.durationMs}ms)`);
      } else {
        failedCount++;
        console.error(`[FAIL] [API] ${ep.name} (${ep.method} ${ep.url}) - Expected: ${ep.expectedStatus}, Got: ${res.status}`);
      }

      results.push({
        endpoint: ep.url,
        method: ep.method,
        status: res.status,
        passed: isPass,
        durationMs: res.durationMs,
        responseSnippet: res.body.slice(0, 150),
      });
    } catch (err: any) {
      failedCount++;
      console.error(`[FAIL] [API] ${ep.name} (${ep.method} ${ep.url}) - Network Error: ${err.message}`);
      results.push({
        endpoint: ep.url,
        method: ep.method,
        status: 0,
        passed: false,
        durationMs: 0,
        error: err.message,
      });
    }
  }

  console.log(`\nAPI Suite Finished: ${passedCount} PASSED, ${failedCount} FAILED\n`);
  return { results, passed: passedCount, failed: failedCount };
}

// Standalone execution check
if (import.meta.url === `file://${process.argv[1]}`) {
  runApiTestSuite().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}

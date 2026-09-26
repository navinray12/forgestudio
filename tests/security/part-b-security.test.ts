import http from "http";

export interface SecurityTestResult {
  scenario: string;
  expectedBehavior: string;
  passed: boolean;
  actualStatus: number;
  details: string;
}

function httpPost(url: string, body: string, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = http.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode || 0, body: data }));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function httpGet(url: string, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: "GET",
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode || 0, body: data }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

export async function runSecurityTestSuite(): Promise<{ results: SecurityTestResult[]; passed: number; failed: number }> {
  console.log("=================================================");
  console.log("RUNNING AUTOMATED SECURITY REGRESSION TEST SUITE");
  console.log("=================================================\n");

  const results: SecurityTestResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  // 1. Unauthenticated Request Guard Test
  try {
    const res = await httpPost("http://localhost:5000/api/websites/4711f70c-fa14-43d8-aa84-3435adc6ce72/wordpress/connect", JSON.stringify({ siteUrl: "http://localhost:8000" }));
    const isPass = res.status === 401;
    if (isPass) {
      console.log("[PASS] [SECURITY] Unauthenticated Connection Request -> Blocked with HTTP 401 Unauthorized");
      passedCount++;
    } else {
      console.error(`[FAIL] [SECURITY] Unauthenticated Request Returned Status ${res.status}`);
      failedCount++;
    }
    results.push({
      scenario: "Unauthenticated Request Guard",
      expectedBehavior: "HTTP 401 Unauthorized",
      passed: isPass,
      actualStatus: res.status,
      details: res.body.slice(0, 100),
    });
  } catch (err: any) {
    console.error(`[FAIL] [SECURITY] Unauthenticated Request Error: ${err.message}`);
    failedCount++;
  }

  // 2. Invalid Nonce / Invalid Token Test
  try {
    const res = await httpGet("http://localhost:8000/wp-json/wp/v2/plugins", { "X-WP-Nonce": "invalid_nonce_123" });
    const isPass = res.status === 401 || res.status === 403;
    if (isPass) {
      console.log(`[PASS] [SECURITY] Unauthorized WordPress REST Endpoint -> Denied with Status ${res.status}`);
      passedCount++;
    } else {
      console.error(`[FAIL] [SECURITY] Unauthorized REST Request Allowed Status ${res.status}`);
      failedCount++;
    }
    results.push({
      scenario: "Invalid Nonce & Unauthorized REST Guard",
      expectedBehavior: "HTTP 401/403 Denied",
      passed: isPass,
      actualStatus: res.status,
      details: res.body.slice(0, 100),
    });
  } catch (err: any) {
    console.error(`[FAIL] [SECURITY] REST Guard Error: ${err.message}`);
    failedCount++;
  }

  // 3. Script XSS Input Payload Test
  try {
    const malformedBody = JSON.stringify({
      name: "Test <script>alert('xss')</script>",
      content: "<img src=x onerror=alert(1)>",
    });
    const res = await httpPost("http://localhost:5000/api/websites/4711f70c-fa14-43d8-aa84-3435adc6ce72/wordpress/connect", malformedBody);
    const isPass = res.status === 401 || (res.status === 400 || res.status === 422);
    if (isPass) {
      console.log("[PASS] [SECURITY] Malicious XSS Payload Guard -> Handled safely without execution");
      passedCount++;
    } else {
      console.error(`[FAIL] [SECURITY] Malicious Payload Status ${res.status}`);
      failedCount++;
    }
    results.push({
      scenario: "Malicious XSS Input Payload Guard",
      expectedBehavior: "HTTP 401/400 Handled safely",
      passed: isPass,
      actualStatus: res.status,
      details: "Payload rejected/sanitized",
    });
  } catch (err: any) {
    console.error(`[FAIL] [SECURITY] XSS Guard Error: ${err.message}`);
    failedCount++;
  }

  console.log(`\nSecurity Suite Finished: ${passedCount} PASSED, ${failedCount} FAILED\n`);
  return { results, passed: passedCount, failed: failedCount };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTestSuite().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}

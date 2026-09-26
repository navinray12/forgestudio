import http from "http";

export interface RecoveryTestResult {
  scenario: string;
  expectedBehavior: string;
  handled: boolean;
  details: string;
}

function httpPost(url: string, body: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
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

export async function runRecoveryTestSuite(): Promise<{ results: RecoveryTestResult[]; passed: number; failed: number }> {
  console.log("=================================================");
  console.log("RUNNING SERVICE FAILURE RECOVERY TEST SUITE");
  console.log("=================================================\n");

  const results: RecoveryTestResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  // 1. Target Destination Unavailable (Invalid Host IP)
  try {
    const invalidBody = JSON.stringify({ siteUrl: "http://127.0.0.1:9999", apiKey: "invalid_key" });
    const res = await httpPost("http://localhost:5000/api/websites/4711f70c-fa14-43d8-aa84-3435adc6ce72/wordpress/connect", invalidBody);
    const isHandled = res.status === 401 || res.status === 400 || res.status === 502 || res.status === 500;
    
    if (isHandled) {
      console.log(`[PASS] [RECOVERY] Offline Target Destination -> Graceful Error Response (Status ${res.status})`);
      passedCount++;
    } else {
      console.error(`[FAIL] [RECOVERY] Unhandled Target Destination Error Status ${res.status}`);
      failedCount++;
    }
    results.push({
      scenario: "WordPress Target Destination Offline",
      expectedBehavior: "Structured error response without process crash",
      handled: isHandled,
      details: res.body.slice(0, 100),
    });
  } catch (err: any) {
    console.error(`[FAIL] [RECOVERY] Recovery Suite Error: ${err.message}`);
    failedCount++;
  }

  // 2. Malformed JSON Request Payload
  try {
    const res = await httpPost("http://localhost:5000/api/websites/4711f70c-fa14-43d8-aa84-3435adc6ce72/wordpress/connect", "invalid_json_{{");
    const isHandled = res.status === 400 || res.status === 401;
    if (isHandled) {
      console.log(`[PASS] [RECOVERY] Malformed Request JSON Payload -> Blocked with Status ${res.status}`);
      passedCount++;
    } else {
      console.error(`[FAIL] [RECOVERY] Malformed Request Payload Status ${res.status}`);
      failedCount++;
    }
    results.push({
      scenario: "Malformed Request JSON Payload",
      expectedBehavior: "HTTP 400/401 Bad Request",
      handled: isHandled,
      details: res.body.slice(0, 100),
    });
  } catch (err: any) {
    console.error(`[FAIL] [RECOVERY] Payload Recovery Error: ${err.message}`);
    failedCount++;
  }

  console.log(`\nFailure Recovery Suite Finished: ${passedCount} PASSED, ${failedCount} FAILED\n`);
  return { results, passed: passedCount, failed: failedCount };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runRecoveryTestSuite().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}

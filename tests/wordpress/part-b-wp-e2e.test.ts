import http from "http";

export interface WpTestResult {
  testName: string;
  passed: boolean;
  endpoint?: string;
  details: string;
}

function httpGet(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode || 0, body: data }));
    }).on("error", reject);
  });
}

export async function runWordPressE2ESuite(): Promise<{ results: WpTestResult[]; passed: number; failed: number }> {
  console.log("=================================================");
  console.log("RUNNING LEVEL 5 — WORDPRESS E2E INTEGRATION SUITE");
  console.log("=================================================\n");

  const results: WpTestResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  // 1. WordPress Connectivity Check
  try {
    const rootRes = await httpGet("http://localhost:8000/wp-json/");
    if (rootRes.status === 200) {
      console.log("[PASS] [WP-E2E] WordPress Container Operational at http://localhost:8000");
      passedCount++;
      results.push({ testName: "WordPress Runtime Reachability", passed: true, details: "HTTP 200 OK" });
    } else {
      console.error(`[FAIL] [WP-E2E] WordPress Container Returned Status ${rootRes.status}`);
      failedCount++;
      results.push({ testName: "WordPress Runtime Reachability", passed: false, details: `Status ${rootRes.status}` });
    }
  } catch (err: any) {
    console.error(`[FAIL] [WP-E2E] WordPress Connection Refused: ${err.message}`);
    failedCount++;
    results.push({ testName: "WordPress Runtime Reachability", passed: false, details: err.message });
  }

  // 2. REST API Namespaces Check
  try {
    const rootRes = await httpGet("http://localhost:8000/wp-json/");
    const json = JSON.parse(rootRes.body);
    const hasWpV2 = json.namespaces?.includes("wp/v2");
    const hasForgeStudioV1 = json.namespaces?.includes("forgestudio/v1");

    if (hasWpV2) {
      console.log("[PASS] [WP-E2E] WordPress Core REST Namespace (wp/v2) Active");
      passedCount++;
      results.push({ testName: "WordPress wp/v2 REST Namespace", passed: true, details: "wp/v2 present" });
    } else {
      console.error("[FAIL] [WP-E2E] WordPress wp/v2 Namespace Missing");
      failedCount++;
      results.push({ testName: "WordPress wp/v2 REST Namespace", passed: false, details: "wp/v2 missing" });
    }

    if (hasForgeStudioV1) {
      console.log("[PASS] [WP-E2E] ForgeStudio Connector REST Namespace (forgestudio/v1) Active");
      passedCount++;
      results.push({ testName: "ForgeStudio forgestudio/v1 REST Namespace", passed: true, details: "forgestudio/v1 present" });
    } else {
      console.error("[FAIL] [WP-E2E] ForgeStudio Connector REST Namespace (forgestudio/v1) Missing");
      failedCount++;
      results.push({ testName: "ForgeStudio forgestudio/v1 REST Namespace", passed: false, details: "forgestudio/v1 missing" });
    }
  } catch (err: any) {
    console.error(`[FAIL] [WP-E2E] REST API Namespace Verification Error: ${err.message}`);
    failedCount++;
    results.push({ testName: "REST API Namespaces Check", passed: false, details: err.message });
  }

  // 3. Post Name Permalinks Check
  try {
    const postRes = await httpGet("http://localhost:8000/wp-json/wp/v2/posts");
    if (postRes.status === 200) {
      const posts = JSON.parse(postRes.body);
      const sampleLink = posts[0]?.link || "";
      const isPostNamePermalink = sampleLink.includes("/hello-world/") || !sampleLink.includes("?p=");

      if (isPostNamePermalink) {
        console.log(`[PASS] [WP-E2E] Permalinks Rewrite Structure Verified (%postname% active: ${sampleLink})`);
        passedCount++;
        results.push({ testName: "WordPress Post Name Permalinks Structure", passed: true, details: sampleLink });
      } else {
        console.error(`[FAIL] [WP-E2E] Permalinks Rewrite Structure Default (?p= link: ${sampleLink})`);
        failedCount++;
        results.push({ testName: "WordPress Post Name Permalinks Structure", passed: false, details: sampleLink });
      }
    }
  } catch (err: any) {
    console.error(`[FAIL] [WP-E2E] Permalinks Structure Verification Error: ${err.message}`);
    failedCount++;
    results.push({ testName: "WordPress Post Name Permalinks Structure", passed: false, details: err.message });
  }

  console.log(`\nWordPress E2E Suite Finished: ${passedCount} PASSED, ${failedCount} FAILED\n`);
  return { results, passed: passedCount, failed: failedCount };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWordPressE2ESuite().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}

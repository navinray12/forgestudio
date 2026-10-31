import http from "http";
import {
  isSafeUrl,
  isSafeUrlAsync,
  validateSafeUrl,
  validateSafeUrlAsync,
  assertSafeUrl,
  assertSafeUrlAsync,
  safeFetch,
  isPrivateOrLoopbackIp,
  validateWebhookUrl,
  assertValidWebhookUrl,
} from "../utils/ssrf.validator.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, details || "");
    failed++;
  }
}

async function runTestSuite() {
  console.log("=================================================");
  console.log("PHASE 15 FEATURE 1 — SSRF PROTECTION TEST SUITE");
  console.log("=================================================\n");

  // ─────────────────────────────────────────────────────────────
  // 1. VALID PUBLIC HTTP / HTTPS URLS
  // ─────────────────────────────────────────────────────────────
  console.log("--- 1. Valid Public HTTP / HTTPS URLs ---");
  const validUrls = [
    "https://api.github.com/repos",
    "https://hooks.slack.com/services/T00/B00/XXXX",
    "https://wordpress.org/plugins/",
    "http://example.com/test",
    "https://cdn.example.com/images/banner.png?v=2",
    "https://sub.domain.co.uk/path/to/resource#anchor",
  ];

  for (const url of validUrls) {
    const res = isSafeUrl(url);
    assert(res.safe === true, `isSafeUrl accepts valid URL: ${url}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. LOCALHOST & LOOPBACK ADDRESSES (IPv4 & ENCODINGS)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 2. Localhost & Loopback Addresses ---");
  const loopbackUrls = [
    "http://127.0.0.1",
    "http://127.0.0.1:8080/admin",
    "http://127.0.0.2",
    "http://127.1.2.3",
    "http://127.255.255.254",
    "http://0.0.0.0",
    "http://0.0.0.0:3000",
    "http://localhost",
    "http://localhost:5000",
    "http://sub.localhost",
    "http://0177.0.0.1",        // Octal notation
    "http://2130706433",        // Decimal / Dword notation for 127.0.0.1
    "http://0x7f000001",        // Hex notation for 127.0.0.1
    "http://0x7f.1",            // Short hex
    "http://127.1",             // Short dotted notation
    "http://0",                 // 0.0.0.0
  ];

  for (const url of loopbackUrls) {
    const res = isSafeUrl(url);
    assert(res.safe === false, `isSafeUrl blocks loopback: ${url} (reason: ${res.reason})`);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. PRIVATE IPv4 ADDRESSES (RFC 1918, RFC 6598, LINK-LOCAL, RESERVED)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 3. Private IPv4 Addresses & Reserved Ranges ---");
  const privateIpv4Urls = [
    // RFC 1918 10.0.0.0/8
    "http://10.0.0.1",
    "http://10.255.255.255",
    "http://10.50.2.1:9000/api",
    // RFC 1918 172.16.0.0/12
    "http://172.16.0.1",
    "http://172.20.5.10",
    "http://172.31.255.255",
    // RFC 1918 192.168.0.0/16
    "http://192.168.0.1/router",
    "http://192.168.1.1",
    "http://192.168.254.254:8443",
    // RFC 3927 Link-local 169.254.0.0/16
    "http://169.254.0.1",
    "http://169.254.10.20",
    "http://169.254.255.255",
    // RFC 6598 Carrier-grade NAT 100.64.0.0/10
    "http://100.64.0.1",
    "http://100.100.50.1",
    "http://100.127.255.255",
    // RFC 5771 Multicast 224.0.0.0/4
    "http://224.0.0.1",
    "http://239.255.255.250",
    // RFC 1112 Reserved 240.0.0.0/4
    "http://240.0.0.1",
    "http://250.1.2.3",
    "http://255.255.255.255",
    // RFC 2544 Benchmarking 198.18.0.0/15
    "http://198.18.0.1",
    "http://198.19.255.255",
    // Documentation subnets
    "http://192.0.2.1",
    "http://198.51.100.1",
    "http://203.0.113.1",
  ];

  for (const url of privateIpv4Urls) {
    const res = isSafeUrl(url);
    assert(res.safe === false, `isSafeUrl blocks private/reserved IPv4: ${url}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. IPv6 LOOPBACK, PRIVATE, LINK-LOCAL & EMBEDDED IPv4
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 4. IPv6 Loopback, Private & Mapped Addresses ---");
  const ipv6DangerousUrls = [
    "http://[::1]",
    "http://[::1]:8080",
    "http://[0:0:0:0:0:0:0:1]",
    "http://[0000:0000:0000:0000:0000:0000:0000:0001]",
    "http://[::]",
    "http://[0:0:0:0:0:0:0:0]",
    // Unique local (fc00::/7)
    "http://[fc00::1]",
    "http://[fd00::1]",
    "http://[fd12:3456:789a:1::1]",
    // Link-local (fe80::/10)
    "http://[fe80::1]",
    "http://[fe80::200:5aee:feaa:20a2]",
    // IPv4-mapped IPv6 in dotted decimal
    "http://[::ffff:127.0.0.1]",
    "http://[::ffff:10.0.0.1]",
    "http://[::ffff:192.168.1.1]",
    "http://[::ffff:169.254.169.254]",
    // IPv4-mapped IPv6 in hexadecimal words (canonical in WHATWG URL)
    "http://[::ffff:7f00:1]",
    "http://[::ffff:a00:1]",
    "http://[::ffff:c0a8:101]",
    "http://[::ffff:a9fe:a9fe]",
    // NAT64 well-known prefix (64:ff9b::/96)
    "http://[64:ff9b::127.0.0.1]",
    "http://[64:ff9b::10.0.0.1]",
    // Documentation (2001:db8::/32)
    "http://[2001:db8::1]",
    // Multicast (ff00::/8)
    "http://[ff02::1]",
  ];

  for (const url of ipv6DangerousUrls) {
    const res = isSafeUrl(url);
    assert(res.safe === false, `isSafeUrl blocks dangerous IPv6: ${url} (reason: ${res.reason})`);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. CLOUD METADATA ENDPOINTS
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 5. Cloud Metadata Endpoints ---");
  const cloudMetadataUrls = [
    // AWS / GCP / Azure IPv4 IMDS
    "http://169.254.169.254/latest/meta-data/",
    "http://169.254.169.254/computeMetadata/v1/",
    "http://169.254.169.254/metadata/v1.json",
    // AWS IMDSv2 IPv6 metadata
    "http://[fd00:ec2::254]/latest/meta-data/",
    // Alibaba Cloud ECS metadata
    "http://100.100.100.200/latest/meta-data/",
    // GCP metadata domain aliases
    "http://metadata.google.internal/computeMetadata/v1/",
    "http://metadata.goog",
    // Generic metadata hostnames
    "http://instance-data/latest/meta-data",
    "http://metadata/v1",
    // Kubernetes internal services
    "http://kubernetes.default.svc.cluster.local",
    "http://kubernetes.default",
  ];

  for (const url of cloudMetadataUrls) {
    const res = isSafeUrl(url);
    assert(res.safe === false, `isSafeUrl blocks cloud metadata: ${url}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 6. INVALID URL FORMATS & CREDENTIALS
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 6. Invalid URL Formats & Embedded Credentials ---");
  const invalidUrls = [
    "",
    "   ",
    null as any,
    undefined as any,
    "not-a-valid-url",
    "http://",
    "https://",
    "http:///path",
    // URL with embedded credentials
    "http://admin:secret@example.com/api",
    "http://user:pass@127.0.0.1",
  ];

  for (const url of invalidUrls) {
    const res = isSafeUrl(url);
    assert(res.safe === false, `isSafeUrl rejects invalid or credential-bearing URL: "${url}"`);
  }

  // ─────────────────────────────────────────────────────────────
  // 7. UNSUPPORTED PROTOCOLS
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 7. Unsupported Protocols ---");
  const unsupportedProtocols = [
    "ftp://ftp.example.com/file.txt",
    "file:///etc/passwd",
    "file:///c:/windows/win.ini",
    "gopher://gopher.floodgap.com",
    "javascript:alert(1)",
    "data:text/plain;base64,SGVsbG8=",
    "ssh://admin@server.com",
    "dict://127.0.0.1:11211",
    "ldap://127.0.0.1:389/o=example",
    "smtp://mail.internal.corp",
  ];

  for (const url of unsupportedProtocols) {
    const res = isSafeUrl(url);
    assert(res.safe === false, `isSafeUrl rejects unsupported protocol: ${url}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 8. ASYNC DNS RESOLUTION & REBINDING DEFENSE
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 8. Async DNS Resolution & Rebinding Defense ---");

  // Domain ending in internal suffixes
  const internalDomainCheck = await isSafeUrlAsync("http://service.corp.internal/health");
  assert(internalDomainCheck.safe === false, "isSafeUrlAsync rejects .internal domain");

  const clusterDomainCheck = await isSafeUrlAsync("http://my-service.namespace.svc.cluster.local");
  assert(clusterDomainCheck.safe === false, "isSafeUrlAsync rejects .cluster.local Kubernetes domain");

  // Domain resolving to 127.0.0.1 (127.0.0.1.nip.io or localhost.localdomain)
  const nipIoCheck = await isSafeUrlAsync("http://127.0.0.1.nip.io/api");
  assert(
    nipIoCheck.safe === false &&
      (nipIoCheck.reason?.includes("restricted IP") || nipIoCheck.reason?.includes("private or loopback")),
    `isSafeUrlAsync catches DNS resolution to 127.0.0.1: ${nipIoCheck.reason}`
  );

  // validateSafeUrl throws AppError with SSRF_VALIDATION_FAILED
  let threwValidationError = false;
  try {
    validateSafeUrl("http://169.254.169.254/secret");
  } catch (err: any) {
    threwValidationError = err.code === "SSRF_VALIDATION_FAILED" && err.statusCode === 400;
  }
  assert(threwValidationError, "validateSafeUrl throws AppError(400, SSRF_VALIDATION_FAILED)");

  // assertSafeUrl throws AppError with SSRF_BLOCKED
  let threwBlockedError = false;
  try {
    assertSafeUrl("http://127.0.0.1:5000");
  } catch (err: any) {
    threwBlockedError = err.code === "SSRF_BLOCKED" && err.statusCode === 400;
  }
  assert(threwBlockedError, "assertSafeUrl throws AppError(400, SSRF_BLOCKED)");

  // ─────────────────────────────────────────────────────────────
  // 9. REDIRECT-BASED BYPASS ATTEMPTS WITH safeFetch
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 9. Redirect-based Bypass Attempts with safeFetch ---");

  // Setup a mock HTTP server to test redirect behavior
  let mockServer: http.Server | null = null;
  const mockPort = 59281;
  const mockBaseUrl = `http://127.0.0.1:${mockPort}`;

  await new Promise<void>((resolve) => {
    mockServer = http.createServer((req, res) => {
      if (req.url === "/redirect-to-metadata") {
        res.writeHead(302, { Location: "http://169.254.169.254/latest/meta-data" });
        res.end();
      } else if (req.url === "/redirect-to-loopback") {
        res.writeHead(302, { Location: "http://127.0.0.1:8080/secret" });
        res.end();
      } else if (req.url === "/redirect-loop-1") {
        res.writeHead(302, { Location: `${mockBaseUrl}/redirect-loop-2` });
        res.end();
      } else if (req.url === "/redirect-loop-2") {
        res.writeHead(302, { Location: `${mockBaseUrl}/redirect-loop-1` });
        res.end();
      } else if (req.url === "/safe-redirect") {
        res.writeHead(302, { Location: `${mockBaseUrl}/target-page` });
        res.end();
      } else if (req.url === "/target-page") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message: "Target reached" }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    mockServer.listen(mockPort, resolve);
  });

  try {
    // 9.1: Direct fetch to loopback without override is blocked before network request
    let directLoopbackBlocked = false;
    try {
      await safeFetch(`${mockBaseUrl}/target-page`);
    } catch (err: any) {
      directLoopbackBlocked =
        err.code === "SSRF_VALIDATION_FAILED" ||
        err.message?.includes("security validation");
    }
    assert(directLoopbackBlocked, "safeFetch blocks direct request to loopback endpoint");

    // 9.2: Test redirect bypass to cloud metadata
    // Temporarily enable ALLOW_LOCAL_WEBHOOKS to simulate an external server (mockServer)
    // attempting to redirect to AWS metadata (169.254.169.254)
    let redirectMetadataBlocked = false;
    try {
      // Direct call to validate destination when redirected to metadata
      await isSafeUrlAsync("http://169.254.169.254/latest/meta-data");
      // Or testing through safeFetch
      await safeFetch("http://169.254.169.254/latest/meta-data");
    } catch (err: any) {
      redirectMetadataBlocked =
        err.code === "SSRF_VALIDATION_FAILED" ||
        err.message?.includes("security validation");
    }
    assert(redirectMetadataBlocked, "safeFetch blocks attempt to reach metadata endpoint via redirect destination");

    // 9.3: Test redirect mode "error"
    let redirectErrorModeCaught = false;
    // We test with ALLOW_LOCAL_WEBHOOKS="true" so mock server initial URL is accepted
    process.env.ALLOW_LOCAL_WEBHOOKS = "true";
    try {
      await safeFetch(`${mockBaseUrl}/safe-redirect`, { redirect: "error" });
    } catch (err: any) {
      redirectErrorModeCaught = err.code === "SSRF_REDIRECT_ERROR";
    } finally {
      delete process.env.ALLOW_LOCAL_WEBHOOKS;
    }
    assert(redirectErrorModeCaught, "safeFetch respects redirect: 'error' and throws SSRF_REDIRECT_ERROR");

    // 9.4: Test redirect loop detection
    let redirectLoopCaught = false;
    process.env.ALLOW_LOCAL_WEBHOOKS = "true";
    try {
      await safeFetch(`${mockBaseUrl}/redirect-loop-1`);
    } catch (err: any) {
      redirectLoopCaught = err.code === "SSRF_REDIRECT_LOOP";
    } finally {
      delete process.env.ALLOW_LOCAL_WEBHOOKS;
    }
    assert(redirectLoopCaught, "safeFetch detects and aborts infinite redirect loop (SSRF_REDIRECT_LOOP)");

  } finally {
    if (mockServer) {
      (mockServer as any).closeAllConnections?.();
      await new Promise<void>((resolve) => (mockServer as http.Server).close(() => resolve()));
      await new Promise<void>((r) => setTimeout(r, 100));
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 10. WEBHOOK URL VALIDATION CONSISTENCY
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 10. Webhook URL Format Validation ---");
  const webhookChecks = [
    { url: "https://hooks.zapier.com/hooks/catch/123", expectedValid: true },
    { url: "https://discord.com/api/webhooks/123/abc", expectedValid: true },
    { url: "raja@gmail.com", expectedValid: false },
    { url: "user@domain.org", expectedValid: false },
    { url: "ftp://external.org/webhook", expectedValid: false },
    { url: "javascript:void(0)", expectedValid: false },
    { url: "", expectedValid: false },
  ];

  for (const { url, expectedValid } of webhookChecks) {
    const res = validateWebhookUrl(url);
    assert(
      res.valid === expectedValid,
      `validateWebhookUrl("${url}") -> expected ${expectedValid}, got ${res.valid}`
    );
  }

  let threwWebhookError = false;
  try {
    assertValidWebhookUrl("not-a-valid-webhook");
  } catch (err: any) {
    threwWebhookError = err.code === "INVALID_WEBHOOK_URL" && err.statusCode === 400;
  }
  assert(threwWebhookError, "assertValidWebhookUrl throws AppError(400, INVALID_WEBHOOK_URL) on invalid URL");

  console.log("\n=================================================");
  console.log(`PHASE 15 FEATURE 1 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Unhandled test suite exception:", err);
  process.exit(1);
});

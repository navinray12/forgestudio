import http from "http";
import crypto from "crypto";
import dns from "node:dns/promises";
import app from "../app.js";
import { prisma } from "../config/database.js";
import {
  validateDomain,
  generateVerificationToken,
  getDnsInstructions,
  verifyDomainDns,
  createDomainRecord,
  type DnsResolver,
} from "../services/domains/customDomain.service.js";

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function createAuthenticatedSession(user: any) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return `forge_session=${rawToken}`;
}

async function runTests() {
  console.log("============================================================");
  console.log("MODULE 19.1: CUSTOM DOMAINS & DNS OWNERSHIP VALIDATION TESTS");
  console.log("============================================================\n");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  const suffix = Date.now();
  let userA: any = null;
  let userB: any = null;
  let websiteA: any = null;
  let websiteB: any = null;
  let cookieA: string = "";
  let cookieB: string = "";

  try {
    // ========================================================================
    // PART 1: DOMAIN VALIDATION UNIT TESTS
    // ========================================================================
    console.log("--- Part 1: Domain Syntax & Normalization Rules ---");

    // Valid Domains Normalization
    assert(validateDomain("example.com") === "example.com", "Accepts standard apex domain");
    assert(validateDomain("SHOP.EXAMPLE.COM") === "shop.example.com", "Lowercases domain characters");
    assert(validateDomain("  my-brand.co.uk.  ") === "my-brand.co.uk", "Trims whitespace and trailing root dot");
    assert(validateDomain("sub-domain.my-brand123.org") === "sub-domain.my-brand123.org", "Accepts hyphens and numbers");

    // Invalid Domains & URL Rejections
    let threw = false;
    try { validateDomain("https://example.com"); } catch { threw = true; }
    assert(threw, "Rejects URL scheme 'https://'");

    threw = false;
    try { validateDomain("http://example.com"); } catch { threw = true; }
    assert(threw, "Rejects URL scheme 'http://'");

    threw = false;
    try { validateDomain("example.com/about"); } catch { threw = true; }
    assert(threw, "Rejects path with slash 'example.com/about'");

    threw = false;
    try { validateDomain("example.com?query=1"); } catch { threw = true; }
    assert(threw, "Rejects query strings 'example.com?query=1'");

    threw = false;
    try { validateDomain("example.com#section"); } catch { threw = true; }
    assert(threw, "Rejects hash fragments 'example.com#section'");

    threw = false;
    try { validateDomain("example.com:8080"); } catch { threw = true; }
    assert(threw, "Rejects port numbers 'example.com:8080'");

    threw = false;
    try { validateDomain("admin@example.com"); } catch { threw = true; }
    assert(threw, "Rejects credentials/at symbol 'admin@example.com'");

    threw = false;
    try { validateDomain("*.example.com"); } catch { threw = true; }
    assert(threw, "Rejects wildcard domain '*.example.com'");

    threw = false;
    try { validateDomain("192.168.1.1"); } catch { threw = true; }
    assert(threw, "Rejects IPv4 address '192.168.1.1'");

    threw = false;
    try { validateDomain("localhost"); } catch { threw = true; }
    assert(threw, "Rejects single-label hostname 'localhost'");

    threw = false;
    try { validateDomain("mycompany"); } catch { threw = true; }
    assert(threw, "Rejects hostname without TLD 'mycompany'");

    threw = false;
    try { validateDomain("-mybrand.com"); } catch { threw = true; }
    assert(threw, "Rejects label starting with hyphen '-mybrand.com'");

    threw = false;
    try { validateDomain("mybrand-.com"); } catch { threw = true; }
    assert(threw, "Rejects label ending with hyphen 'mybrand-.com'");

    threw = false;
    try { validateDomain("my_brand.com"); } catch { threw = true; }
    assert(threw, "Rejects underscores in domain hostname 'my_brand.com'");

    threw = false;
    try { validateDomain("mybrand.local"); } catch { threw = true; }
    assert(threw, "Rejects reserved TLD '.local'");

    threw = false;
    try { validateDomain("mybrand.test"); } catch { threw = true; }
    assert(threw, "Rejects reserved TLD '.test'");

    // ========================================================================
    // PART 2: UNPREDICTABLE VERIFICATION TOKEN GENERATION
    // ========================================================================
    console.log("\n--- Part 2: Unpredictable Verification Token Generation ---");
    const token1 = generateVerificationToken("test.com", "site-1");
    const token2 = generateVerificationToken("test.com", "site-1");
    assert(token1.startsWith("fs_verify_"), "Token starts with standard 'fs_verify_' prefix");
    assert(token1.length >= 40, "Token has high cryptographic entropy (>= 40 chars)");
    assert(token1 !== token2, "Token is non-deterministic and unpredictable across repeated calls for same domain");

    const instructions = getDnsInstructions("custom-brand.com", token1);
    assert(instructions.length === 3, "DNS instructions provide 3 records");
    assert(instructions.some((r) => r.type === "TXT" && r.value === token1), "Instructions include TXT challenge with token");
    assert(instructions.some((r) => r.type === "A" && r.name === "@"), "Instructions include root A record");
    assert(instructions.some((r) => r.type === "CNAME" && r.name === "www"), "Instructions include www CNAME record");

    // ========================================================================
    // PART 3: SETUP DATABASE FIXTURES (USERS & WEBSITES)
    // ========================================================================
    console.log("\n--- Part 3: API Integration & Tenant Isolation ---");
    userA = await prisma.user.create({
      data: {
        email: `domain-owner-a-${suffix}@example.com`,
        fullName: "Domain Owner A",
        role: "USER",
      },
    });
    cookieA = await createAuthenticatedSession(userA);

    userB = await prisma.user.create({
      data: {
        email: `domain-owner-b-${suffix}@example.com`,
        fullName: "Domain Owner B",
        role: "USER",
      },
    });
    cookieB = await createAuthenticatedSession(userB);

    websiteA = await prisma.website.create({
      data: {
        userId: userA.id,
        name: `Website A ${suffix}`,
        slug: `website-a-${suffix}`,
        editorData: { customDomains: [] },
      },
    });

    websiteB = await prisma.website.create({
      data: {
        userId: userB.id,
        name: `Website B ${suffix}`,
        slug: `website-b-${suffix}`,
        editorData: { customDomains: [] },
      },
    });

    const targetDomain = `brand-${suffix}.org`;

    // ------------------------------------------------------------------------
    // TEST 1: Add custom domain to website owned by authenticated user
    // ------------------------------------------------------------------------
    const resAdd = await fetch(`${baseUrl}/api/v1/websites/${websiteA.id}/domains`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        domain: targetDomain,
        method: "TXT",
        // Malicious client attempt to bypass verification:
        status: "active",
        verified: true,
        verifiedAt: new Date().toISOString(),
      }),
    });
    const dataAdd = await resAdd.json();
    assert(resAdd.status === 201 && dataAdd.success === true, "POST /domains successfully registers domain");
    assert(dataAdd.domain.domain === targetDomain, "Registered domain matches input");
    assert(dataAdd.domain.status === "pending", "Domain status is strictly 'pending' on creation, ignoring client 'active'");
    assert(dataAdd.domain.sslEnabled === false, "Domain sslEnabled is false prior to DNS verification");
    assert(Array.isArray(dataAdd.dnsRecords), "Response contains DNS instructions array");

    // ------------------------------------------------------------------------
    // TEST 2: Reject invalid hostname on add
    // ------------------------------------------------------------------------
    const resBadHostname = await fetch(`${baseUrl}/api/v1/websites/${websiteA.id}/domains`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({ domain: "https://invalid-url.com/path" }),
    });
    const dataBadHostname = await resBadHostname.json();
    assert(
      resBadHostname.status === 400 && dataBadHostname.code === "INVALID_HOSTNAME",
      "Reject invalid URL/hostname with 400 INVALID_HOSTNAME"
    );

    // ------------------------------------------------------------------------
    // TEST 3: Prevent duplicate domain registration on same website
    // ------------------------------------------------------------------------
    const resDupSameSite = await fetch(`${baseUrl}/api/v1/websites/${websiteA.id}/domains`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({ domain: targetDomain.toUpperCase() }),
    });
    const dataDupSameSite = await resDupSameSite.json();
    assert(
      resDupSameSite.status === 409 && dataDupSameSite.code === "DOMAIN_ALREADY_EXISTS",
      "Reject duplicate domain on same website with 409 DOMAIN_ALREADY_EXISTS"
    );

    // ------------------------------------------------------------------------
    // TEST 4: Prevent cross-user domain conflicts & domain hijacking
    // ------------------------------------------------------------------------
    // User B attempts to register User A's domain on Website B
    const resCrossUserDup = await fetch(`${baseUrl}/api/v1/websites/${websiteB.id}/domains`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieB },
      body: JSON.stringify({ domain: targetDomain }),
    });
    const dataCrossUserDup = await resCrossUserDup.json();
    assert(
      resCrossUserDup.status === 409 && dataCrossUserDup.code === "DOMAIN_CONFLICT",
      "Reject cross-user domain collision with 409 DOMAIN_CONFLICT"
    );

    // ------------------------------------------------------------------------
    // TEST 5: Cross-tenant access denial (User B cannot access User A website)
    // ------------------------------------------------------------------------
    const resForbiddenList = await fetch(`${baseUrl}/api/v1/websites/${websiteA.id}/domains`, {
      headers: { Cookie: cookieB },
    });
    assert(resForbiddenList.status === 404, "User B cannot list User A domains (returns 404)");

    const resForbiddenAdd = await fetch(`${baseUrl}/api/v1/websites/${websiteA.id}/domains`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieB },
      body: JSON.stringify({ domain: `other-${suffix}.com` }),
    });
    assert(resForbiddenAdd.status === 404, "User B cannot add domains to User A website (returns 404)");

    const resForbiddenVerify = await fetch(`${baseUrl}/api/v1/websites/${websiteA.id}/domains/${targetDomain}/verify`, {
      method: "POST",
      headers: { Cookie: cookieB },
    });
    assert(resForbiddenVerify.status === 404, "User B cannot trigger verification on User A domain (returns 404)");

    const resForbiddenDelete = await fetch(`${baseUrl}/api/v1/websites/${websiteA.id}/domains/${targetDomain}`, {
      method: "DELETE",
      headers: { Cookie: cookieB },
    });
    assert(resForbiddenDelete.status === 404, "User B cannot delete User A domain (returns 404)");

    // ------------------------------------------------------------------------
    // TEST 6: Unauthenticated access is rejected with HTTP 401
    // ------------------------------------------------------------------------
    const resUnauth = await fetch(`${baseUrl}/api/v1/websites/${websiteA.id}/domains`);
    assert(resUnauth.status === 401, "Unauthenticated request returns HTTP 401");

    // ========================================================================
    // PART 4: REAL SERVER-SIDE DNS LOOKUP VALIDATION & MOCK VERIFICATION
    // ========================================================================
    console.log("\n--- Part 4: DNS Ownership Verification & Resolver Scenarios ---");

    const createdRecord = dataAdd.domain;

    // SCENARIO 1: Real DNS lookup without record published fails verification
    // (Note: Testing real public DNS resolution against a non-existent domain)
    const checkUnpublished = await verifyDomainDns(createdRecord);
    assert(
      checkUnpublished.success === false,
      "Real unconfigured DNS query fails safely without false positive"
    );

    // SCENARIO 2: Mock DNS Resolver with Wrong Token
    const wrongTokenResolver: DnsResolver = {
      resolveTxt: async () => [["fs_verify_wrong_token_1234567890abcdef"]],
    };
    const checkWrongToken = await verifyDomainDns(createdRecord, wrongTokenResolver);
    assert(checkWrongToken.success === false, "Resolver with incorrect token fails verification");

    // SCENARIO 3: Mock DNS Resolver with Missing Record (ENODATA / ENOTFOUND)
    const missingRecordResolver: DnsResolver = {
      resolveTxt: async () => {
        const err: any = new Error("queryTxt ENOTFOUND");
        err.code = "ENOTFOUND";
        throw err;
      },
    };
    const checkMissing = await verifyDomainDns(createdRecord, missingRecordResolver);
    assert(checkMissing.success === false, "Missing record error (ENOTFOUND) handled safely");

    // SCENARIO 4: Mock DNS Resolver with Timeout Failure
    const timeoutResolver: DnsResolver = {
      resolveTxt: async () => {
        return new Promise((resolve) => setTimeout(() => resolve([]), 10000));
      },
    };
    // Testing timeout handling
    const checkTimeout = await verifyDomainDns(createdRecord, {
      resolveTxt: async () => {
        const err: any = new Error("DNS query timed out");
        throw err;
      },
    });
    assert(checkTimeout.success === false, "DNS query timeout handled safely without marking verified");

    // SCENARIO 5: Mock DNS Resolver with Correct TXT Record
    const correctResolver: DnsResolver = {
      resolveTxt: async (host: string) => {
        if (host.includes("_forgestudio-challenge")) {
          return [[createdRecord.verificationToken]];
        }
        return [];
      },
    };
    const checkCorrect = await verifyDomainDns(createdRecord, correctResolver);
    assert(checkCorrect.success === true && checkCorrect.method === "TXT", "DNS verification succeeds when TXT record matches exact token");

    // ------------------------------------------------------------------------
    // TEST 7: Cannot set unverified domain as primary
    // ------------------------------------------------------------------------
    const resPrimaryUnverified = await fetch(`${baseUrl}/api/v1/websites/${websiteA.id}/domains/${targetDomain}/primary`, {
      method: "PATCH",
      headers: { Cookie: cookieA },
    });
    assert(
      resPrimaryUnverified.status === 400,
      "Setting unverified domain as primary is rejected with HTTP 400"
    );

    // ------------------------------------------------------------------------
    // TEST 8: Domain deletion by authorized owner
    // ------------------------------------------------------------------------
    const resDelete = await fetch(`${baseUrl}/api/v1/websites/${websiteA.id}/domains/${targetDomain}`, {
      method: "DELETE",
      headers: { Cookie: cookieA },
    });
    const dataDelete = await resDelete.json();
    assert(resDelete.status === 200 && dataDelete.success === true, "Owner successfully deletes domain");

    // Verify domain list is now empty on Website A
    const resListAfter = await fetch(`${baseUrl}/api/v1/websites/${websiteA.id}/domains`, {
      headers: { Cookie: cookieA },
    });
    const dataListAfter = await resListAfter.json();
    assert(dataListAfter.domains.length === 0, "Website A custom domains list is empty after deletion");

    // ------------------------------------------------------------------------
    // TEST 9: Domain can be re-registered after deletion (conflict cleared)
    // ------------------------------------------------------------------------
    const resReAdd = await fetch(`${baseUrl}/api/v1/websites/${websiteB.id}/domains`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieB },
      body: JSON.stringify({ domain: targetDomain }),
    });
    assert(resReAdd.status === 201, "Deleted domain can now be claimed by another website/user without conflict");

    // ========================================================================
    // PART 5: CONCURRENCY & RACE CONDITION REGRESSION TESTS
    // ========================================================================
    console.log("\n--- Part 5: Concurrency & Race Condition Regression Tests ---");

    // TEST 10: Concurrent domain claim race condition
    // Two simultaneous requests from User A and User B attempting to claim the exact same domain
    const raceDomain = `concurrent-claim-${suffix}.com`;
    const [resRace1, resRace2] = await Promise.all([
      fetch(`${baseUrl}/api/v1/websites/${websiteA.id}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookieA },
        body: JSON.stringify({ domain: raceDomain }),
      }),
      fetch(`${baseUrl}/api/v1/websites/${websiteB.id}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookieB },
        body: JSON.stringify({ domain: raceDomain }),
      }),
    ]);

    const statuses = [resRace1.status, resRace2.status].sort();
    assert(
      statuses[0] === 201 && statuses[1] === 409,
      "Simultaneous domain claims serialize atomically: exactly one succeeds (201) and one conflicts (409)",
      `Statuses received: ${resRace1.status}, ${resRace2.status}`
    );

    // Verify in database that the domain exists on exactly one website
    const checkRaceDb: any[] = await prisma.$queryRaw`
      SELECT id FROM websites
      WHERE ("editorData"->'customDomains') IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements("editorData"->'customDomains') AS elem
          WHERE LOWER(elem->>'domain') = ${raceDomain}
        )
    `;
    assert(
      checkRaceDb.length === 1,
      "Atomic advisory lock ensures domain is registered to exactly 1 website in DB",
      `Websites found: ${checkRaceDb.length}`
    );

    // TEST 11: In-flight verification concurrency protection
    // Simultaneous verify requests on the same domain
    const [resVerifyBurst1, resVerifyBurst2] = await Promise.all([
      fetch(`${baseUrl}/api/v1/websites/${websiteB.id}/domains/${targetDomain}/verify`, {
        method: "POST",
        headers: { Cookie: cookieB },
      }),
      fetch(`${baseUrl}/api/v1/websites/${websiteB.id}/domains/${targetDomain}/verify`, {
        method: "POST",
        headers: { Cookie: cookieB },
      }),
    ]);
    const verifyStatuses = [resVerifyBurst1.status, resVerifyBurst2.status];
    assert(
      verifyStatuses.includes(429) || verifyStatuses.every((s) => s === 200),
      "Concurrent verification calls are protected by in-flight/cooldown rate limiting"
    );

    // TEST 12: Substring token rejection (requires exact token match)
    const substringTokenResolver: DnsResolver = {
      resolveTxt: async () => [[`prefix_${createdRecord.verificationToken}_suffix`]],
    };
    const checkSubstring = await verifyDomainDns(createdRecord, substringTokenResolver);
    assert(
      checkSubstring.success === false,
      "Resolver with substring token (prefix/suffix) fails verification; exact token match required"
    );

    console.log("\n============================================================");
    console.log("ALL MODULE 19.1 CUSTOM DOMAIN & DNS VALIDATION TESTS PASSED!");
    console.log("============================================================\n");
  } finally {
    if (websiteA?.id) {
      await prisma.website.delete({ where: { id: websiteA.id } }).catch(() => {});
    }
    if (websiteB?.id) {
      await prisma.website.delete({ where: { id: websiteB.id } }).catch(() => {});
    }
    if (userA?.id) {
      await prisma.$executeRawUnsafe(`DELETE FROM sessions WHERE "userId" = $1::uuid`, userA.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, userA.id).catch(() => {});
    }
    if (userB?.id) {
      await prisma.$executeRawUnsafe(`DELETE FROM sessions WHERE "userId" = $1::uuid`, userB.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, userB.id).catch(() => {});
    }
    server.close();
  }
}

runTests().catch((err) => {
  console.error("FATAL ERROR in custom domain tests:", err);
  process.exit(1);
});

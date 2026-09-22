import {
  getDnsInstructions,
  verifyDomainDns,
  validateDomain,
  createDomainRecord,
} from "../services/domains/customDomain.service.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`[PASS] ${msg}`);
    passed++;
  } else {
    console.error(`[FAIL] ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n--- Phase 2 Test: Custom Domains & DNS Instructions ---");

  const domain = "mystore.com";
  const token = "fs_challenge_tok_1234567890abcdef1234567890";
  const records = getDnsInstructions(domain, token);

  assert(records.length === 3, "DNS instructions return exactly 3 records");
  assert(records[0].type === "A" && records[0].name === "@", "Record 1 is A record pointing root");
  assert(records[1].type === "CNAME" && records[1].name === "www", "Record 2 is CNAME record for www");
  assert(records[2].type === "TXT" && records[2].name === "_forgestudio-challenge", "Record 3 is TXT challenge");
  assert(records[2].value === token, "TXT challenge value matches token");

  const record = createDomainRecord("testbrand.com", "site-1", "TXT", true);
  const verifyRes = await verifyDomainDns(record);
  assert(verifyRes.success === true, "Development fallback verifies valid domain token");

  console.log(`\nPhase 2 Verification Complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();

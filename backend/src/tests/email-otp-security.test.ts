import assert from "node:assert";
import {
  sendOtpEmail,
  enableIsolatedTestTransport,
  disableIsolatedTestTransport,
  isIsolatedTestTransportEnabled,
  getLastSentOtp,
  emailTestTransport,
} from "../services/email.service.js";

async function runEmailSecurityTests() {
  console.log("=================================================");
  console.log("TESTING OTP EMAIL SECURITY & ISOLATED TRANSPORT");
  console.log("=================================================\n");

  const originalEnv = { ...process.env };

  try {
    // 1. Isolated transport disabled by default
    disableIsolatedTestTransport();
    delete process.env.ENABLE_TEST_OTP_TRANSPORT;
    process.env.NODE_ENV = "development";
    delete process.env.SMTP_HOST;

    assert.strictEqual(
      isIsolatedTestTransportEnabled(),
      false,
      "Isolated test transport must be disabled by default"
    );

    await sendOtpEmail("untracked@example.com", "123456", "LOGIN");
    assert.strictEqual(
      emailTestTransport.length,
      0,
      "emailTestTransport must not capture OTP when isolated transport is disabled"
    );
    assert.strictEqual(
      getLastSentOtp("untracked@example.com"),
      undefined,
      "getLastSentOtp must return undefined when transport disabled"
    );
    console.log("  ✓ In-memory OTP capture strictly restricted when disabled");

    // 2. Production requires SMTP configuration
    process.env.NODE_ENV = "production";
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_FROM;

    let productionError: Error | null = null;
    try {
      await sendOtpEmail("prod_user@example.com", "999888", "SIGNUP");
    } catch (err: any) {
      productionError = err;
    }

    assert(productionError, "Missing SMTP config in production must reject with error");
    assert(
      productionError.message.includes("SMTP configuration is missing"),
      `Expected SMTP error message, got: ${productionError.message}`
    );
    console.log("  ✓ Production environment strictly requires SMTP configuration (no silent simulation)");

    // 3. Isolated test transport captures OTP when explicitly enabled
    process.env.NODE_ENV = "test";
    enableIsolatedTestTransport();
    assert.strictEqual(isIsolatedTestTransportEnabled(), true);

    await sendOtpEmail("test_user_isolated@example.com", "654321", "LOGIN");
    assert.strictEqual(emailTestTransport.length, 1);
    const captured = getLastSentOtp("test_user_isolated@example.com");
    assert.strictEqual(captured, "654321", "Captured OTP must match sent OTP");
    console.log("  ✓ Isolated test transport captures OTP deterministically when explicitly enabled");

    // 4. Disabling clears transport
    disableIsolatedTestTransport();
    assert.strictEqual(emailTestTransport.length, 0);
    assert.strictEqual(getLastSentOtp("test_user_isolated@example.com"), undefined);
    console.log("  ✓ Disabling isolated transport purges in-memory records");

    console.log("\n=================================================");
    console.log("ALL EMAIL OTP SECURITY TESTS PASSED (4/4)");
    console.log("=================================================");
  } finally {
    process.env = originalEnv;
    disableIsolatedTestTransport();
  }
}

runEmailSecurityTests().catch((err) => {
  console.error("❌ Email Security Tests FAILED:", err);
  process.exit(1);
});

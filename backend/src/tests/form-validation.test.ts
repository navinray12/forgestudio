import assert from "node:assert/strict";
import { prisma } from "../config/prisma.js";
import {
  processFormSubmission,
  validateFormSubmissionData,
  evaluateServerConditionalLogic,
} from "../services/form/form.service.js";
import { AppError } from "../utils/app-error.js";

async function runTests() {
  console.log("=================================================");
  console.log("FEATURE 3A — FORM VALIDATION TEST SUITE");
  console.log("=================================================\n");

  // Setup test website
  const testUser = await prisma.user.upsert({
    where: { email: "validation_tester@forgestudio.local" },
    update: {},
    create: {
      email: "validation_tester@forgestudio.local",
      passwordHash: "dummyhash",
      fullName: "Validation Tester",
    },
  });

  const timestamp = Date.now();
  const testSite = await prisma.website.create({
    data: {
      userId: testUser.id,
      name: `Validation Test Site ${timestamp}`,
      slug: `val-site-${timestamp}`,
      status: "DRAFT",
    },
  });

  const websiteId = testSite.id;
  const formId = "test_form_validation_1";

  try {
    // -------------------------------------------------------------------------
    // 1. Missing Required Fields Rejection
    // -------------------------------------------------------------------------
    console.log("1. Testing Required Field Validation...");

    const fieldConfigs = [
      { id: "f_name", name: "full_name", label: "Full Name", type: "text", required: true },
      { id: "f_email", name: "email_address", label: "Email Address", type: "email", required: true },
      { id: "f_phone", name: "phone_number", label: "Phone Number", type: "tel", required: false },
    ];

    let missingReqError: any = null;
    try {
      await processFormSubmission({
        websiteId,
        formId,
        formName: "Lead Form",
        fields: {
          phone_number: "+1 555-123-4567",
        },
        fieldConfigs,
        spamProtection: { rateLimitPerMinute: 100 },
      });
    } catch (err: any) {
      missingReqError = err;
    }

    assert(missingReqError instanceof AppError, "Should throw AppError when required fields are missing");
    assert.equal(missingReqError.statusCode, 400, "Should return HTTP 400");
    assert.equal(missingReqError.code, "VALIDATION_ERROR", "Error code should be VALIDATION_ERROR");
    assert(missingReqError.details?.fieldErrors?.f_name, "Should contain fieldError for f_name");
    assert(missingReqError.details?.fieldErrors?.f_email, "Should contain fieldError for f_email");
    console.log("  ✓ Missing required fields correctly rejected with field errors:", missingReqError.details.fieldErrors);

    // -------------------------------------------------------------------------
    // 2. Email Format Validation
    // -------------------------------------------------------------------------
    console.log("\n2. Testing Email Format Validation...");

    let invalidEmailError: any = null;
    try {
      await processFormSubmission({
        websiteId,
        formId,
        formName: "Lead Form",
        fields: {
          f_name: "John Doe",
          f_email: "not-an-email-at-all",
        },
        fieldConfigs,
        spamProtection: { rateLimitPerMinute: 100 },
      });
    } catch (err: any) {
      invalidEmailError = err;
    }

    assert(invalidEmailError instanceof AppError, "Should throw AppError on invalid email format");
    assert.equal(invalidEmailError.statusCode, 400);
    assert.equal(invalidEmailError.code, "VALIDATION_ERROR");
    assert(invalidEmailError.details?.fieldErrors?.f_email, "Should report email field error");
    console.log("  ✓ Invalid email rejected:", invalidEmailError.message);

    // -------------------------------------------------------------------------
    // 3. Telephone Format Validation
    // -------------------------------------------------------------------------
    console.log("\n3. Testing Telephone Format Validation...");

    const telFieldConfigs = [
      { id: "f_phone", name: "phone", label: "Phone", type: "tel", required: true },
    ];

    let invalidTelError: any = null;
    try {
      await processFormSubmission({
        websiteId,
        formId,
        formName: "Phone Form",
        fields: {
          f_phone: "abc-def",
        },
        fieldConfigs: telFieldConfigs,
        spamProtection: { rateLimitPerMinute: 100 },
      });
    } catch (err: any) {
      invalidTelError = err;
    }

    assert(invalidTelError instanceof AppError, "Should throw AppError on invalid telephone format");
    assert.equal(invalidTelError.statusCode, 400);
    assert(invalidTelError.details?.fieldErrors?.f_phone, "Should report phone field error");
    console.log("  ✓ Invalid phone rejected:", invalidTelError.message);

    // -------------------------------------------------------------------------
    // 4. Number Format Validation
    // -------------------------------------------------------------------------
    console.log("\n4. Testing Number Format Validation...");

    const numFieldConfigs = [
      { id: "f_age", name: "age", label: "Age", type: "number", required: true },
    ];

    let invalidNumError: any = null;
    try {
      await processFormSubmission({
        websiteId,
        formId,
        formName: "Number Form",
        fields: {
          f_age: "twenty-five",
        },
        fieldConfigs: numFieldConfigs,
        spamProtection: { rateLimitPerMinute: 100 },
      });
    } catch (err: any) {
      invalidNumError = err;
    }

    assert(invalidNumError instanceof AppError, "Should throw AppError on invalid number format");
    assert.equal(invalidNumError.statusCode, 400);
    assert(invalidNumError.details?.fieldErrors?.f_age, "Should report number field error");
    console.log("  ✓ Invalid number rejected:", invalidNumError.message);

    // -------------------------------------------------------------------------
    // 5. URL Format Validation
    // -------------------------------------------------------------------------
    console.log("\n5. Testing URL Format Validation...");

    const urlFieldConfigs = [
      { id: "f_url", name: "website_url", label: "Company Website", type: "url", required: true },
    ];

    let invalidUrlError: any = null;
    try {
      await processFormSubmission({
        websiteId,
        formId,
        formName: "URL Form",
        fields: {
          f_url: "ftp://wrong-protocol.com",
        },
        fieldConfigs: urlFieldConfigs,
        spamProtection: { rateLimitPerMinute: 100 },
      });
    } catch (err: any) {
      invalidUrlError = err;
    }

    assert(invalidUrlError instanceof AppError, "Should throw AppError on non-http/https URL");
    assert.equal(invalidUrlError.statusCode, 400);
    assert(invalidUrlError.details?.fieldErrors?.f_url, "Should report URL field error");
    console.log("  ✓ Invalid URL rejected:", invalidUrlError.message);

    // -------------------------------------------------------------------------
    // 6. Custom Regex & Custom Error Message Validation
    // -------------------------------------------------------------------------
    console.log("\n6. Testing Custom Regex & Custom Error Message...");

    const customRegexConfigs = [
      {
        id: "f_zip",
        name: "zip_code",
        label: "US Zip Code",
        type: "text",
        required: true,
        validationRegex: "^[0-9]{5}$",
        customErrorMessage: "Please enter a valid 5-digit US ZIP code",
      },
    ];

    let customRegexError: any = null;
    try {
      await processFormSubmission({
        websiteId,
        formId,
        formName: "Custom Regex Form",
        fields: {
          f_zip: "ABCDE",
        },
        fieldConfigs: customRegexConfigs,
        spamProtection: { rateLimitPerMinute: 100 },
      });
    } catch (err: any) {
      customRegexError = err;
    }

    assert(customRegexError instanceof AppError, "Should throw AppError when custom regex fails");
    assert.equal(customRegexError.statusCode, 400);
    assert.equal(
      customRegexError.details?.fieldErrors?.f_zip,
      "Please enter a valid 5-digit US ZIP code",
      "Should use customErrorMessage when provided"
    );
    console.log("  ✓ Custom regex correctly rejected with custom message:", customRegexError.message);

    // -------------------------------------------------------------------------
    // 7. Conditional Logic (Hidden Fields Excluded From Required Checks)
    // -------------------------------------------------------------------------
    console.log("\n7. Testing Conditional Logic Server-side Filtering...");

    const condFieldConfigs = [
      { id: "inquiry_type", name: "inquiry_type", label: "Inquiry Type", type: "select", required: true },
      { id: "business_tax_id", name: "tax_id", label: "Tax ID", type: "text", required: true },
    ];

    const condLogic = [
      {
        id: "cl_1",
        action: "show" as const,
        targetFieldId: "business_tax_id",
        matchType: "all" as const,
        rules: [
          {
            id: "r_1",
            fieldId: "inquiry_type",
            operator: "equals" as const,
            value: "business",
          },
        ],
      },
    ];

    // Case A: inquiry_type is "individual", tax_id is hidden -> should succeed even though tax_id is empty!
    const condResultA = validateFormSubmissionData(
      condFieldConfigs,
      condLogic,
      { inquiry_type: "individual" }
    );
    assert(condResultA.isValid, "Hidden conditional field must NOT fail validation when empty");
    console.log("  ✓ Hidden field excluded from required check as expected");

    // Case B: inquiry_type is "business", tax_id is shown -> should fail validation because tax_id is empty!
    const condResultB = validateFormSubmissionData(
      condFieldConfigs,
      condLogic,
      { inquiry_type: "business" }
    );
    assert(!condResultB.isValid, "Shown conditional field MUST fail validation when required and empty");
    assert(condResultB.fieldErrors.business_tax_id, "Should flag business_tax_id");
    console.log("  ✓ Shown conditional field strictly validated when condition matches");

    // -------------------------------------------------------------------------
    // 8. Safe Handling of Malformed Request
    // -------------------------------------------------------------------------
    console.log("\n8. Testing Safe Handling of Malformed Requests...");

    const malformedResult = validateFormSubmissionData(fieldConfigs, [], null as any);
    assert(!malformedResult.isValid, "Null submittedValues must be rejected safely");
    assert(malformedResult.fieldErrors.form, "Should return generic form error for malformed payload");
    console.log("  ✓ Malformed payload safely caught and rejected");

    // -------------------------------------------------------------------------
    // 9. Valid Submission Succeeds & Persists
    // -------------------------------------------------------------------------
    console.log("\n9. Testing Valid Form Submission Succeeds & Persists...");

    const fullValidPayload = {
      websiteId,
      formId,
      formName: "Full Valid Form",
      fields: {
        f_name: "Jane Smith",
        f_email: "jane.smith@example.com",
        f_phone: "+1 (555) 234-5678",
        f_url: "https://janesmith.dev",
        f_zip: "90210",
      },
      fieldConfigs: [
        { id: "f_name", name: "f_name", label: "Full Name", type: "text", required: true },
        { id: "f_email", name: "f_email", label: "Email", type: "email", required: true },
        { id: "f_phone", name: "f_phone", label: "Phone", type: "tel", required: false },
        { id: "f_url", name: "f_url", label: "Website", type: "url", required: false },
        { id: "f_zip", name: "f_zip", label: "Zip", type: "text", required: true, validationRegex: "^[0-9]{5}$" },
      ],
      spamProtection: { rateLimitPerMinute: 100 },
    };

    const validResult = await processFormSubmission(fullValidPayload);
    assert.equal(validResult.success, true, "Valid submission should return success: true");

    // Check database record
    const submissions: any[] = await prisma.$queryRaw`
      SELECT * FROM form_submissions WHERE "websiteId" = ${websiteId}::uuid AND "formId" = ${formId}
    `;
    assert(submissions.length >= 1, "Submission must be persisted to database");
    assert.equal(submissions[0].data.f_name, "Jane Smith", "Persisted data matches");
    assert.equal(submissions[0].data.f_email, "jane.smith@example.com", "Persisted email matches");
    console.log("  ✓ Valid submission succeeded and persisted to database (record ID:", submissions[0].id, ")");

    console.log("\n=================================================");
    console.log("ALL FEATURE 3A FORM VALIDATION TESTS PASSED!");
    console.log("=================================================");
  } finally {
    // Cleanup test data
    try {
      await prisma.$executeRaw`DELETE FROM form_submissions WHERE "websiteId" = ${websiteId}::uuid`;
      await prisma.website.delete({ where: { id: websiteId } });
      await prisma.user.delete({ where: { id: testUser.id } });
    } catch (cleanErr) {
      // Ignore cleanup error
    }
  }
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});

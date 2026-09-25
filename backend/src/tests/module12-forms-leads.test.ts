import {
  sanitizeInput,
  checkRateLimit,
  evaluateServerConditionalLogic,
  processFormSubmission,
} from "../services/form/form.service.js";
import { generateSubmissionPdf } from "../services/form/pdf.service.js";
import { compileCanonicalToStaticBundle } from "../services/destinations/staticCompiler.js";
import type { CanonicalSite } from "../services/destinations/staticCompiler.js";

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

async function runModule12Tests() {
  console.log("=================================================");
  console.log("RUNNING MODULE 12: FORMS & LEAD GENERATION TEST SUITE");
  console.log("=================================================\n");

  try {
    // -------------------------------------------------------------------------
    // 1. PDF Lead Report Generation (X-800)
    // -------------------------------------------------------------------------
    console.log("--- 1. Form Submission PDF Generation (X-800) ---");

    const sampleSubmission = {
      id: "b2d56a31-7e88-4e89-a2e6-8e5e9f899123",
      websiteId: "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      formId: "contact-form-01",
      formName: "Enterprise Consultation Request",
      data: {
        fullName: "Sarah Connor",
        email: "sarah.connor@cyberdyne.org",
        phone: "+1 (555) 019-2834",
        interest: "Cloud Infrastructure Migration",
        budget: "$25,000+",
        timeline: "Q4 2026",
        notes: "Need high availability deployment with multi-region failover.",
      },
      metadata: {
        ip: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0",
        referer: "https://enterprise.example.com/pricing",
      },
      createdAt: new Date().toISOString(),
    };

    const pdfBuffer = generateSubmissionPdf(sampleSubmission, "Acme Cloud Solutions");

    assert(Buffer.isBuffer(pdfBuffer), "PDF generator produces a valid Node.js Buffer");
    assert(pdfBuffer.length > 500, `PDF size is realistic (${pdfBuffer.length} bytes)`);

    const pdfString = pdfBuffer.toString("latin1");
    assert(pdfString.startsWith("%PDF-1.4"), "PDF binary starts with '%PDF-1.4' magic header");
    assert(pdfString.includes("%%EOF"), "PDF binary terminates with standards-compliant '%%EOF'");
    assert(
      pdfString.includes("Enterprise Consultation Request"),
      "PDF content stream contains the form title"
    );
    assert(pdfString.includes("Sarah Connor"), "PDF stream embeds the submitted lead name");
    assert(
      pdfString.includes("sarah.connor@cyberdyne.org"),
      "PDF stream embeds the submitted lead email"
    );
    assert(pdfString.includes("192.168.1.100"), "PDF stream embeds client IP address in metadata");

    // -------------------------------------------------------------------------
    // 2. Anti-Spam Honeypot & Silent Dropping (F-277)
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Anti-Spam Honeypot Protection (F-277) ---");

    const spamPayload = {
      websiteId: "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      formId: "lead-gen-01",
      formName: "Contact Us",
      fields: {
        name: "Bot Spammer",
        email: "bot@spammer-domain.xyz",
      },
      honeypotValue: "I am a hidden bot entry", // Bot filled hidden honeypot
      spamProtection: {
        enableHoneypot: true,
      },
      actions: {
        activeActions: ["database"],
      },
    };

    const botResult = await processFormSubmission(spamPayload as any);
    assert(botResult.success === true, "Honeypot trap silently absorbs bot submission with 200 OK");
    assert(
      typeof botResult.message === "string",
      "Honeypot trap provides standard thank-you message to avoid alerting bots"
    );

    // -------------------------------------------------------------------------
    // 3. Server-Side Conditional Logic & Field Validation (F-272, X-788)
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Server-Side Conditional Logic & Field Validation (F-272, X-788) ---");

    const fieldConfigs = [
      { id: "f1", name: "inquiryType", label: "Inquiry Type", required: true },
      { id: "f2", name: "companyName", label: "Company Name", required: true },
      { id: "f3", name: "studentId", label: "Student ID", required: true },
    ];

    // Conditional rule: show/require studentId only if inquiryType equals 'education'
    const conditionalRules = [
      {
        id: "cond-1",
        action: "show" as const,
        targetFieldId: "f3",
        matchType: "all" as const,
        rules: [
          {
            id: "r1",
            fieldId: "f1",
            operator: "equals" as const,
            value: "education",
          },
        ],
      },
    ];

    // Case A: inquiryType is 'business', studentId is missing (should be valid because f3 is hidden)
    const resultBusiness = evaluateServerConditionalLogic(
      fieldConfigs,
      conditionalRules,
      { inquiryType: "business", companyName: "TechCorp" }
    );
    assert(
      resultBusiness.invalidRequiredFields.length === 0,
      "Hidden conditional field (studentId) is excluded from required checks for business inquiries"
    );

    // Case B: inquiryType is 'education', studentId is missing (should fail required check)
    const resultEducation = evaluateServerConditionalLogic(
      fieldConfigs,
      conditionalRules,
      { inquiryType: "education", companyName: "MIT" }
    );
    assert(
      resultEducation.invalidRequiredFields.includes("Student ID") ||
        resultEducation.invalidRequiredFields.includes("studentId") ||
        resultEducation.invalidRequiredFields.includes("f3"),
      "Active conditional field (studentId) is strictly enforced when trigger condition matches"
    );

    // -------------------------------------------------------------------------
    // 4. Input Sanitization & XSS Protection (F-272)
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Input Sanitization & XSS Filtering (F-272) ---");

    const dirtyInput = {
      name: "Alice <script>alert('xss')</script>",
      comment: "Hello <b>World</b>! <img src='x' onerror='alert(1)' />",
      nested: {
        tag: "<a href='javascript:void(0)'>Link</a>",
      },
      list: ["<script>eval()</script>Item 1", "Clean Item 2"],
    };

    const sanitized = sanitizeInput(dirtyInput);
    assert(!sanitized.name.includes("<script>"), "Strips script tags from string fields");
    assert(!sanitized.name.includes("alert"), "Neutralizes script payloads");
    assert(!sanitized.comment.includes("<b>"), "Strips HTML formatting tags");
    assert(!sanitized.nested.tag.includes("<a"), "Recursively sanitizes nested objects");
    assert(!sanitized.list[0].includes("<script>"), "Recursively sanitizes array values");

    // -------------------------------------------------------------------------
    // 5. Rate Limiting Protection (F-277)
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Rate Limiting Enforcement (F-277) ---");

    const testIp = `10.99.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
    let allowedCount = 0;
    for (let i = 0; i < 5; i++) {
      if (checkRateLimit(testIp, 3)) {
        allowedCount++;
      }
    }
    assert(allowedCount === 3, `Allows exactly 3 submissions under limit 3 (allowed: ${allowedCount})`);
    assert(checkRateLimit(testIp, 3) === false, "Rejects 4th consecutive submission within window");

    // -------------------------------------------------------------------------
    // 6. Static Compiler Serialization & Form Runtime (F-270, F-274, F-277)
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Static Compiler Form Output & AJAX Runtime JS ---");

    const sampleSite: CanonicalSite = {
      id: "site-forms-test",
      name: "Form Static Test Site",
      slug: "form-static-test",
      pages: [
        {
          id: "page-home",
          title: "Home",
          slug: "home",
          elements: [
            {
              id: "contact-form-el",
              type: "form",
              formId: "contact-form-el",
              formTitle: "Get In Touch",
              submitButtonText: "Send Message",
              redirectUrl: "/thank-you",
              formFields: [
                { id: "name", name: "name", label: "Full Name", type: "text", required: true },
                { id: "email", name: "email", label: "Email Address", type: "email", required: true },
                { id: "date", name: "date", label: "Preferred Date", type: "date" },
                { id: "file", name: "file", label: "Resume / Portfolio", type: "file" },
                {
                  id: "service",
                  name: "service",
                  label: "Service",
                  type: "select",
                  options: ["Web Design", "Development"],
                },
              ],
            },
          ],
        },
      ],
    };

    const bundle = compileCanonicalToStaticBundle("site-forms-test", 1, sampleSite);
    const homeFile = bundle.files.find((f) => f.path === "home.html" || f.path === "index.html");
    const homeHtml = homeFile ? homeFile.content : "";

    assert(homeHtml.includes("<form"), "Static compiler generates <form> element");
    assert(homeHtml.includes('action="/api/forms/submit"'), "Form action points to /api/forms/submit");
    assert(
      homeHtml.includes('name="websiteId"') && homeHtml.includes('value="site-forms-test"'),
      "Form includes hidden input for websiteId"
    );
    assert(
      homeHtml.includes('name="formId"') && homeHtml.includes('value="contact-form-el"'),
      "Form includes hidden input for formId"
    );
    assert(
      homeHtml.includes('name="_fs_hp_check"'),
      "Form includes hidden honeypot anti-spam input _fs_hp_check"
    );
    assert(
      homeHtml.includes('type="date"'),
      "Static compiler supports date input fields"
    );
    assert(
      homeHtml.includes('type="file"'),
      "Static compiler supports file upload fields"
    );
    assert(
      homeHtml.includes('data-redirect="/thank-you"'),
      "Form preserves redirectUrl in data-redirect attribute"
    );

    // Verify runtime.js interceptor
    const runtimeFile = bundle.files.find((f) => f.path === "runtime.js");
    const runtimeJs = runtimeFile ? runtimeFile.content : "";
    assert(
      runtimeJs.includes("fetch('/api/forms/submit'"),
      "runtime.js includes AJAX fetch submit interceptor"
    );
    assert(
      runtimeJs.includes("_fs_hp_check"),
      "runtime.js extracts honeypot value for API payload"
    );
    assert(
      runtimeJs.includes("data-redirect") || runtimeJs.includes("window.location.href"),
      "runtime.js handles redirectUrl after successful submission"
    );

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log("\n=================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Unexpected test suite execution failure:", error);
    process.exit(1);
  }
}

runModule12Tests();

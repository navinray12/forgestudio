import { prisma } from "../config/prisma.js";
import {
  exportSubmissionsCsv,
  formatCsvCell,
  initFormSubmissionsTable,
} from "../services/form/form.service.js";
import { createWebsite } from "../services/website.service.js";
import { createWorkspace } from "../services/workspace.service.js";

const db = prisma as any;

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

async function runCsvLeadExportTestSuite() {
  console.log("=================================================");
  console.log("RUNNING FEATURE 1: CSV LEAD EXPORT TEST SUITE");
  console.log("=================================================\n");

  let ownerUser: any = null;
  let otherUser: any = null;
  let testWebsite: any = null;
  let testWorkspace: any = null;

  try {
    // -------------------------------------------------------------------------
    // 1. Unit Tests for Cell Escaping & Formula Injection Defense (CWE-1236)
    // -------------------------------------------------------------------------
    console.log("--- 1. RFC 4180 & Formula Injection Unit Tests ---");

    // Plain safe value
    assert(formatCsvCell("Hello World") === '"Hello World"', "Standard text properly quoted");
    assert(formatCsvCell(null) === '""', "Null value returns empty quoted string");
    assert(formatCsvCell(undefined) === '""', "Undefined value returns empty quoted string");

    // Commas and double quotes escaping
    assert(
      formatCsvCell('Acme, Inc. "Leader"') === '"Acme, Inc. ""Leader"""',
      "Commas and internal double quotes escaped per RFC 4180"
    );

    // Multiline / newlines escaping
    const multiline = "Line 1\nLine 2\rLine 3";
    assert(
      formatCsvCell(multiline) === '"Line 1\nLine 2\rLine 3"',
      "Newlines preserved inside quoted boundaries"
    );

    // Formula Injection Defense (=, +, -, @, \t, \r, %)
    assert(
      formatCsvCell("=SUM(A1:B10)") === '"\'=SUM(A1:B10)"',
      "Formula starting with '=' is neutralized with single quote prefix"
    );
    assert(
      formatCsvCell("+123456789") === '"\'+123456789"',
      "Formula/Number starting with '+' is neutralized with single quote prefix"
    );
    assert(
      formatCsvCell("-20.50") === '"\'-20.50"',
      "Formula/Number starting with '-' is neutralized with single quote prefix"
    );
    assert(
      formatCsvCell("@cmd|' /C calc'!A0") === '"\'@cmd|\' /C calc\'!A0"',
      "Formula starting with '@' is neutralized with single quote prefix"
    );
    assert(
      formatCsvCell("\tTabIndented") === '"\'\tTabIndented"',
      "Value starting with tab character is neutralized"
    );
    assert(
      formatCsvCell("%COMSPEC%") === '"\'%COMSPEC%"',
      "Value starting with '%' is neutralized"
    );
    assert(
      formatCsvCell("\r=1+2") === '"\'\r=1+2"',
      "Carriage return leading character is neutralized"
    );
    assert(
      formatCsvCell("Option A | Option B") === '"Option A | Option B"',
      "Pipe character in normal text is preserved and NOT corrupted"
    );
    assert(
      formatCsvCell("🎉 Café & Crème ☕") === '"🎉 Café & Crème ☕"',
      "Unicode and emojis preserved inside quoted boundaries"
    );
    assert(
      formatCsvCell("Item 1; Item 2; Item 3") === '"Item 1; Item 2; Item 3"',
      "Semicolons preserved inside quoted boundaries"
    );

    // -------------------------------------------------------------------------
    // 2. Integration Tests: DB Setup
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Database Integration & Setup ---");
    await initFormSubmissionsTable();
    await prisma.$executeRawUnsafe(`ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "documentVersion" INTEGER DEFAULT 1;`);

    const timestamp = Date.now();
    ownerUser = await db.user.create({
      data: {
        email: `csv_owner_${timestamp}@example.com`,
        passwordHash: "dummy_hash",
        fullName: "CSV Owner User",
        role: "USER",
      },
    });

    otherUser = await db.user.create({
      data: {
        email: `csv_other_${timestamp}@example.com`,
        passwordHash: "dummy_hash",
        fullName: "CSV Other User",
        role: "USER",
      },
    });

    testWebsite = await createWebsite({
      name: "CSV Test Site",
      slug: `csv-test-site-${timestamp}`,
      userId: ownerUser.id,
    });

    assert(testWebsite && testWebsite.id, "Test website created successfully");

    // -------------------------------------------------------------------------
    // 3. Empty Submissions Export
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Empty Submissions Handling ---");
    const emptyResult = await exportSubmissionsCsv(testWebsite.id, ownerUser.id);
    assert(emptyResult.totalRecords === 0, "Returns totalRecords = 0 for empty form submissions");
    assert(emptyResult.csvContent.includes('"Submission ID"'), "Empty export includes standard headers");
    assert(
      emptyResult.filename.startsWith("leads-csv-test-site"),
      `Filename matches pattern (${emptyResult.filename})`
    );

    // -------------------------------------------------------------------------
    // 4. Populated Submissions Export with Dynamic Fields & Metadata
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Populated Submissions Export with Dynamic Fields ---");

    // Insert 2 submissions with special characters & formula triggers
    await db.$executeRawUnsafe(`
      INSERT INTO form_submissions (id, "websiteId", "formId", "formName", data, metadata, "createdAt")
      VALUES
      (
        gen_random_uuid(),
        $1::uuid,
        'contact-form-01',
        'Contact Form',
        $2::jsonb,
        $3::jsonb,
        NOW() - INTERVAL '1 day'
      ),
      (
        gen_random_uuid(),
        $1::uuid,
        'newsletter-02',
        'Newsletter Signup',
        $4::jsonb,
        $5::jsonb,
        NOW()
      )
    `,
      testWebsite.id,
      JSON.stringify({
        fullName: 'Jane "CEO" Doe',
        email: "jane@company.com",
        notes: "Budget: $50,000,\nTimeline: Immediate",
        formulaPayload: "=1+2",
        unicodeCity: "München, Deutschland 🇩🇪",
        preferences: "Option A | Option B; Option C",
      }),
      JSON.stringify({
        ip: "203.0.113.195",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        referer: "https://example.com/contact",
      }),
      JSON.stringify({
        email: "subscriber@newsletter.io",
        plan: "Enterprise",
        discountCode: "@DISCOUNT100",
      }),
      JSON.stringify({
        ip: "198.51.100.42",
        userAgent: "Mobile Safari",
        referer: "https://example.com/landing",
      })
    );

    const populatedResult = await exportSubmissionsCsv(testWebsite.id, ownerUser.id);
    assert(populatedResult.totalRecords === 2, "Returns all 2 populated submissions");

    const lines = populatedResult.csvContent.trim().split("\r\n");
    assert(lines.length === 3, `CSV has 1 header line and 2 data lines (got ${lines.length})`);

    // Verify header columns include both static, dynamic (sorted), and metadata fields
    const headerLine = lines[0];
    assert(headerLine.includes('"Submission ID"'), "Header contains 'Submission ID'");
    assert(headerLine.includes('"Form ID"'), "Header contains 'Form ID'");
    assert(headerLine.includes('"Form Name"'), "Header contains 'Form Name'");
    assert(headerLine.includes('"Submitted At (UTC)"'), "Header contains 'Submitted At (UTC)'");
    assert(headerLine.includes('"email"'), "Header dynamically includes 'email' field");
    assert(headerLine.includes('"fullName"'), "Header dynamically includes 'fullName' field");
    assert(headerLine.includes('"notes"'), "Header dynamically includes 'notes' field");
    assert(headerLine.includes('"formulaPayload"'), "Header dynamically includes 'formulaPayload' field");
    assert(headerLine.includes('"discountCode"'), "Header dynamically includes 'discountCode' field");
    assert(headerLine.includes('"unicodeCity"'), "Header dynamically includes 'unicodeCity' field");
    assert(headerLine.includes('"preferences"'), "Header dynamically includes 'preferences' field");
    assert(headerLine.includes('"IP Address"'), "Header includes metadata 'IP Address'");
    assert(headerLine.includes('"User Agent"'), "Header includes metadata 'User Agent'");
    assert(headerLine.includes('"Referer"'), "Header includes metadata 'Referer'");

    // Verify row 1 contains escaped quotes, multiline content, and neutralized formula
    const rowContent = populatedResult.csvContent;
    assert(rowContent.includes('"Jane ""CEO"" Doe"'), 'Double quotes in name escaped as double quotes');
    assert(rowContent.includes('"\'=1+2"'), "Formula trigger '=1+2' safely prefixed with single quote");
    assert(rowContent.includes('"\'@DISCOUNT100"'), "Formula trigger '@DISCOUNT100' safely prefixed with single quote");
    assert(rowContent.includes('"München, Deutschland 🇩🇪"'), "Unicode and country flag emoji present in export");
    assert(rowContent.includes('"Option A | Option B; Option C"'), "Pipes and semicolons preserved without single quote prefix");
    assert(rowContent.includes('"203.0.113.195"'), "IP address metadata present in export");
    assert(rowContent.includes('"subscriber@newsletter.io"'), "Lead email present in export");
    assert(
      /^leads-[a-z0-9_-]+-\d{4}-\d{2}-\d{2}\.csv$/.test(populatedResult.filename),
      `Export filename follows expected pattern (${populatedResult.filename})`
    );

    // -------------------------------------------------------------------------
    // 5. Form ID Filtering
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Form ID Filter Option ---");
    const filteredResult = await exportSubmissionsCsv(testWebsite.id, ownerUser.id, {
      formId: "contact-form-01",
    });
    assert(filteredResult.totalRecords === 1, "Filtering by formId returns only matching form records (1)");
    assert(
      filteredResult.csvContent.includes('"Contact Form"') &&
      !filteredResult.csvContent.includes('"Newsletter Signup"'),
      "Filtered CSV contains only the targeted form"
    );

    // -------------------------------------------------------------------------
    // 6. Security & Workspace Authorization
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Security & Authorization Checks ---");

    // Attempt export by unauthorized non-collaborator user
    let unauthorizedBlocked = false;
    try {
      await exportSubmissionsCsv(testWebsite.id, otherUser.id);
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 403) {
        unauthorizedBlocked = true;
      }
    }
    assert(unauthorizedBlocked, "Non-owner/non-collaborator user is blocked from exporting leads (404/403)");

    // Test Workspace isolation: website assigned to a workspace
    testWorkspace = await createWorkspace(ownerUser.id, "Private Workspace", `ws-${timestamp}`);
    await prisma.$executeRawUnsafe(
      `UPDATE websites SET "workspaceId" = $1::uuid WHERE id = $2::uuid`,
      testWorkspace.id,
      testWebsite.id
    );

    // Cross-workspace check: otherUser is not a member of testWorkspace
    let crossWorkspaceBlocked = false;
    try {
      await exportSubmissionsCsv(testWebsite.id, otherUser.id);
    } catch (err: any) {
      if (err.statusCode === 403 || err.statusCode === 404) {
        crossWorkspaceBlocked = true;
      }
    }
    assert(crossWorkspaceBlocked, "Cross-workspace access strictly blocked for unauthorized workspace users");

    // Owner can still export
    const ownerWorkspaceExport = await exportSubmissionsCsv(testWebsite.id, ownerUser.id);
    assert(ownerWorkspaceExport.totalRecords === 2, "Workspace owner can export leads without issue");

    // -------------------------------------------------------------------------
    // 7. Malformed Input & Unauthenticated Request Handling
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Malformed Input & Authentication Checks ---");

    // Malformed websiteId
    let malformedBlocked = false;
    try {
      await exportSubmissionsCsv("invalid-not-a-uuid", ownerUser.id);
    } catch (err: any) {
      if (err.statusCode === 400) {
        malformedBlocked = true;
      }
    }
    assert(malformedBlocked, "Malformed non-UUID websiteId returns HTTP 400 BAD_REQUEST");

    // Empty websiteId
    let emptyWebsiteBlocked = false;
    try {
      await exportSubmissionsCsv("", ownerUser.id);
    } catch (err: any) {
      if (err.statusCode === 400) {
        emptyWebsiteBlocked = true;
      }
    }
    assert(emptyWebsiteBlocked, "Empty websiteId returns HTTP 400 BAD_REQUEST");

    // Unauthenticated request (missing userId)
    let unauthenticatedBlocked = false;
    try {
      await exportSubmissionsCsv(testWebsite.id, "");
    } catch (err: any) {
      if (err.statusCode === 401) {
        unauthenticatedBlocked = true;
      }
    }
    assert(unauthenticatedBlocked, "Missing userId returns HTTP 401 UNAUTHORIZED");

  } catch (err) {
    console.error("Test execution threw unexpected exception:", err);
    assert(false, "Test suite execution completed cleanly", err);
  } finally {
    // Cleanup test data
    try {
      if (testWebsite) {
        await db.$executeRawUnsafe(`DELETE FROM form_submissions WHERE "websiteId" = $1::uuid`, testWebsite.id);
        await db.$executeRawUnsafe(`DELETE FROM websites WHERE id = $1::uuid`, testWebsite.id);
      }
      if (testWorkspace) {
        await db.workspaceMember.deleteMany({ where: { workspaceId: testWorkspace.id } }).catch(() => {});
        await db.workspace.delete({ where: { id: testWorkspace.id } }).catch(() => {});
      }
      if (ownerUser) {
        await db.user.delete({ where: { id: ownerUser.id } }).catch(() => {});
      }
      if (otherUser) {
        await db.user.delete({ where: { id: otherUser.id } }).catch(() => {});
      }
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  }

  console.log("\n=================================================");
  console.log(`FEATURE 1 CSV TESTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runCsvLeadExportTestSuite();

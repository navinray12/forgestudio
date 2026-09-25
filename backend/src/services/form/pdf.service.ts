/**
 * Pure TypeScript PDF-1.4 Generation Service for Form Submissions (X-800)
 * Generates standards-compliant, lightweight binary PDF documents with zero external C/npm dependencies.
 */

export interface SubmissionPdfData {
  id: string;
  websiteId: string;
  formId: string;
  formName?: string;
  data: Record<string, any>;
  metadata?: {
    ip?: string;
    userAgent?: string;
    referer?: string;
    submittedAt?: string;
  };
  createdAt: string | Date;
}

/**
 * Escapes characters for PDF literal strings (parens and backslashes)
 */
function escapePdfString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n\t]/g, " ");
}

/**
 * Generates an Adobe PDF 1.4 compliant binary buffer representing the form lead report
 */
export function generateSubmissionPdf(
  submission: SubmissionPdfData,
  websiteName = "ForgeStudio Website"
): Buffer {
  const submissionDate = submission.createdAt
    ? new Date(submission.createdAt).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC"
    : new Date().toISOString();

  const formName = submission.formName || "Website Form";
  const clientIp = submission.metadata?.ip || "Unknown IP";
  const userAgent = submission.metadata?.userAgent || "Standard Browser";

  // Build stream content using PDF text and vector operators
  const streamCommands: string[] = [];

  // Top header banner background: navy blue rectangle (x=40, y=740, w=515, h=65)
  streamCommands.push("q");
  streamCommands.push("0.08 0.18 0.36 rg"); // #152e5c
  streamCommands.push("40 740 515 65 re f");
  streamCommands.push("Q");

  // Header Title
  streamCommands.push("BT");
  streamCommands.push("/F2 18 Tf");
  streamCommands.push("1 1 1 rg"); // White text
  streamCommands.push("55 775 Td");
  streamCommands.push(`(${escapePdfString("FORGESTUDIO LEAD REPORT")}) Tj`);
  streamCommands.push("ET");

  // Header Subtitle (Form Name & Website)
  streamCommands.push("BT");
  streamCommands.push("/F1 10 Tf");
  streamCommands.push("0.85 0.90 0.98 rg");
  streamCommands.push("55 752 Td");
  streamCommands.push(`(${escapePdfString(`${formName}  |  ${websiteName}`)}) Tj`);
  streamCommands.push("ET");

  // Metadata Card background: light gray (x=40, y=660, w=515, h=65)
  streamCommands.push("q");
  streamCommands.push("0.96 0.97 0.99 rg");
  streamCommands.push("40 660 515 65 re f");
  streamCommands.push("0.85 0.88 0.92 RG 1 w");
  streamCommands.push("40 660 515 65 re S");
  streamCommands.push("Q");

  // Metadata items
  const metaLines = [
    `Submission ID: ${submission.id}`,
    `Submitted At:  ${submissionDate}`,
    `Form ID:       ${submission.formId}`,
    `Client IP:     ${clientIp}`,
  ];

  streamCommands.push("BT");
  streamCommands.push("/F1 9 Tf");
  streamCommands.push("0.2 0.25 0.32 rg");
  streamCommands.push("55 705 Td");
  streamCommands.push(`(${escapePdfString(metaLines[0])}) Tj`);
  streamCommands.push("0 -13 Td");
  streamCommands.push(`(${escapePdfString(metaLines[1])}) Tj`);
  streamCommands.push("ET");

  streamCommands.push("BT");
  streamCommands.push("/F1 9 Tf");
  streamCommands.push("0.2 0.25 0.32 rg");
  streamCommands.push("310 705 Td");
  streamCommands.push(`(${escapePdfString(metaLines[2])}) Tj`);
  streamCommands.push("0 -13 Td");
  streamCommands.push(`(${escapePdfString(metaLines[3])}) Tj`);
  streamCommands.push("ET");

  // Section Heading: Captured Form Fields
  streamCommands.push("BT");
  streamCommands.push("/F2 13 Tf");
  streamCommands.push("0.08 0.18 0.36 rg");
  streamCommands.push("40 635 Td");
  streamCommands.push(`(${escapePdfString("Captured Form Data")}) Tj`);
  streamCommands.push("ET");

  // Table Column Headers (x=40, y=605, w=515, h=22)
  streamCommands.push("q");
  streamCommands.push("0.15 0.39 0.92 rg"); // Accent blue #2563eb
  streamCommands.push("40 605 515 22 re f");
  streamCommands.push("Q");

  streamCommands.push("BT");
  streamCommands.push("/F2 10 Tf");
  streamCommands.push("1 1 1 rg");
  streamCommands.push("50 612 Td");
  streamCommands.push(`(${escapePdfString("FIELD NAME")}) Tj`);
  streamCommands.push("180 0 Td");
  streamCommands.push(`(${escapePdfString("SUBMITTED VALUE")}) Tj`);
  streamCommands.push("ET");

  // Rows of form data
  const entries = Object.entries(submission.data || {});
  let currentY = 582;
  const rowHeight = 22;

  entries.forEach(([key, rawValue], idx) => {
    if (currentY < 80) return; // Prevent overflowing single page boundary

    const isEven = idx % 2 === 0;
    const bgGray = isEven ? "0.98 0.99 1.0" : "1.0 1.0 1.0";

    // Row Background
    streamCommands.push("q");
    streamCommands.push(`${bgGray} rg`);
    streamCommands.push(`40 ${currentY} 515 ${rowHeight} re f`);
    streamCommands.push("0.90 0.92 0.95 RG 0.5 w");
    streamCommands.push(`40 ${currentY} 515 ${rowHeight} re S`);
    streamCommands.push("Q");

    // Format value
    let valStr = "";
    if (typeof rawValue === "object" && rawValue !== null) {
      valStr = JSON.stringify(rawValue);
    } else {
      valStr = rawValue !== undefined && rawValue !== null ? String(rawValue) : "";
    }
    if (valStr.length > 55) {
      valStr = valStr.substring(0, 52) + "...";
    }

    // Key text
    streamCommands.push("BT");
    streamCommands.push("/F2 9 Tf");
    streamCommands.push("0.15 0.20 0.28 rg");
    streamCommands.push(`50 ${currentY + 6} Td`);
    streamCommands.push(`(${escapePdfString(key)}) Tj`);
    streamCommands.push("ET");

    // Value text
    streamCommands.push("BT");
    streamCommands.push("/F1 9 Tf");
    streamCommands.push("0.25 0.30 0.38 rg");
    streamCommands.push(`230 ${currentY + 6} Td`);
    streamCommands.push(`(${escapePdfString(valStr)}) Tj`);
    streamCommands.push("ET");

    currentY -= rowHeight;
  });

  // Footer Rule & Notice
  streamCommands.push("q");
  streamCommands.push("0.85 0.88 0.92 RG 1 w");
  streamCommands.push("40 50 515 0.5 re S");
  streamCommands.push("Q");

  streamCommands.push("BT");
  streamCommands.push("/F1 8 Tf");
  streamCommands.push("0.55 0.60 0.68 rg");
  streamCommands.push("40 38 Td");
  streamCommands.push(
    `(${escapePdfString(
      `Generated by ForgeStudio Lead Automation Engine  |  User Agent: ${userAgent.substring(0, 60)}`
    )}) Tj`
  );
  streamCommands.push("ET");

  const streamBody = streamCommands.join("\n");
  const streamLength = Buffer.byteLength(streamBody, "utf8");

  // PDF-1.4 Object Construction
  const objects: string[] = [];

  // Object 1: Catalog
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // Object 2: Pages root
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);

  // Object 3: Page (A4: 595.28 x 841.89 points)
  objects.push(
    `3 0 obj\n<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 595.28 841.89]\n  /Resources <<\n    /Font <<\n      /F1 4 0 R\n      /F2 5 0 R\n    >>\n  >>\n  /Contents 6 0 R\n>>\nendobj\n`
  );

  // Object 4: Standard Helvetica font
  objects.push(
    `4 0 obj\n<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica\n  /Encoding /WinAnsiEncoding\n>>\nendobj\n`
  );

  // Object 5: Standard Helvetica-Bold font
  objects.push(
    `5 0 obj\n<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica-Bold\n  /Encoding /WinAnsiEncoding\n>>\nendobj\n`
  );

  // Object 6: Page content stream
  objects.push(
    `6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamBody}\nendstream\nendobj\n`
  );

  // Calculate byte offsets for XRef table
  const header = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`;
  let currentOffset = Buffer.byteLength(header, "binary");
  const offsets: number[] = [0]; // 0th object is always free

  for (const obj of objects) {
    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(obj, "utf8");
  }

  const startXref = currentOffset;

  // Build XRef table
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const offStr = String(offsets[i]).padStart(10, "0");
    xref += `${offStr} 00000 n \n`;
  }

  const trailer = `trailer\n<<\n  /Size ${objects.length + 1}\n  /Root 1 0 R\n>>\nstartxref\n${startXref}\n%%EOF\n`;

  const fullPdfString = header + objects.join("") + xref + trailer;
  return Buffer.from(fullPdfString, "binary");
}

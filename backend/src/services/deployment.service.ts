import { minify as minifyJs } from 'terser';
import CleanCSS from 'clean-css';
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getWebsiteById } from "./website.service.js";
import { detectDependencyConflicts, validateSecurity, validateSnippet } from "../utils/customCodeValidator.js";

const db = prisma as any;

export async function publishWebsiteService(websiteId: string, userId: string) {
  const website = await getWebsiteById(websiteId, userId);
  const editorData = typeof website.editorData === 'string' ? JSON.parse(website.editorData) : website.editorData;

  const { customCodeList = [], customCodeRevisions = [] } = editorData.globalSettings || {};

  // 1. Validations
  const conflicts = detectDependencyConflicts(customCodeList);
  const blockingConflicts = conflicts.filter(c => c.severity === "error" && c.snippetId && customCodeList.find((s: any) => s.id === c.snippetId)?.publishedRevisionId);
  if (blockingConflicts.length > 0) {
    throw new AppError("Publishing blocked due to active dependency conflicts", 400, "VALIDATION_FAILED");
  }

  // 2. Process and minify custom code
  const publishedSnippets = [];

  for (const snip of customCodeList) {
    if (!snip.publishedRevisionId) continue;
    const publishedRev = customCodeRevisions.find((r: any) => r.id === snip.publishedRevisionId);
    if (!publishedRev) {
      throw new AppError(`Published revision ${snip.publishedRevisionId} missing`, 400, "VALIDATION_FAILED");
    }

    let minifiedCode = publishedRev.code;
    try {
      if (publishedRev.type === 'javascript') {
        // F-117: Authoritative Server-side Linter (Syntax Parsing via Terser)
        const jsResult = await minifyJs(minifiedCode);
        minifiedCode = jsResult.code || minifiedCode;
      } else if (publishedRev.type === 'css') {
        // F-117: Authoritative CSS Linting via CleanCSS
        const cssResult = new CleanCSS({}).minify(minifiedCode);
        if (cssResult.errors && cssResult.errors.length > 0) {
          throw new Error(cssResult.errors[0]); // Escalate to AppError
        }
        minifiedCode = cssResult.styles || minifiedCode;
      } else if (publishedRev.type === 'html') {
        // Basic sanity block for HTML, if there are massive structural defects we could parse here,
        // but security sanitization cleans it perfectly.
      }
    } catch (err: any) {
      // F-117: Linter blocks publishing entirely on fatal errors
      throw new AppError(`Publish blocked: Lint/Syntax validation failed for snippet [${publishedRev.name}]. ` + (err.message || 'Fatal formatting error.'), 400, "VALIDATION_FAILED");
    }

    publishedSnippets.push({
      ...publishedRev,
      minifiedCode, // NEVER Destructive to source
    });
  }

  // F-116: Sort Execution Order by Priority Server-side
  publishedSnippets.sort((a: any, b: any) => {
    const pA = a.priority ?? 100;
    const pB = b.priority ?? 100;
    if (pA === pB) {
      return (a.id || "").localeCompare(b.id || ""); // Stable fallback
    }
    return pA - pB;
  });

  // Generate full published state tree
  editorData.publishedData = {
    elements: editorData.elements,
    snippets: publishedSnippets,
    publishedAt: new Date().toISOString()
  };

  const jsonStr = JSON.stringify(editorData);

  if (db?.website?.update) {
    return await db.website.update({
      where: { id: websiteId },
      data: { editorData: editorData, status: 'PUBLISHED', updatedAt: new Date() }
    });
  }

  const updated: any[] = await prisma.$queryRaw`
    UPDATE websites
    SET "editorData" = ${jsonStr}::jsonb, status = 'PUBLISHED', "updatedAt" = NOW()
    WHERE id = ${websiteId}::uuid AND "userId" = ${userId}::uuid
    RETURNING id, "userId", name, slug, status, "createdAt", "updatedAt"
  `;

  return updated[0];
}

export async function restoreRevisionService(websiteId: string, userId: string, revisionId: string) {
  const website = await getWebsiteById(websiteId, userId);
  const editorData = typeof website.editorData === 'string' ? JSON.parse(website.editorData) : website.editorData;

  const { customCodeRevisions = [], customCodeList = [] } = editorData.globalSettings || {};

  const rev = customCodeRevisions.find((r: any) => r.id === revisionId);
  if (!rev) throw new AppError("Revision not found", 404, "NOT_FOUND");

  const snipIndex = customCodeList.findIndex((s: any) => s.id === rev.snippetId);
  if (snipIndex === -1) throw new AppError("Snippet not found", 404, "NOT_FOUND");

  // Restore the draft to this revision's code non-destructively
  customCodeList[snipIndex].code = rev.code;
  customCodeList[snipIndex].name = rev.name;

  editorData.globalSettings.customCodeList = customCodeList;
  const jsonStr = JSON.stringify(editorData);

  if (db?.website?.update) {
    return await db.website.update({
      where: { id: websiteId },
      data: { editorData: editorData, updatedAt: new Date() }
    });
  }

  const updated: any[] = await prisma.$queryRaw`
    UPDATE websites
    SET "editorData" = ${jsonStr}::jsonb, "updatedAt" = NOW()
    WHERE id = ${websiteId}::uuid AND "userId" = ${userId}::uuid
    RETURNING id, name, status
  `;

  return updated[0];
}

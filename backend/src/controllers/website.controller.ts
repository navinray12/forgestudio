<<<<<<< HEAD
=======
import { publishWebsiteService, restoreRevisionService } from "../services/deployment.service.js";
>>>>>>> 8d95dec (Initial project code)
import type { Request, Response, NextFunction } from "express";
import {
  getUserWebsites,
  getWebsiteById,
  createWebsite,
  updateWebsiteEditorData,
  deleteWebsite,
} from "../services/website.service.js";

/**
 * GET /api/websites
 * Fetch all websites for current authenticated user
 */
export async function getWebsitesHandler(
<<<<<<< HEAD
  _req: Request,
=======
  req: Request,
>>>>>>> 8d95dec (Initial project code)
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websites = await getUserWebsites(user.id);

<<<<<<< HEAD
=======
    // F-118: Pagination Support
    const page = parseInt(req.query.page as string);
    const limit = parseInt(req.query.limit as string);

    if (!isNaN(page) && !isNaN(limit) && page > 0 && limit > 0) {
      const startIndex = (page - 1) * limit;
      const sliced = websites.slice(startIndex, startIndex + limit);
      return res.status(200).json({
        success: true,
        page,
        limit,
        totalItems: websites.length,
        totalPages: Math.ceil(websites.length / limit),
        websites: sliced,
      });
    }

>>>>>>> 8d95dec (Initial project code)
    return res.status(200).json({
      success: true,
      websites,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/websites/:id
 * Get single website details and editor JSON data
 */
export async function getWebsiteByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;

    const website = await getWebsiteById(websiteId, user.id);

    return res.status(200).json({
      success: true,
      website,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites
 * Create a new website with subscription limit validation
 */
export async function createWebsiteHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const { name } = req.body;

    const website = await createWebsite(user.id, name);

    return res.status(201).json({
      success: true,
      message: "Website created successfully",
      website,
    });
  } catch (error) {
    next(error);
  }
}

<<<<<<< HEAD
/**
 * PUT /api/websites/:id
 * Save updated editor JSON data
=======
import { validateSnippet, validateSecurity, detectDependencyConflicts } from "../utils/customCodeValidator.js";

/**
 * PUT /api/websites/:id
 * Save updated editor JSON data with strict custom code validation
>>>>>>> 8d95dec (Initial project code)
 */
export async function updateWebsiteHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const { editorData } = req.body;
<<<<<<< HEAD
=======
    // F-118 RBAC Verification
    const isStandardUser = user.role === 'USER';

    // Check elements for F-110 htmlAllowScripts bypass
    if (editorData?.elements) {
      const checkHtmlScripts = (elements: any[]) => {
        for (const el of elements) {
          if (el.type === 'html' && el.htmlAllowScripts === true) {
            if (isStandardUser) {
              throw new Error("RBAC_VIOLATION: Only Administrators can enable Unsafe Scripts in HTML Widgets.");
            }
          }
          if (el.children) checkHtmlScripts(el.children);
        }
      };
      try {
        checkHtmlScripts(editorData.elements);
      } catch (err: any) {
        return res.status(403).json({ success: false, message: err.message });
      }
    }

    // Check Custom Code List for Javascript (F-118)
    if (editorData?.globalSettings?.customCodeList) {
      const hasJs = editorData.globalSettings.customCodeList.some((s: any) => s.type === 'javascript');
      if (hasJs && isStandardUser) {
        return res.status(403).json({ success: false, message: "Only Administrators can modify or deploy Custom Javascript Logic." });
      }
    }


    // Validate custom code if present
    const warnings: any[] = [];
    if (editorData && editorData.globalSettings) {
      const { customCodeList = [], customCodeRevisions = [] } = editorData.globalSettings;

      // Conflict Detection
      const conflicts = detectDependencyConflicts(customCodeList);
      const blockingConflicts = conflicts.filter(c => {
        if (c.severity !== "error") return false;
        if (!c.snippetId) return true; // Global version conflicts are blocking
        const snip = customCodeList.find((s: any) => s.id === c.snippetId);
        return snip && snip.publishedRevisionId;
      });

      if (blockingConflicts.length > 0) {
        return res.status(400).json({
          success: false,
          code: "CUSTOM_CODE_VALIDATION_FAILED",
          message: `Publishing blocked due to active dependency conflicts`,
          errors: blockingConflicts.map(c => ({
            type: "dependency_conflict",
            message: c.message
          }))
        });
      }

      conflicts.forEach(c => {
        warnings.push({
          snippetId: c.snippetId,
          name: c.snippetName || "Global Dependency Check",
          message: `[${c.severity.toUpperCase()}] ${c.message}`
        });
      });
      for (const snip of customCodeList) {
        const targetEnvs = snip.environments || ["development", "staging", "production"];

        // 1. Always enforce security validation on draft code
        const draftSecurity = validateSecurity(snip.code || "", snip.type || "javascript");
        if (!draftSecurity.isValid) {
          return res.status(400).json({
            success: false,
            code: "CUSTOM_CODE_VALIDATION_FAILED",
            message: `Security validation blocked snippet "${snip.name}": ${draftSecurity.errorMsg}`,
            errors: [{
              type: "security",
              message: draftSecurity.errorMsg || "Security violation detected"
            }]
          });
        }

        // 2. Enforce strict validation on the published revision code
        if (snip.publishedRevisionId) {
          const publishedRev = customCodeRevisions.find((r: any) => r.id === snip.publishedRevisionId);
          if (!publishedRev) {
            return res.status(400).json({
              success: false,
              code: "CUSTOM_CODE_VALIDATION_FAILED",
              message: `Published revision ${snip.publishedRevisionId} was not found in revisions list`,
              errors: [{
                type: "revision",
                message: "Published revision not found"
              }]
            });
          }

          const validationResult = validateSnippet(
            publishedRev.name || snip.name,
            publishedRev.code || "",
            publishedRev.type || snip.type,
            publishedRev.placement || snip.placement,
            publishedRev.conditions || snip.conditions || [],
            publishedRev.environments || targetEnvs,
            publishedRev.dependencies || snip.dependencies
          );

          if (!validationResult.isValid) {
            return res.status(400).json({
              success: false,
              code: "CUSTOM_CODE_VALIDATION_FAILED",
              message: `Validation failed for published snippet "${publishedRev.name || snip.name}"`,
              errors: [validationResult.error]
            });
          }
        }

        // 3. Collect non-blocking syntax parser warnings on draft code
        const draftValidation = validateSnippet(
          snip.name,
          snip.code || "",
          snip.type || "javascript",
          snip.placement || "body-end",
          snip.conditions || [],
          targetEnvs,
          snip.dependencies
        );
        if (!draftValidation.isValid) {
          warnings.push({
            snippetId: snip.id,
            name: snip.name,
            message: draftValidation.error?.message,
            line: draftValidation.error?.line,
            column: draftValidation.error?.column
          });
        }
      }
    }
>>>>>>> 8d95dec (Initial project code)

    const website = await updateWebsiteEditorData(websiteId, user.id, editorData);

    return res.status(200).json({
      success: true,
      message: "Website saved successfully",
      website,
<<<<<<< HEAD
=======
      warnings,
>>>>>>> 8d95dec (Initial project code)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/websites/:id
 * Delete a user's website
 */
export async function deleteWebsiteHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;

    await deleteWebsite(websiteId, user.id);

    return res.status(200).json({
      success: true,
      message: "Website deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
<<<<<<< HEAD
=======

/**
 * POST /api/websites/:id/publish
 */
export async function publishWebsiteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const website = await publishWebsiteService(req.params.id as string, res.locals.user.id);
    return res.status(200).json({ success: true, message: "Website published successfully", website });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites/:id/restore/:revisionId
 */
export async function restoreRevisionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const website = await restoreRevisionService(req.params.id as string, res.locals.user.id, req.params.revisionId as string);
    return res.status(200).json({ success: true, message: "Revision restored to draft successfully", website });
  } catch (error) {
    next(error);
  }
}
>>>>>>> 8d95dec (Initial project code)

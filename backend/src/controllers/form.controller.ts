import type { Request, Response, NextFunction } from "express";
import {
  processFormSubmission,
  getWebsiteSubmissions,
  deleteWebsiteSubmission,
} from "../services/form/form.service.js";

/**
 * POST /api/forms/submit
 * Public endpoint to accept visitor form submissions
 */
export async function submitFormHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { websiteId, formId, formName, fields, actions, spamProtection, honeypotValue } = req.body;

    const metadata = {
      ip: req.ip || req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
      referer: req.headers["referer"] || "",
    };

    const result = await processFormSubmission({
      websiteId,
      formId,
      formName,
      fields,
      actions,
      spamProtection,
      honeypotValue,
      metadata,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/forms/:websiteId/submissions
 * Authenticated endpoint to fetch leads for a specific website
 */
export async function getWebsiteSubmissionsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;

    const submissions = await getWebsiteSubmissions(websiteId, user.id);

    return res.status(200).json({
      success: true,
      submissions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/forms/:websiteId/submissions/:submissionId
 * Authenticated endpoint to delete a submission record
 */
export async function deleteSubmissionHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;
    const submissionId = req.params.submissionId as string;

    await deleteWebsiteSubmission(websiteId, submissionId, user.id);

    return res.status(200).json({
      success: true,
      message: "Submission deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/forms/:websiteId/export
 * Authenticated endpoint to export submissions as CSV or JSON
 */
export async function exportSubmissionsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;
    const format = (req.query.format as string) || "json";

    const submissions = await getWebsiteSubmissions(websiteId, user.id);

    if (format === "csv") {
      if (submissions.length === 0) {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=submissions-${websiteId}.csv`);
        return res.status(200).send("id,formId,formName,submittedAt,data\n");
      }

      // Collect all field keys
      const allKeys = new Set<string>();
      submissions.forEach((s) => {
        if (s.data && typeof s.data === "object") {
          Object.keys(s.data).forEach((k) => allKeys.add(k));
        }
      });
      const keyList = Array.from(allKeys);

      const header = ["ID", "Form Name", "Submitted At", ...keyList].join(",");
      const rows = submissions.map((s) => {
        const fieldValues = keyList.map((k) => {
          const val = s.data?.[k] !== undefined ? String(s.data[k]).replace(/"/g, '""') : "";
          return `"${val}"`;
        });
        return [
          `"${s.id}"`,
          `"${s.formName || ""}"`,
          `"${s.createdAt ? new Date(s.createdAt).toISOString() : ""}"`,
          ...fieldValues,
        ].join(",");
      });

      const csvContent = [header, ...rows].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=submissions-${websiteId}.csv`);
      return res.status(200).send(csvContent);
    }

    return res.status(200).json({
      success: true,
      submissions,
    });
  } catch (error) {
    next(error);
  }
}

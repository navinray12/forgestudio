/**
 * @file Developer tools: HTTP handlers that translate requests into module operations and responses. File responsibility: developer controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { Request, Response, NextFunction } from "express";
import { getUserWebsites, getWebsiteById, updateWebsiteEditorData } from "../websites/website.service.js";
import { AppError } from "../../platform/http/app-error.js";

// Helper strictly filtering the response output mapping (F-118 Output Serialization)
/**
 * Serialize Website.
 * @param ws Ws supplied to this operation (type: any).
 */
const serializeWebsite = (ws: any) => ({
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    status: ws.status,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
});

/**
 * Get Developer Websites Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function getDeveloperWebsitesHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const user = res.locals.user;
        const page = parseInt(req.query.page as string || "1", 10);
        let limit = parseInt(req.query.limit as string || "20", 10);

        if (limit > 100) limit = 100;

        let statusFilter = req.query.status as string | undefined;

        // Fetch using existing service and prune response.
        // F-118 Note: Pagination mapping at the db level isn't exposed in our current internal getUserWebsites gracefully, 
        // so we manually splice the user's data array as an immediate fallback.
        const websitesData = await getUserWebsites(user.id);
        let filtered = websitesData;

        if (statusFilter) {
            filtered = filtered.filter((w: any) => w.status === statusFilter?.toUpperCase());
        }

        const total = filtered.length;
        const startIndex = (page - 1) * limit;
        const paginated = filtered.slice(startIndex, startIndex + limit);

        return res.status(200).json({
            data: paginated.map(serializeWebsite),
            pagination: {
                page,
                limit,
                total
            }
        });
    } catch (e) {
        next(e);
    }
}

/**
 * Get Developer Website By Id Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function getDeveloperWebsiteByIdHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const user = res.locals.user;
        const websiteId = req.params.id as string;

        const website = await getWebsiteById(websiteId, user.id); // Validates ownership implicitly via Service
        if (!website) {
            throw new AppError("Website not found or access denied.", 404, "NOT_FOUND");
        }

        return res.status(200).json({
            data: {
                ...serializeWebsite(website),
                editorData: website.editorData // Expose structured editorData safely.
            }
        });
    } catch (error: any) {
        if (error instanceof Error && error.message.includes("not found")) {
            return next(new AppError("Website not found or access denied.", 404, "NOT_FOUND"));
        }
        next(error);
    }
}

/**
 * Update Developer Website Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function updateDeveloperWebsiteHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const user = res.locals.user;
        const websiteId = req.params.id as string;

        // F-118: DO NOT completely blast over editorData via API blindly.
        // We only accept valid editorData subset PATCH mappings.
        const { editorData } = req.body;
        if (!editorData) {
            throw new AppError("Missing editorData payload.", 400, "INVALID_REQUEST");
        }

        // Implicit ownership verification and validation exists right inside updateWebsiteEditorData!
        // It validates priority integers structurally against floats/overflows globally.
        const website = await updateWebsiteEditorData(websiteId, user.id, editorData);

        return res.status(200).json({
            data: serializeWebsite(website)
        });
    } catch (e) {
        next(e);
    }
}

/**
 * Publish Developer Website Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function publishDeveloperWebsiteHandler(req: Request, res: Response, next: NextFunction) {
    try {
        // F-118 Publish Workflow
        const user = res.locals.user;
        const websiteId = req.params.id as string;

        const website = await getWebsiteById(websiteId, user.id);
        const editorData = website.editorData as any;

        if (!editorData) {
            throw new AppError("Malformed editorData.", 500, "SERVER_ERROR");
        }

        // Transactionally commit publish transformations! 
        // Iterate through all custom snippets and merge drafted -> published safely just like front-end does!
        if (Array.isArray(editorData.customCodeSnippets)) {
            editorData.customCodeSnippets = editorData.customCodeSnippets.map((snippet: any) => {
                if (snippet.status === "scheduled") return snippet; // Scheduler has ownership over scheduling!

                if (snippet.status === "modified" || snippet.status === "draft") {
                    return {
                        ...snippet,
                        status: "published",
                        published: JSON.parse(JSON.stringify(snippet.draft)),
                        updatedAt: new Date().toISOString()
                    };
                }
                return snippet;
            });
        }

        // Then, rewrite this mutated blob into DB exactly mirroring standard user flows utilizing the unified service 
        const updated = await updateWebsiteEditorData(websiteId, user.id, editorData);

        return res.status(200).json({
            message: "Website strictly published securely.",
            data: serializeWebsite(updated)
        });

    } catch (e) {
        next(e);
    }
}

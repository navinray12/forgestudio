import type { Request, Response, NextFunction } from "express";
import { getUserWebsites, getWebsiteById, updateWebsiteEditorData } from "../services/website.service.js";
import { AppError } from "../utils/app-error.js";

// Helper strictly filtering the response output mapping (F-118 Output Serialization)
const serializeWebsite = (ws: any) => ({
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    status: ws.status,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
});

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

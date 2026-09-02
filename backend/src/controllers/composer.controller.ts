import { type Request, type Response } from "express";
import {
    detectComposerStatus,
    validateComposerJson,
    composerInstall,
    composerUpdate,
} from "../services/composer.service.js";
import path from "path";

// The project root (Node.js app). If a php/ subdirectory exists, that is the Composer root.
// Admins can override via COMPOSER_PROJECT_PATH env variable.
function resolveComposerPath(): string {
    if (process.env.COMPOSER_PROJECT_PATH) {
        return process.env.COMPOSER_PROJECT_PATH;
    }
    // Default: try a php/ subfolder next to the backend
    return path.resolve(process.cwd(), "..", "php");
}

/** GET /api/v1/composer/status */
export async function composerStatusHandler(req: Request, res: Response) {
    try {
        const projectPath = resolveComposerPath();
        const status = await detectComposerStatus(projectPath);
        res.json({ success: true, data: status });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}

/** POST /api/v1/composer/validate */
export async function composerValidateHandler(req: Request, res: Response) {
    try {
        const projectPath = resolveComposerPath();
        const result = await validateComposerJson(projectPath);
        res.json({ success: true, data: result });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}

/** POST /api/v1/composer/install */
export async function composerInstallHandler(req: Request, res: Response) {
    try {
        const projectPath = resolveComposerPath();

        // Verify Composer is present before running
        const status = await detectComposerStatus(projectPath);
        if (!status.composerAvailable) {
            return res.status(409).json({ success: false, message: "Composer is not available on this server." });
        }
        if (!status.composerJsonExists) {
            return res.status(409).json({ success: false, message: "No composer.json found in project path." });
        }

        const result = await composerInstall(projectPath);
        res.json({ success: result.success, data: result });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}

/** POST /api/v1/composer/update */
export async function composerUpdateHandler(req: Request, res: Response) {
    try {
        const { packageName, versionConstraint } = req.body as {
            packageName?: string;
            versionConstraint?: string;
        };

        const projectPath = resolveComposerPath();
        const status = await detectComposerStatus(projectPath);
        if (!status.composerAvailable) {
            return res.status(409).json({ success: false, message: "Composer is not available on this server." });
        }

        const result = await composerUpdate(projectPath, packageName, versionConstraint);
        res.json({ success: result.success, data: result });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}

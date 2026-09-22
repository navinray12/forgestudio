/**
 * @file Php integrations: HTTP handlers that translate requests into module operations and responses. File responsibility: composer controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { Request, Response, NextFunction } from "express";
import { checkComposerEnvironment, validateComposerConfig, runComposerInstall } from "./composer.service.js";

/**
 * Get Composer Status.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function getComposerStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const status = await checkComposerEnvironment();
        res.status(200).json({ success: true, data: status });
    } catch (e) {
        next(e);
    }
}

/**
 * Validate Composer.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function validateComposer(req: Request, res: Response, next: NextFunction) {
    try {
        const { config } = req.body;
        if (!config || typeof config !== "string") {
            return res.status(400).json({ success: false, error: { message: "Invalid configuration provided." } });
        }

        const isValid = await validateComposerConfig(config);
        if (isValid) {
            res.status(200).json({ success: true, message: "Composer configuration is valid." });
        } else {
            res.status(422).json({ success: false, error: { message: "Composer configuration is invalid." } });
        }
    } catch (e) {
        next(e);
    }
}

/**
 * Install Dependencies.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function installDependencies(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await runComposerInstall();
        if (result.success) {
            res.status(200).json({ success: true, message: "Dependencies installed successfully", output: result.output });
        } else {
            res.status(500).json({ success: false, error: { message: "Dependency installation failed", details: result.output } });
        }
    } catch (e) {
        next(e);
    }
}

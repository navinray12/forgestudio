import type { Request, Response, NextFunction } from "express";
import { checkComposerEnvironment, validateComposerConfig, runComposerInstall } from "../services/composer.service.js";

export async function getComposerStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const status = await checkComposerEnvironment();
        res.status(200).json({ success: true, data: status });
    } catch (e) {
        next(e);
    }
}

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

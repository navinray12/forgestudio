/**
 * @file Plugin compatibility: HTTP handlers that translate requests into module operations and responses. File responsibility: plugin compat controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Request, Response } from 'express';
import { prisma } from '../../platform/database/prisma.js';

/**
 * Get Plugins.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export const getPlugins = async (req: Request, res: Response) => {
    try {
        const plugins = await prisma.pluginCompatibility.findMany();
        res.status(200).json({ success: true, plugins });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

/**
 * Activate Plugin.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export const activatePlugin = async (req: Request, res: Response) => {
    try {
        const { pluginId } = req.params;
        const plugin = await prisma.pluginCompatibility.update({
            where: { id: pluginId as string },
            data: { compatibilityStatus: "SUPPORTED" } // "Activated / Supported"
        });
        res.status(200).json({ success: true, plugin });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

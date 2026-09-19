import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export const getPlugins = async (req: Request, res: Response) => {
    try {
        const plugins = await prisma.pluginCompatibility.findMany();
        res.status(200).json({ success: true, plugins });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

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

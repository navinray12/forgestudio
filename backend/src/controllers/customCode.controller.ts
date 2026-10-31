import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import * as acorn from 'acorn';
import { authorizeResourceAccess } from '../services/permission.service.js';

export const getCustomCodeSnippets = async (req: Request, res: Response, next?: NextFunction) => {
    try {
        const { websiteId } = req.params;
        const user = res.locals.user || (req as any).user;

        if (!websiteId) {
            return res.status(400).json({ success: false, message: 'Website ID is required' });
        }

        const customCodeSnippetModel = (prisma as any)?.customCodeSnippet;
        if (!customCodeSnippetModel) {
            return res.status(200).json({ success: true, snippets: [] });
        }

        // Defense-in-depth: Verify caller has at least VIEW capability on the website
        if (user) {
            await authorizeResourceAccess(user.id, websiteId as string, "*", "VIEW");
        }

        const snippets = await customCodeSnippetModel.findMany({
            where: {
                websiteId: websiteId as string,
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        res.status(200).json({ success: true, snippets });
    } catch (error) {
        if (next) return next(error);
        console.error('Error fetching custom code snippets:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const createCustomCodeSnippet = async (req: Request, res: Response, next?: NextFunction) => {
    try {
        const { websiteId } = req.params;
        const user = res.locals.user || (req as any).user;
        const { title, language, code, placement, scope, pageId, isActive, conditions, priority, status, scheduledFor } = req.body;

        if (!websiteId || !title || !language || !placement) {
            return res.status(400).json({ success: false, message: 'Missing required parameters' });
        }

        if (language === 'JS' && code) {
            try {
                acorn.parse(code, { ecmaVersion: 2020 });
            } catch (err: any) {
                return res.status(400).json({ success: false, message: 'Syntax Error in JavaScript code: ' + err.message });
            }
        }

        // Defense-in-depth: Verify caller has CUSTOM_CODE capability on the website
        if (user) {
            await authorizeResourceAccess(user.id, websiteId as string, "*", "CUSTOM_CODE");
        }

        const customCodeSnippetModel = (prisma as any)?.customCodeSnippet;
        if (!customCodeSnippetModel) {
            return res.status(500).json({ success: false, message: 'Custom code model not initialized' });
        }

        const newSnippet = await customCodeSnippetModel.create({
            data: {
                websiteId: websiteId as string,
                title,
                language,
                code: code || "",
                placement,
                scope: scope || "GLOBAL",
                pageId: pageId || null,
                conditions: conditions || null,
                priority: priority || 0,
                status: status || "DRAFT",
                scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        res.status(201).json({ success: true, snippet: newSnippet });
    } catch (error) {
        if (next) return next(error);
        console.error('Error creating custom code snippet:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const updateCustomCodeSnippet = async (req: Request, res: Response, next?: NextFunction) => {
    try {
        const { id } = req.params;
        const user = res.locals.user || (req as any).user;
        const { title, language, code, placement, scope, pageId, isActive, conditions, priority, status, scheduledFor } = req.body;

        if (language === 'JS' && code) {
            try {
                acorn.parse(code, { ecmaVersion: 2020 });
            } catch (err: any) {
                return res.status(400).json({ success: false, message: 'Syntax Error in JavaScript code: ' + err.message });
            }
        }

        const customCodeSnippetModel = (prisma as any)?.customCodeSnippet;
        if (!customCodeSnippetModel) {
            return res.status(500).json({ success: false, message: 'Custom code model not initialized' });
        }

        // Verify snippet exists
        const existingSnippet = await customCodeSnippetModel.findUnique({
            where: { id: id as string },
            include: { website: true }
        });

        if (!existingSnippet) {
            return res.status(404).json({ success: false, message: 'Snippet not found' });
        }

        // Defense-in-depth: Verify caller has CUSTOM_CODE capability on snippet's website
        if (user) {
            await authorizeResourceAccess(user.id, existingSnippet.websiteId, "*", "CUSTOM_CODE");
        }

        const updatedSnippet = await customCodeSnippetModel.update({
            where: { id: id as string },
            data: {
                title: title !== undefined ? title : existingSnippet.title,
                language: language !== undefined ? language : existingSnippet.language,
                code: code !== undefined ? code : existingSnippet.code,
                placement: placement !== undefined ? placement : existingSnippet.placement,
                scope: scope !== undefined ? scope : existingSnippet.scope,
                pageId: pageId !== undefined ? pageId : existingSnippet.pageId,
                conditions: conditions !== undefined ? conditions : existingSnippet.conditions,
                priority: priority !== undefined ? priority : existingSnippet.priority,
                status: status !== undefined ? status : existingSnippet.status,
                scheduledFor: scheduledFor !== undefined ? (scheduledFor ? new Date(scheduledFor) : null) : existingSnippet.scheduledFor,
                isActive: isActive !== undefined ? isActive : existingSnippet.isActive
            }
        });

        res.status(200).json({ success: true, snippet: updatedSnippet });
    } catch (error) {
        if (next) return next(error);
        console.error('Error updating custom code snippet:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const deleteCustomCodeSnippet = async (req: Request, res: Response, next?: NextFunction) => {
    try {
        const { id } = req.params;
        const user = res.locals.user || (req as any).user;

        const customCodeSnippetModel = (prisma as any)?.customCodeSnippet;
        if (!customCodeSnippetModel) {
            return res.status(500).json({ success: false, message: 'Custom code model not initialized' });
        }

        const existingSnippet = await customCodeSnippetModel.findUnique({
            where: { id: id as string },
            include: { website: true }
        });

        if (!existingSnippet) {
            return res.status(404).json({ success: false, message: 'Snippet not found' });
        }

        // Defense-in-depth: Verify caller has CUSTOM_CODE capability on snippet's website
        if (user) {
            await authorizeResourceAccess(user.id, existingSnippet.websiteId, "*", "CUSTOM_CODE");
        }

        await customCodeSnippetModel.delete({
            where: { id: id as string }
        });

        res.status(200).json({ success: true, message: 'Snippet deleted successfully' });
    } catch (error) {
        if (next) return next(error);
        console.error('Error deleting custom code snippet:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

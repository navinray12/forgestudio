import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import * as acorn from 'acorn';

export const getCustomCodeSnippets = async (req: Request, res: Response) => {
    try {
        const { websiteId } = req.params;

        if (!websiteId) {
            return res.status(400).json({ success: false, message: 'Website ID is required' });
        }

        const snippets = await prisma.customCodeSnippet.findMany({
            where: {
                websiteId: websiteId as string,
                // Ensure implicit verification that user has access to website
                website: {
                    userId: res.locals.user?.id
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        res.status(200).json({ success: true, snippets });
    } catch (error) {
        console.error('Error fetching custom code snippets:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const createCustomCodeSnippet = async (req: Request, res: Response) => {
    try {
        const { websiteId } = req.params;
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

        // Verify website ownership
        const website = await prisma.website.findUnique({
            where: { id: websiteId as string }
        });

        if (!website || website.userId !== res.locals.user?.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to website' });
        }

        const newSnippet = await prisma.customCodeSnippet.create({
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
        console.error('Error creating custom code snippet:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const updateCustomCodeSnippet = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, language, code, placement, scope, pageId, isActive, conditions, priority, status, scheduledFor } = req.body;

        if (language === 'JS' && code) {
            try {
                acorn.parse(code, { ecmaVersion: 2020 });
            } catch (err: any) {
                return res.status(400).json({ success: false, message: 'Syntax Error in JavaScript code: ' + err.message });
            }
        }

        // Verify snippet exists and user owns it via website
        const existingSnippet = await prisma.customCodeSnippet.findUnique({
            where: { id: id as string },
            include: { website: true }
        });

        if (!existingSnippet || existingSnippet.website.userId !== res.locals.user?.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized or snippet not found' });
        }

        const updatedSnippet = await prisma.customCodeSnippet.update({
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
        console.error('Error updating custom code snippet:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const deleteCustomCodeSnippet = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const existingSnippet = await prisma.customCodeSnippet.findUnique({
            where: { id: id as string },
            include: { website: true }
        });

        if (!existingSnippet || existingSnippet.website.userId !== res.locals.user?.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized or snippet not found' });
        }

        await prisma.customCodeSnippet.delete({
            where: { id: id as string }
        });

        res.status(200).json({ success: true, message: 'Snippet deleted successfully' });
    } catch (error) {
        console.error('Error deleting custom code snippet:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

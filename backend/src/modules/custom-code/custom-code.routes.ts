/**
 * @file Custom code: HTTP route registration and middleware order. File responsibility: custom code routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from 'express';
import { getCustomCodeSnippets, createCustomCodeSnippet, updateCustomCodeSnippet, deleteCustomCodeSnippet } from './custom-code.controller.js';
import { requireAuth } from '../authentication/session-authentication.middleware.js';

const router = Router();

router.use(requireAuth as any); // Ensure all routes are protected

// Note: Get and Create act on a specific websiteId
router.get('/website/:websiteId', getCustomCodeSnippets as any);
router.post('/website/:websiteId', createCustomCodeSnippet as any);

// Update and Delete act on a specific snippetId
router.put('/:id', updateCustomCodeSnippet as any);
router.delete('/:id', deleteCustomCodeSnippet as any);

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import {
  getCustomCodeSnippets,
  createCustomCodeSnippet,
  updateCustomCodeSnippet,
  deleteCustomCodeSnippet,
} from '../controllers/customCode.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authorizeCapability, authorizeResourceAccess } from '../services/permission.service.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';

const router = Router();

// Ensure all routes require valid authentication session
router.use(requireAuth as any);

/**
 * Middleware to authorize capabilities for snippet-specific operations (/custom-code/:id).
 * Resolves the parent websiteId from the snippet record and verifies capability access.
 */
function authorizeSnippetCapability(capability: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = res.locals.user || (req as any).user;
      if (!user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }

      const { id } = req.params;
      if (!id) {
        throw new AppError("Snippet ID is required", 400, "BAD_REQUEST");
      }

      const customCodeSnippetModel = (prisma as any)?.customCodeSnippet;
      if (!customCodeSnippetModel) {
        throw new AppError("Custom code model not initialized", 500, "INTERNAL_ERROR");
      }

      const existingSnippet = await customCodeSnippetModel.findUnique({
        where: { id: id as string },
        select: { id: true, websiteId: true },
      });

      if (!existingSnippet) {
        throw new AppError("Snippet not found", 404, "NOT_FOUND");
      }

      await authorizeResourceAccess(user.id, existingSnippet.websiteId, "*", capability);
      res.locals.existingSnippet = existingSnippet;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Get and Create act on a specific websiteId
router.get('/website/:websiteId', authorizeCapability('VIEW'), getCustomCodeSnippets as any);
router.post('/website/:websiteId', authorizeCapability('CUSTOM_CODE'), createCustomCodeSnippet as any);

// Update and Delete act on a specific snippetId
router.put('/:id', authorizeSnippetCapability('CUSTOM_CODE'), updateCustomCodeSnippet as any);
router.delete('/:id', authorizeSnippetCapability('CUSTOM_CODE'), deleteCustomCodeSnippet as any);

export default router;

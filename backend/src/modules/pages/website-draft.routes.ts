/**
 * @file Pages: HTTP route registration and middleware order. File responsibility: website draft routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from 'express';
import { saveWebsiteDraft, websiteDraftSaveSchema } from './save-website-draft.js';
import { requireAuth } from '../authentication/session-authentication.middleware.js';
import { AppError } from '../../platform/http/app-error.js';
import { z } from 'zod';
const router = Router();
router.post('/:id/draft-saves', requireAuth, async (req, res, next) => {
  try {
    const site = z.uuid().safeParse(req.params.id);
    const parsed = websiteDraftSaveSchema.safeParse(req.body);
    if (!site.success || !parsed.success) throw new AppError('Invalid draft-save command.', 422, 'INVALID_DRAFT_COMMAND');
    if (req.header('idempotency-key') !== parsed.data.mutationId) throw new AppError('Idempotency-Key must match mutationId.', 400, 'IDEMPOTENCY_KEY_MISMATCH');
    const origin = req.header('origin');
    if (origin && origin !== process.env.FRONTEND_URL) throw new AppError('Untrusted request origin.', 403, 'UNTRUSTED_ORIGIN');
    const receipt = await saveWebsiteDraft(site.data, res.locals.user.id, parsed.data, res.locals.session.id);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(receipt);
  } catch (error) { next(error); }
});
export default router;

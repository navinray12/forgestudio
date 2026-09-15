/**
 * @file Pages: module implementation. File responsibility: save website draft.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../../platform/database/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../platform/http/app-error.js';
import { canUserAccessResource } from '../permissions/permission.service.js';
import { getWebsiteById, updateWebsiteEditorData } from '../websites/website.service.js';
import { validateLegacyDocument } from './validate-legacy-document.js';

export const websiteDraftSaveSchema = z.strictObject({
  mutationId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
  expectedRevision: z.uuid(),
  authorityEpoch: z.literal('1'),
  document: z.record(z.string(), z.json()),
});
export type WebsiteDraftSave = z.infer<typeof websiteDraftSaveSchema>;

/** Stable JSON hashing for the retained legacy format; not a PHP parity claim.
 * @param value Value supplied to this operation (type: unknown).
 * @param depth Depth supplied to this operation. Defaults to 0.
 */
export function canonicalLegacyJson(value: unknown, depth = 0): string {
  if (depth > 100) throw new AppError('Document nesting exceeds the supported limit.', 422, 'DOCUMENT_TOO_DEEP');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(item => canonicalLegacyJson(item, depth + 1)).join(',')}]`;
  if (typeof value === 'object' && value) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalLegacyJson((value as Record<string, unknown>)[key], depth + 1)}`).join(',')}}`;
  throw new AppError('Document must contain finite JSON values.', 422, 'INVALID_DOCUMENT');
}
/**
 * Digest.
 * @param value Value supplied to this operation (type: unknown).
 */
const digest = (value: unknown) => createHash('sha256').update(canonicalLegacyJson(value)).digest('hex');
/**
 * Draft Only.
 * @param value Value supplied to this operation (type: Prisma.JsonValue | Record<string, unknown>).
 */
function draftOnly(value: Prisma.JsonValue | Record<string, unknown>) {
  const document = typeof value === 'string' ? JSON.parse(value) : value;
  const { publishedData: _live, publishing: _publishing, ...draft } = document;
  return draft as Prisma.InputJsonObject;
}

/**
 * Submitted Fields Persisted.
 * @param submitted Submitted supplied to this operation (type: unknown).
 * @param persisted Persisted supplied to this operation (type: unknown).
 */
function submittedFieldsPersisted(submitted: unknown, persisted: unknown): boolean {
  if (Array.isArray(submitted)) return Array.isArray(persisted) && submitted.length === persisted.length && submitted.every((item, index) => submittedFieldsPersisted(item, persisted[index]));
  if (submitted !== null && typeof submitted === 'object') return persisted !== null && typeof persisted === 'object' && !Array.isArray(persisted) && Object.entries(submitted).every(([key, value]) => Object.hasOwn(persisted, key) && submittedFieldsPersisted(value, (persisted as Record<string, unknown>)[key]));
  return submitted === persisted;
}

/**
 * Save one draft atomically with its mutation receipt and audit record.
 * Replayed commands are reauthorized; stale revisions and partial protected edits fail.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param actorId Authenticated account whose permissions are checked inside the transaction.
 * @param command Validated draft, mutation ID, revision precondition and authority epoch.
 * @param sessionId Optional authenticated browser session to recheck before committing.
 * @returns The new acceptance receipt, or an existing receipt for an identical retry.
 */
export async function saveWebsiteDraft(websiteId: string, actorId: string, command: WebsiteDraftSave, sessionId?: string) {
  // Shape/depth/hash work occurs before the short persistence transaction.
  validateLegacyDocument(command.document);
  const requestHash = digest(command);
  if (Buffer.byteLength(JSON.stringify(command.document), 'utf8') > 2 * 1024 * 1024)
    throw new AppError('Document exceeds 2 MiB. Export or split the document before saving.', 413, 'DOCUMENT_TOO_LARGE');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SET LOCAL lock_timeout = '1000ms'`;
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM websites WHERE id = ${websiteId}::uuid FOR UPDATE`;
    if (!rows.length) throw new AppError('Website not found.', 404, 'WEBSITE_NOT_FOUND');
    // Hold existing policy rows through commit. Permission failures never replay a receipt.
    const users = await tx.$queryRaw<Array<{ status: string }>>`SELECT status FROM users WHERE id = ${actorId}::uuid FOR SHARE`;
    if (users[0]?.status !== 'ACTIVE') throw new AppError('Account is unavailable.', 403, 'ACCOUNT_UNAVAILABLE');
    if (sessionId) {
      const sessions = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM sessions WHERE id = ${sessionId}::uuid AND "userId" = ${actorId}::uuid AND "revokedAt" IS NULL AND "expiresAt" > CURRENT_TIMESTAMP FOR SHARE`;
      if (!sessions.length) throw new AppError('Sign in again before saving.', 401, 'SESSION_EXPIRED');
    }
    await tx.$queryRaw`SELECT id FROM website_collaborators WHERE "websiteId" = ${websiteId}::uuid AND "userId" = ${actorId}::uuid FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM granular_permissions WHERE "websiteId" = ${websiteId}::uuid AND "userId" = ${actorId}::uuid FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM component_accesses WHERE "websiteId" = ${websiteId}::uuid AND "userId" = ${actorId}::uuid FOR SHARE`;
    if (!await canUserAccessResource(actorId, websiteId, '*', 'VIEW', tx)) throw new AppError('Access denied.', 403, 'FORBIDDEN');
    const previous = await tx.draftSaveReceipt.findUnique({ where: { websiteId_actorId_mutationId: { websiteId, actorId, mutationId: command.mutationId } } });
    if (previous) {
      if (previous.requestHash !== requestHash) throw new AppError('This mutation ID was used for a different request.', 409, 'IDEMPOTENCY_KEY_REUSED');
      if (previous.expiresAt <= new Date()) throw new AppError('This mutation receipt expired. Compare the current draft before continuing.', 409, 'MUTATION_RECEIPT_EXPIRED');
      return receiptResponse(previous, true);
    }
    const current = await getWebsiteById(websiteId, actorId, tx);
    if (current.draftRevision !== command.expectedRevision) throw new AppError('Another save changed this draft. Your local changes are preserved; reload and compare before continuing.', 409, 'DRAFT_REVISION_CONFLICT');
    if (!await canUserAccessResource(actorId, websiteId, '*', 'EDIT', tx)) throw new AppError('You cannot edit this website.', 403, 'FORBIDDEN');
    const updated = await updateWebsiteEditorData(websiteId, actorId, command.document, undefined, tx);
    const document = draftOnly(updated.editorData as Prisma.JsonValue);
    if (!submittedFieldsPersisted(draftOnly(command.document), document))
      throw new AppError('Some submitted changes could not be preserved under your current permissions. Nothing was saved; keep your local copy and compare the host draft.', 422, 'DRAFT_CHANGES_REJECTED');
    const saved = await tx.draftSaveReceipt.create({ data: { websiteId, actorId, mutationId: command.mutationId, requestHash, acceptedRevision: updated.draftRevision as string, documentHash: digest(document), document } });
    // Existing AuditLog supports website-scoped immutable action details.
    await tx.auditLog.create({ data: { userId: actorId, action: 'DRAFT_SAVED', targetResource: websiteId, details: { websiteId, mutationId: command.mutationId, revision: saved.acceptedRevision, documentHash: saved.documentHash } } });
    return receiptResponse(saved, false);
  }, { timeout: 5000, maxWait: 2000 });
}
/**
 * Receipt Response.
 * @param receipt Receipt supplied to this operation (type: { mutationId: string; acceptedRevision: string; documentHash: string; acceptedAt: Date }).
 * @param replayed Replayed supplied to this operation (type: boolean).
 */
function receiptResponse(receipt: { mutationId: string; acceptedRevision: string; documentHash: string; acceptedAt: Date }, replayed: boolean) {
  return { mutationId: receipt.mutationId, acceptedRevision: receipt.acceptedRevision, documentHash: receipt.documentHash, acceptedAt: receipt.acceptedAt.toISOString(), replayed };
}

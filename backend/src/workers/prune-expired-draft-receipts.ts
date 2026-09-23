/**
 * @file Prune expired draft receipts: separately started background work; API requests do not start this process.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from '../platform/database/prisma.js';

/** The current head remains in Website; release/manual snapshots have separate retention. */
export async function pruneExpiredDraftReceipts(): Promise<number> {
  return prisma.$executeRaw`
    DELETE FROM draft_save_receipts WHERE id IN (
      SELECT receipt.id FROM draft_save_receipts receipt
      JOIN websites site ON site.id = receipt."websiteId"
      WHERE receipt."expiresAt" < CURRENT_TIMESTAMP
        AND receipt."acceptedRevision" <> site."draftRevision"
      ORDER BY receipt."expiresAt", receipt.id
      FOR UPDATE OF receipt SKIP LOCKED LIMIT 10
    )
  `;
}

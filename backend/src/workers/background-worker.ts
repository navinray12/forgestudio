/**
 * @file Background worker: separately started background work; API requests do not start this process.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import "dotenv/config";
import { setTimeout as delay } from "node:timers/promises";
import { prisma } from "../platform/database/prisma.js";
import { checkDatabaseReadiness } from "../platform/database/database-readiness.js";
import { processNextWebhookReceipt } from "../modules/wordpress-connections/process-webhook-receipts.js";
import { pruneExpiredDraftReceipts } from './prune-expired-draft-receipts.js';

await checkDatabaseReadiness();
let stopping = false;
const abort = new AbortController();
/**
 * Stop.
 */
const stop = () => {
  stopping = true;
  abort.abort();
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
console.log("Background worker started");
try {
  while (!stopping) {
    try {
      // Bounded, atomic claiming prevents duplicate schedulers racing a save.
      await prisma.$executeRaw`
        UPDATE custom_code_snippets SET status = 'PUBLISHED', "updatedAt" = NOW()
        WHERE id IN (
          SELECT id FROM custom_code_snippets
          WHERE status = 'SCHEDULED' AND "scheduledFor" <= NOW()
          ORDER BY "scheduledFor" FOR UPDATE SKIP LOCKED LIMIT 100
        )
      `;
      for (let count = 0; count < 100 && !stopping; count++) {
        if (!(await processNextWebhookReceipt())) break;
      }
      if (!stopping) await pruneExpiredDraftReceipts();
    } catch (error) {
      console.error("Background batch failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }
    if (!stopping)
      await delay(1000, undefined, { signal: abort.signal }).catch(() => {});
  }
} finally {
  await prisma.$disconnect();
}

/**
 * @file Wordpress connections: module implementation. File responsibility: process webhook receipts.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "../../platform/database/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { WebhookPayload } from "./webhook-envelope.js";

/** Database-only effects share the receipt transaction; worker death rolls back. */
export async function processNextWebhookReceipt(): Promise<boolean> {
  let claimedId: string | undefined;
  try {
    return await prisma.$transaction(async (tx) => {
      const candidates = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM wordpress_webhook_receipts
        WHERE status = 'PENDING' AND "nextAttemptAt" <= NOW()
        ORDER BY "createdAt", id FOR UPDATE SKIP LOCKED LIMIT 1
      `;
      if (!candidates[0]) return false;
      claimedId = candidates[0].id;
      const receipt = await tx.wordPressWebhookReceipt.findUniqueOrThrow({
        where: { id: claimedId },
      });
      const connection = await tx.wordPressConnection.findUniqueOrThrow({
        where: { id: receipt.connectionId },
      });
      if (connection.status !== "CONNECTED") {
        await tx.wordPressWebhookReceipt.update({
          where: { id: receipt.id },
          data: { status: "CANCELLED", lastError: "Connection disconnected" },
        });
        return true;
      }
      const payload = receipt.payload as unknown as WebhookPayload;
      if (payload.event === "form_submitted") {
        await tx.formSubmission.create({
          data: {
            websiteId: receipt.websiteId,
            formId: payload.data.formId as string,
            data: payload.data.formData as Prisma.InputJsonObject,
            ipAddress:
              typeof payload.data.clientIp === "string"
                ? payload.data.clientIp
                : null,
          },
        });
      }
      // Notifications are audit events, not proof of remote delivery or permission to overwrite drafts.
      await tx.auditLog.create({
        data: {
          action: "WORDPRESS_WEBHOOK_PROCESSED",
          targetResource: `website:${receipt.websiteId}`,
          details: {
            event: payload.event,
            eventId: receipt.eventId,
            receiptId: receipt.id,
          },
        },
      });
      await tx.wordPressWebhookReceipt.update({
        where: { id: receipt.id },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      return true;
    });
  } catch (error) {
    if (claimedId) {
      await prisma.$executeRaw`
        UPDATE wordpress_webhook_receipts
        SET attempts = attempts + 1,
            status = CASE WHEN attempts + 1 >= 5 THEN 'FAILED' ELSE 'PENDING' END,
            "nextAttemptAt" = NOW() + INTERVAL '1 minute',
            "lastError" = 'Receipt processing failed; inspect worker logs'
        WHERE id = ${claimedId}::uuid AND status = 'PENDING'
      `;
    }
    throw error;
  }
}

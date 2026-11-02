import "dotenv/config";
import http from "http";
import app from "./app.js";
import { prisma, pgPool, initializeDatabaseBootstrap } from "./config/prisma.js";
import { startScheduler, stopScheduler } from "./services/scheduleWorker.js";
import { initPresenceWebSocketServer } from "./services/collaboration/presence.service.js";
import { assertInvitationSmtpConfigured, sendWorkspaceInvitationMessage } from "./services/email.service.js";
import { invitationToken, invitationLink } from "./services/workspace-invitation-token.js";
import { createInvitationDispatcher, startInvitationWorker } from "./services/workspace-invitation-delivery.js";
import { createNotificationDispatcher, startNotificationWorker } from "./services/notification-delivery.js";

const PORT = process.env.PORT || 5000;

let server: http.Server | null = null;
let isShuttingDown = false;

async function startServer() {
  try {
    // 1. Verify database connectivity and schema bootstrap before listening
    await prisma.$queryRaw`SELECT 1`;
    await initializeDatabaseBootstrap();

    // 2. Start HTTP & WebSocket server only after verification succeeds
    server = http.createServer(app);
    initPresenceWebSocketServer(server);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      startScheduler();

      if (process.env.DASHBOARD_NOTIFICATION_EMAIL_ENABLED === "true") {
        try {
          assertInvitationSmtpConfigured();
          const stopNotifications = startNotificationWorker(
            createNotificationDispatcher(prisma, sendWorkspaceInvitationMessage)
          );
          server!.once("close", stopNotifications);
        } catch {
          console.warn("[Notifications] Optional email delivery is not configured.");
        }
      }

      try {
        assertInvitationSmtpConfigured();
        invitationLink("configuration-check", invitationToken("configuration-check", 1));
        const stop = startInvitationWorker(
          createInvitationDispatcher(prisma, sendWorkspaceInvitationMessage)
        );
        server!.once("close", stop);
      } catch {
        console.warn(
          "[Workspace invitations] Email delivery disabled: configure SMTP, FRONTEND_URL and WORKSPACE_INVITATION_TOKEN_KEY, then restart."
        );
      }
    });
  } catch (error) {
    console.error("❌ Fatal startup error: database verification failed:", error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handling for clean process termination.
 * Drains in-flight background tasks before closing network and database connections.
 * Prevents multiple concurrent/duplicate executions via isShuttingDown latch.
 */
export async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`\n🛑 [Process] Received ${signal}. Starting graceful shutdown...`);

  try {
    // 1. Stop scheduler and job worker loop, allow in-flight tasks up to 5s to complete
    try {
      await stopScheduler(5000);
      console.log("⏱️ Background scheduler and worker stopped.");
    } catch (schedErr) {
      console.error("❌ Error stopping scheduler:", schedErr);
    }

    // 2. Close HTTP/WebSocket server
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => {
          console.log("🔒 HTTP server closed.");
          resolve();
        });
      });
    }

    // 3. Cleanly disconnect database connection and connection pool
    try {
      await prisma.$disconnect();
      await pgPool.end();
      console.log("📦 Database connections closed cleanly.");
    } catch (dbErr) {
      console.error("❌ Error disconnecting database connections:", dbErr);
    }

    console.log("✅ Graceful shutdown completed.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during graceful shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

startServer();

import "dotenv/config";
import http from "http";
import app from "./app.js";
import { prisma, initializeDatabaseBootstrap } from "./config/prisma.js";
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

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // 1. Stop scheduler and job worker loop, allow in-flight tasks up to 5s to complete
    await stopScheduler(5000);

    // 2. Close HTTP/WebSocket server
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => {
          console.log("🔒 HTTP server closed.");
          resolve();
        });
      });
    }

    // 3. Cleanly disconnect database connection
    await prisma.$disconnect();
    console.log("📦 Database disconnected cleanly.");

    console.log("✅ Graceful shutdown completed.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during graceful shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

startServer();

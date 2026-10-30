import "dotenv/config";
import http from "http";
import app from "./app.js";
import { prisma, pgPool, initializeDatabaseBootstrap } from "./config/prisma.js";
import { startScheduler, stopScheduler } from "./services/scheduleWorker.js";
import { initPresenceWebSocketServer } from "./services/collaboration/presence.service.js";

const PORT = process.env.PORT || 5000;

let server: http.Server;

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
    });
  } catch (error) {
    console.error("❌ Fatal startup error: database verification failed:", error);
    process.exit(1);
  }
}

// Graceful shutdown handling for clean process termination
let isShuttingDown = false;

export async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`\n[Process] Received ${signal}. Initiating graceful shutdown...`);

  try {
    stopScheduler();
  } catch (schedErr) {
    console.error("[Process] Error stopping scheduler:", schedErr);
  }

  if (server) {
    server.close(async () => {
      console.log("[Process] HTTP server closed cleanly.");
      try {
        await prisma.$disconnect();
        await pgPool.end();
        console.log("[Process] Database connections closed cleanly.");
      } catch (dbErr) {
        console.error("[Process] Error closing database connections:", dbErr);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});

startServer();

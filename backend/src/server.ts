import "dotenv/config";
import http from "http";
import app from "./app.js";
import { prisma, pgPool } from "./config/prisma.js";
import { startScheduler, stopScheduler } from "./services/scheduleWorker.js";
import { initPresenceWebSocketServer } from "./services/collaboration/presence.service.js";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initPresenceWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`ðŸš€ Server running on port ${PORT}`);
  startScheduler();
});

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
}

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});

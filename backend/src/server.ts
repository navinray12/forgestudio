import "dotenv/config";
import http from "http";
import app from "./app.js";
import { startScheduler } from "./services/scheduleWorker.js";
import { initPresenceWebSocketServer } from "./services/collaboration/presence.service.js";
import { prisma, initializeDatabaseBootstrap } from "./config/prisma.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Verify database connectivity and schema bootstrap before listening
    await prisma.$queryRaw`SELECT 1`;
    await initializeDatabaseBootstrap();

    // 2. Start HTTP & WebSocket server only after verification succeeds
    const server = http.createServer(app);
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

startServer();
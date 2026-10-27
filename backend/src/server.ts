import "dotenv/config";
import http from "http";
import app from "./app.js";
import { startScheduler } from "./services/scheduleWorker.js";
import { initPresenceWebSocketServer } from "./services/collaboration/presence.service.js";
import { initializeDatabaseBootstrap } from "./config/prisma.js";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initPresenceWebSocketServer(server);

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  try {
    await initializeDatabaseBootstrap();
  } catch (err) {
    console.warn("Database bootstrap notice:", err);
  }
  startScheduler();
});
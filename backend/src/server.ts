import "dotenv/config";
import http from "http";
import app from "./app.js";
import { startScheduler } from "./services/scheduleWorker.js";
import { initPresenceWebSocketServer } from "./services/collaboration/presence.service.js";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initPresenceWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startScheduler();
});
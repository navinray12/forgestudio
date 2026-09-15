/**
 * @file Server: backend/src module support.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import "dotenv/config";
import app from "./app.js";
import { prisma } from "./platform/database/prisma.js";
import { checkDatabaseReadiness } from "./platform/database/database-readiness.js";

const PORT = process.env.PORT || 5000;

await checkDatabaseReadiness();
const server = app.listen(PORT, () => {
  const address = server.address();
  console.log(`API listening on port ${typeof address === "object" && address ? address.port : PORT}`);
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;

let stopping = false;
/**
 * Shutdown.
 */
function shutdown() {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 15000);
  deadline.unref();
  server.close(() => {
    void prisma.$disconnect().then(() => { clearTimeout(deadline); process.exit(0); });
  });
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

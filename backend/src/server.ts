import "dotenv/config";
import app from "./app.js";
<<<<<<< HEAD

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
=======
import { prisma } from "./config/prisma.js";
import { startScheduler } from "./services/scheduler.service.js";

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // Explicitly connect Prisma before starting the server and scheduler.
  // With the PrismaPg adapter, this ensures the connection pool is ready
  // before the scheduler's first tick fires.
  await prisma.$connect();

  app.listen(PORT, () => {
    startScheduler();
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Fatal startup error:", err);
  process.exit(1);
>>>>>>> 8d95dec (Initial project code)
});
import "dotenv/config";
import { prisma } from "../../src/config/prisma.js";
import { claimNextJob, registerJobHandler } from "../../src/services/jobs/jobRunner.js";

async function runChildWorker() {
  const workerId = `child-worker-${process.pid}`;

  registerJobHandler("SEPARATE_PROCESS_CRASH_TEST", async () => {
    // Simulating long in-flight task that will be interrupted by process kill
    await new Promise((resolve) => setTimeout(resolve, 60000));
    return { ok: true };
  });

  // Claim job with short lease of 1500ms
  const job = await claimNextJob(workerId, 1500, { type: "SEPARATE_PROCESS_CRASH_TEST" });
  if (job) {
    // Send notification to parent via stdout
    console.log(`CHILD_WORKER_CLAIMED:${job.id}:${job.fencingToken}:${workerId}`);
    // Stay alive until SIGKILL
    await new Promise((resolve) => setTimeout(resolve, 60000));
  } else {
    console.log("CHILD_WORKER_CLAIM_FAILED");
    process.exit(1);
  }
}

runChildWorker()
  .catch((err) => {
    console.error("Child worker crash:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

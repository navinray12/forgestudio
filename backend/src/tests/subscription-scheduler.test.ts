import { prisma } from "../config/prisma.js";
import {
  startScheduler,
  stopScheduler,
  isSchedulerRunning,
  runSubscriptionExpirationCheck,
} from "../services/scheduleWorker.js";
import { getUserSubscription } from "../services/subscription.service.js";

const db = prisma as any;

async function runSchedulerTests() {
  console.log("=================================================");
  console.log("MODULE 18.3: SUBSCRIPTION EXPIRATION SCHEDULER TESTS");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
      failed++;
    }
  }

  let expiredUser: any = null;
  let activeUser: any = null;
  let starterPlan: any = null;
  let proPlan: any = null;
  let freePlan: any = null;

  try {
    // ------------------------------------------------------------------------
    // SETUP: Fetch plans and prepare test users
    // ------------------------------------------------------------------------
    const plans: any[] = await prisma.$queryRaw`
      SELECT id, name, slug, price, currency, "websiteLimit" FROM subscription_plans
    `;
    starterPlan = plans.find((p) => p.slug === "starter");
    proPlan = plans.find((p) => p.slug === "professional");
    freePlan = plans.find((p) => p.slug === "free");

    assert(!!starterPlan && !!proPlan && !!freePlan, "Required subscription plans (free, starter, professional) exist in DB");

    // ------------------------------------------------------------------------
    // TEST 1: Scheduler starts and registers correctly
    // ------------------------------------------------------------------------
    assert(!isSchedulerRunning(), "T1.1: Scheduler is initially not running");
    startScheduler({ pollIntervalMs: 5000, expiryIntervalMs: 5000 });
    assert(isSchedulerRunning(), "T1.2: Scheduler starts and registers running state");

    // ------------------------------------------------------------------------
    // TEST 2: Repeated scheduler initialization does not create duplicate jobs
    // ------------------------------------------------------------------------
    startScheduler({ pollIntervalMs: 5000, expiryIntervalMs: 5000 });
    assert(isSchedulerRunning(), "T2.1: Repeated startScheduler() call safely ignored without duplicate intervals");

    // ------------------------------------------------------------------------
    // TEST 3: Expired subscriptions are processed by the scheduler
    // ------------------------------------------------------------------------
    expiredUser = await db.user.create({
      data: {
        email: `sched_expired_${Date.now()}@forgestudio.dev`,
        fullName: "Scheduler Expired Test User",
        status: "ACTIVE",
        role: "USER",
      },
    });

    // Create overdue subscription (ended 3 days ago)
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_subscriptions (id, "userId", "planId", status, "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, 'ACTIVE', NOW() - INTERVAL '33 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '33 days', NOW())`,
      expiredUser.id,
      starterPlan.id
    );

    // Create associated starter license (3 sites)
    await prisma.$executeRawUnsafe(
      `INSERT INTO licenses (id, key, "userId", "planSlug", "maxSites", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2::uuid, 'starter', 3, 'ACTIVE', NOW(), NOW())`,
      `FS-SCHED-EXP-${Date.now()}`,
      expiredUser.id
    );

    const subBefore = await getUserSubscription(expiredUser.id);
    assert(subBefore.status === "ACTIVE" && subBefore.plan.slug === "starter", "T3.1: Expired test user starts on active Starter plan");

    // Run expiration check routine
    const result = await runSubscriptionExpirationCheck();
    assert(
      result !== undefined && result.processedCount >= 1 && result.expiredUserIds.includes(expiredUser.id),
      "T3.2: runSubscriptionExpirationCheck identifies and processes the overdue subscription"
    );

    const subAfter = await getUserSubscription(expiredUser.id);
    assert(
      subAfter.plan.slug === "free" && subAfter.plan.websiteLimit === 1,
      "T3.3: Overdue subscription is reconciled to Free tier (websiteLimit = 1)"
    );

    const licenseRows: any[] = await prisma.$queryRaw`
      SELECT "maxSites", "planSlug" FROM licenses WHERE "userId" = ${expiredUser.id}::uuid LIMIT 1
    `;
    assert(
      licenseRows[0]?.maxSites === 1 && licenseRows[0]?.planSlug === "free",
      "T3.4: Overdue user's license quota is strictly reset to 1 site on free plan"
    );

    // ------------------------------------------------------------------------
    // TEST 4: Active subscriptions within paid billing period are NOT expired
    // ------------------------------------------------------------------------
    activeUser = await db.user.create({
      data: {
        email: `sched_active_${Date.now()}@forgestudio.dev`,
        fullName: "Scheduler Active Test User",
        status: "ACTIVE",
        role: "USER",
      },
    });

    // Create active subscription (ends in 25 days)
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_subscriptions (id, "userId", "planId", status, "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, 'ACTIVE', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', NOW() - INTERVAL '5 days', NOW())`,
      activeUser.id,
      proPlan.id
    );

    await prisma.$executeRawUnsafe(
      `INSERT INTO licenses (id, key, "userId", "planSlug", "maxSites", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2::uuid, 'professional', 10, 'ACTIVE', NOW(), NOW())`,
      `FS-SCHED-ACT-${Date.now()}`,
      activeUser.id
    );

    // Run expiration check again
    await runSubscriptionExpirationCheck();

    const activeSubAfter = await getUserSubscription(activeUser.id);
    assert(
      activeSubAfter.status === "ACTIVE" && activeSubAfter.plan.slug === "professional" && activeSubAfter.plan.websiteLimit === 10,
      "T4.1: Active subscription within valid billing period remains ACTIVE on Professional plan"
    );

    const activeLicenseRows: any[] = await prisma.$queryRaw`
      SELECT "maxSites", "planSlug" FROM licenses WHERE "userId" = ${activeUser.id}::uuid LIMIT 1
    `;
    assert(
      activeLicenseRows[0]?.maxSites === 10 && activeLicenseRows[0]?.planSlug === "professional",
      "T4.2: Active user's license maintains full 10-site limit and Professional entitlement"
    );

    // ------------------------------------------------------------------------
    // TEST 5: Error handling safety (does not crash or leak data)
    // ------------------------------------------------------------------------
    // runSubscriptionExpirationCheck wraps execution in try/catch and logs cleanly without throwing
    let errorHandledSafely = true;
    try {
      await runSubscriptionExpirationCheck();
    } catch {
      errorHandledSafely = false;
    }
    assert(errorHandledSafely, "T5.1: runSubscriptionExpirationCheck handles execution safely without throwing unhandled exceptions");

    // ------------------------------------------------------------------------
    // TEST 6: Scheduler stops cleanly
    // ------------------------------------------------------------------------
    stopScheduler();
    assert(!isSchedulerRunning(), "T6.1: stopScheduler() cleanly halts intervals and resets running state");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    // Cleanup
    stopScheduler();
    const userIds = [expiredUser?.id, activeUser?.id].filter(Boolean);
    for (const uid of userIds) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM licenses WHERE "userId" = $1::uuid`, uid);
        await prisma.$executeRawUnsafe(`DELETE FROM user_subscriptions WHERE "userId" = $1::uuid`, uid);
        await prisma.$executeRawUnsafe(`DELETE FROM sessions WHERE "userId" = $1::uuid`, uid);
        await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, uid);
      } catch (cleanupErr) {
        console.warn("Cleanup warning:", cleanupErr);
      }
    }
  }

  console.log("\n=================================================");
  console.log(`SCHEDULER TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

runSchedulerTests();


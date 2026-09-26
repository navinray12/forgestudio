import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface DbTestResult {
  testName: string;
  database: "postgresql" | "mysql";
  passed: boolean;
  details: string;
}

export async function runDatabaseTestSuite(): Promise<{ results: DbTestResult[]; passed: number; failed: number }> {
  console.log("=================================================");
  console.log("RUNNING LEVEL 4 — DATABASE PERSISTENCE TEST SUITE");
  console.log("=================================================\n");

  const results: DbTestResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  try {
    // 1. Test PostgreSQL Prisma Connection
    const usersCount = await prisma.user.count();
    console.log(`[PASS] [DB] PostgreSQL User Table Connection OK (User Count: ${usersCount})`);
    passedCount++;
    results.push({
      testName: "PostgreSQL Prisma Connection & User Count",
      database: "postgresql",
      passed: true,
      details: `User count: ${usersCount}`,
    });

    // 2. Test PostgreSQL wordpress_connections table persistence
    const connections: any[] = await prisma.$queryRaw`
      SELECT id, "websiteId", "siteUrl", status FROM wordpress_connections LIMIT 5
    `;
    console.log(`[PASS] [DB] PostgreSQL wordpress_connections Schema Verification OK (Rows: ${connections.length})`);
    passedCount++;
    results.push({
      testName: "PostgreSQL wordpress_connections Query",
      database: "postgresql",
      passed: true,
      details: `Connections retrieved: ${connections.length}`,
    });

    // 3. Test Test Record Lifecycle (Insert -> Verify -> Cleanup)
    const testId = `AUTOMATED_TEST_${Date.now()}`;
    const testEmail = `${testId.toLowerCase()}@test.local`;

    const createdUser = await prisma.user.create({
      data: {
        email: testEmail,
        fullName: `Test User ${testId}`,
        passwordHash: "test_hash_value",
      },
    });

    const verifyCreated = await prisma.user.findUnique({ where: { id: createdUser.id } });
    const isInsertVerified = Boolean(verifyCreated && verifyCreated.email === testEmail);

    if (isInsertVerified) {
      console.log(`[PASS] [DB] PostgreSQL Insert-Read Persistence Verified (ID: ${createdUser.id})`);
      passedCount++;
      results.push({
        testName: "PostgreSQL Record Creation & Persistence",
        database: "postgresql",
        passed: true,
        details: `Created and verified user ID ${createdUser.id}`,
      });
    } else {
      console.error(`[FAIL] [DB] PostgreSQL Record Creation Failed`);
      failedCount++;
      results.push({
        testName: "PostgreSQL Record Creation & Persistence",
        database: "postgresql",
        passed: false,
        details: "Created record was not retrievable",
      });
    }

    // Teardown test record
    await prisma.user.delete({ where: { id: createdUser.id } });
    console.log(`[PASS] [DB] PostgreSQL Test Cleanup Completed Safely`);
    passedCount++;
    results.push({
      testName: "PostgreSQL Test Cleanup",
      database: "postgresql",
      passed: true,
      details: "Deleted temporary test record",
    });

  } catch (err: any) {
    console.error(`[FAIL] [DB] Database Test Suite Encountered Error: ${err.message}`);
    failedCount++;
    results.push({
      testName: "Database Execution Exception",
      database: "postgresql",
      passed: false,
      details: err.message,
    });
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\nDatabase Suite Finished: ${passedCount} PASSED, ${failedCount} FAILED\n`);
  return { results, passed: passedCount, failed: failedCount };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDatabaseTestSuite().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}

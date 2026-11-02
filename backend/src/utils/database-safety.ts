/**
 * Database Safety & Isolation Verification Utility
 * Protects production, staging, and developer databases from destructive test operations.
 */

export interface DatabaseValidationResult {
  safe: boolean;
  sanitizedUrl: string;
  databaseName: string;
  host: string;
  error?: string;
}

/**
 * Strips password and sensitive auth credentials from a database URL.
 */
export function sanitizeDatabaseUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "<undefined>";
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    return rawUrl.replace(/:[^:@]+@/, ":***@");
  }
}

/**
 * Validates whether a database connection URL is strictly safe for disposable test execution.
 * Rules:
 * 1. Must be a valid URL with hostname and database name.
 * 2. Host must be strictly local (localhost, 127.0.0.1, ::1). Remote/cloud hosts are rejected unconditionally.
 * 3. NODE_ENV must NOT be production.
 * 4. Database name MUST explicitly contain a test designation ('test', 'e2e', 'disposable', or 'temp').
 *    Ordinary development databases (e.g. elementor_saas, forgestudio, postgres) are REJECTED,
 *    even if ALLOW_DISPOSABLE_TEST_DB=true is passed.
 */
export function validateDisposableDatabaseUrl(rawUrl: string): DatabaseValidationResult {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return {
      safe: false,
      sanitizedUrl: "<empty>",
      databaseName: "",
      host: "",
      error: "Database URL is empty or undefined.",
    };
  }

  const sanitized = sanitizeDatabaseUrl(rawUrl);

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (err: any) {
    return {
      safe: false,
      sanitizedUrl: sanitized,
      databaseName: "",
      host: "",
      error: `Invalid database connection URL format: ${err.message}`,
    };
  }

  const host = parsed.hostname.toLowerCase();
  const dbName = parsed.pathname.replace(/^\//, "").toLowerCase();

  // 1. Host safety check: Reject remote or cloud databases
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!isLocalHost) {
    return {
      safe: false,
      sanitizedUrl: sanitized,
      databaseName: dbName,
      host,
      error: `Remote database host "${host}" rejected. Disposable tests can only execute against local database instances.`,
    };
  }

  // 2. Environment check: Reject production environment
  if (process.env.NODE_ENV === "production") {
    return {
      safe: false,
      sanitizedUrl: sanitized,
      databaseName: dbName,
      host,
      error: "NODE_ENV is set to 'production'. Test execution against production environment is strictly prohibited.",
    };
  }

  // 3. Database name check: Must contain test/e2e/disposable/temp
  if (!dbName) {
    return {
      safe: false,
      sanitizedUrl: sanitized,
      databaseName: "",
      host,
      error: "Database name is missing from connection URL path.",
    };
  }

  const hasTestDesignation = /(?:test|e2e|disposable|temp)/i.test(dbName);
  if (!hasTestDesignation) {
    return {
      safe: false,
      sanitizedUrl: sanitized,
      databaseName: dbName,
      host,
      error: `Ordinary development database "${dbName}" rejected. Database name must explicitly contain 'test', 'e2e', 'disposable', or 'temp' (e.g. elementor_saas_test, forgestudio_disposable_fresh). ALLOW_DISPOSABLE_TEST_DB cannot override this requirement.`,
    };
  }

  return {
    safe: true,
    sanitizedUrl: sanitized,
    databaseName: dbName,
    host,
  };
}

/**
 * Throws a fatal Error if the database URL is not a verified safe disposable test database.
 */
export function assertSafeDisposableDatabase(rawUrl: string): void {
  const result = validateDisposableDatabaseUrl(rawUrl);
  if (!result.safe) {
    throw new Error(`FATAL: Database Safety Violation — ${result.error} (target: ${result.sanitizedUrl})`);
  }
}

/**
 * Verifies that the exact database connection used by Prisma matches the intended test database target.
 */
export function assertDatabaseIsolation(expectedTargetUrl: string, actualPrismaUrl: string): void {
  assertSafeDisposableDatabase(expectedTargetUrl);
  assertSafeDisposableDatabase(actualPrismaUrl);

  const parsedExpected = new URL(expectedTargetUrl);
  const parsedActual = new URL(actualPrismaUrl);

  const expHost = parsedExpected.hostname.toLowerCase();
  const actHost = parsedActual.hostname.toLowerCase();
  const expDb = parsedExpected.pathname.replace(/^\//, "").toLowerCase();
  const actDb = parsedActual.pathname.replace(/^\//, "").toLowerCase();

  const expPort = parsedExpected.port || "5432";
  const actPort = parsedActual.port || "5432";
  const expSchema = (parsedExpected.searchParams.get("schema") || "public").toLowerCase();
  const actSchema = (parsedActual.searchParams.get("schema") || "public").toLowerCase();

  if (expHost !== actHost || expDb !== actDb || expPort !== actPort || expSchema !== actSchema) {
    throw new Error(
      `FATAL: Database Target Mismatch! Expected test database is "${expDb}" on "${expHost}:${expPort}" (schema: "${expSchema}"), but active Prisma client is connected to "${actDb}" on "${actHost}:${actPort}" (schema: "${actSchema}"). Isolation cannot be proven.`
    );
  }
}

/**
 * Queries active PostgreSQL connection identity (database, schema, port)
 * and asserts that it matches the validated safe disposable database target.
 */
export async function verifyConnectedDatabaseIdentity(
  prismaClient: any,
  expectedTargetUrl: string
): Promise<{ host: string; port: number; database: string; schema: string }> {
  assertSafeDisposableDatabase(expectedTargetUrl);
  const parsedExpected = new URL(expectedTargetUrl);
  const expDb = parsedExpected.pathname.replace(/^\//, "").toLowerCase();
  const expPort = parseInt(parsedExpected.port || "5432", 10);
  const expSchema = (parsedExpected.searchParams.get("schema") || "public").toLowerCase();

  const rows: any = await prismaClient.$queryRaw`
    SELECT current_database() as db, current_schema() as sch, inet_server_port() as port
  `;

  const info = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (!info) {
    throw new Error("FATAL: Could not verify connected database identity.");
  }

  const actDb = String(info.db || "").toLowerCase();
  const actSchema = String(info.sch || "").toLowerCase();
  const actPort = info.port ? Number(info.port) : expPort;

  if (actDb !== expDb) {
    throw new Error(
      `FATAL: Connected database identity mismatch! Connected to database "${actDb}", expected disposable database "${expDb}".`
    );
  }

  if (actSchema !== expSchema) {
    throw new Error(
      `FATAL: Connected database schema mismatch! Connected to schema "${actSchema}", expected "${expSchema}".`
    );
  }

  return {
    host: parsedExpected.hostname,
    port: actPort,
    database: actDb,
    schema: actSchema,
  };
}

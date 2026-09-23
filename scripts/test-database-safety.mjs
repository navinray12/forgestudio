export function assertDisposableDatabase(urlStr, env = process.env) {
  if (env.NODE_ENV === "production") {
    throw new Error("Cannot run test database assertions in production");
  }
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname;
    const dbName = parsed.pathname.replace(/^\//, "");
    const user = parsed.username;

    const isLocal = host === "127.0.0.1" || host === "localhost";
    const isTestDb = dbName.includes("_test") || dbName.includes("_ci");
    const isTestUser = user.includes("_test");
    const hasRemoteParam = parsed.searchParams.has("host");

    if (isLocal && isTestDb && isTestUser && !hasRemoteParam) {
      return true;
    }
    throw new Error("Database URL is not a valid disposable test database");
  } catch {
    throw new Error("Invalid disposable test database URL");
  }
}

/**
 * @file Test database safety test: regression or diagnostic checks for the behavior named by this file.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { describe, expect, it } from "vitest";
// @ts-expect-error The runner is native JavaScript so it works before npm install.
import { assertDisposableDatabase } from "../../../scripts/test-database-safety.mjs";

const safe = { NODE_ENV: "test", FORGESTUDIO_DISPOSABLE_DATABASE: "1" };
describe("disposable test database boundaries", () => {
  it("accepts only explicitly marked local fixtures", () => {
    expect(
      assertDisposableDatabase(
        "postgresql://forgestudio_test:fixture@127.0.0.1:5432/forgestudio_test_ci",
        safe,
      ),
    ).toBeTruthy();
  });
  it.each([
    "postgresql://forgestudio_test:fixture@db.example.com/forgestudio_test_ci",
    "postgresql://forgestudio_test:fixture@localhost/production",
    "postgresql://postgres:fixture@localhost/forgestudio_test_ci",
    "postgresql://forgestudio_test:fixture@localhost/forgestudio_test_ci?host=remote",
    "file:./test.db",
    "not a url",
  ])("refuses unsafe target %s", (url) =>
    expect(() => assertDisposableDatabase(url, safe)).toThrow(),
  );
  it("refuses production even with a test-looking database", () => {
    expect(() =>
      assertDisposableDatabase(
        "postgresql://forgestudio_test:fixture@localhost/forgestudio_test_ci",
        { ...safe, NODE_ENV: "production" },
      ),
    ).toThrow();
  });
});

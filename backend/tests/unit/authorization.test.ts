/**
 * @file Authorization test: regression or diagnostic checks for the behavior named by this file.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const lookup = vi.hoisted(() => vi.fn());
const website = vi.hoisted(() => vi.fn());
vi.mock("../../src/platform/database/prisma.js", () => ({
  prisma: { granularPermission: { findUnique: lookup } },
}));
vi.mock("../../src/modules/websites/website.service.js", () => ({
  getWebsiteById: website,
}));
import {
  canUserAccessResource,
  authorizeCapability,
} from "../../src/modules/permissions/permission.service.js";

beforeEach(() => {
  lookup.mockReset();
  website.mockReset();
  website.mockResolvedValue({ userPermission: "DESIGNER" });
});
describe("permission evaluation", () => {
  it("honors a stored deny over role defaults", async () => {
    lookup.mockResolvedValue({ effect: "DENY" });
    expect(await canUserAccessResource("u", "w", "*", "PUBLISH")).toBe(false);
  });
  it("does not turn a failed policy lookup into an allow", async () => {
    lookup.mockRejectedValue(new Error("policy database unavailable"));
    await expect(
      canUserAccessResource("u", "w", "*", "PUBLISH"),
    ).rejects.toMatchObject({
      code: "AUTHORIZATION_UNAVAILABLE",
      statusCode: 503,
    });
  });
  it("uses role defaults only after confirming overrides are absent", async () => {
    lookup.mockResolvedValue(null);
    expect(await canUserAccessResource("u", "w", "*", "EDIT")).toBe(true);
  });
  it("requires an explicit publication grant for a designer", async () => {
    lookup.mockResolvedValue(null);
    expect(await canUserAccessResource("u", "w", "*", "PUBLISH")).toBe(false);
    lookup.mockResolvedValue({ effect: "ALLOW" });
    expect(await canUserAccessResource("u", "w", "*", "PUBLISH")).toBe(true);
  });
  it("checks the specific override before the wildcard", async () => {
    lookup.mockResolvedValueOnce({ effect: "DENY" });
    expect(await canUserAccessResource("u", "w", "element", "EDIT")).toBe(
      false,
    );
    expect(lookup).toHaveBeenCalledTimes(1);
  });
  it("rejects missing HTTP resource context", async () => {
    const next = vi.fn();
    await authorizeCapability("EDIT")(
      { params: {} } as never,
      { locals: { user: { id: "u" } } } as never,
      next,
    );
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: "MISSING_AUTHORIZATION_CONTEXT" }),
    );
    expect(website).not.toHaveBeenCalled();
  });
});

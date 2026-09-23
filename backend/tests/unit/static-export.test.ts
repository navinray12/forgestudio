/**
 * @file Static export test: regression or diagnostic checks for the behavior named by this file.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { StaticExportPublisher } from "../../src/modules/publishing/destinations/static-export.publisher.js";
let directory: string;
let publisher: StaticExportPublisher;
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "forgestudio-export-test-"));
  publisher = new StaticExportPublisher(directory);
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});
const snapshot = {
  version: 1,
  elements: [{ id: "title", type: "heading", content: "Saved release" }],
};

it("persists real files, verifies checksums, and returns those exact files", async () => {
  await publisher.publish("site", "release", snapshot);
  expect(
    (await publisher.verify("site", "release", { version: 1 })).verified,
  ).toBe(true);
  const bundle = await publisher.readExport("site", "release", 1);
  const index = bundle.files.find((file) => file.path === "index.html")!;
  expect(Buffer.from(index.content, "base64").toString()).toContain(
    "Saved release",
  );
  await writeFile(
    path.join(directory, "site", "release", "index.html"),
    "tampered",
  );
  expect((await publisher.verify("site", "release")).verified).toBe(false);
});
it("does not verify missing exports or overwrite an existing release", async () => {
  expect((await publisher.verify("site", "missing")).verified).toBe(false);
  await publisher.publish("site", "release", snapshot);
  await expect(
    publisher.publish("site", "release", { ...snapshot, elements: [] }),
  ).rejects.toThrow();
  expect(
    await readFile(
      path.join(directory, "site", "release", "index.html"),
      "utf8",
    ),
  ).toContain("Saved release");
});
it("rejects traversal and duplicate output paths before writing", async () => {
  await expect(
    publisher.publish("site", "release", {
      version: 1,
      pages: [
        { id: "home", isHome: true },
        { id: "other", slug: "../../outside" },
      ],
    }),
  ).rejects.toMatchObject({ code: "INVALID_EXPORT_PATH" });
  await expect(
    publisher.publish("site", "release", {
      version: 1,
      pages: [
        { id: "home", isHome: true },
        { id: "other", slug: "index" },
      ],
    }),
  ).rejects.toMatchObject({ code: "DUPLICATE_EXPORT_PATH" });
});
it("propagates storage failures instead of pretending to export in memory", async () => {
  const blocker = path.join(directory, "not-a-directory");
  await writeFile(blocker, "file");
  await expect(
    new StaticExportPublisher(blocker).publish("site", "release", snapshot),
  ).rejects.toThrow();
});

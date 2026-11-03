import test from "node:test";
import assert from "node:assert/strict";
import { resolveDashboardWorkspace, showPersonalWorkspace } from "../src/pages/dashboard/workspace-selection.ts";

test("legacy selection resolves to the real owner workspace", () => {
  const items = [{ id: "primary", name: "Ashwani's Workspace", aliases: ["legacy", "primary"] }];
  assert.equal(resolveDashboardWorkspace(items, 0, "legacy"), "primary");
  assert.equal(resolveDashboardWorkspace(items, 0, "personal"), "primary");
  assert.equal(resolveDashboardWorkspace(items, 0, null), "primary");
  assert.equal(showPersonalWorkspace(items, 0), false);
});

test("unassigned sites retain the virtual scope for accounts that need it", () => {
  const items = [{ id: "team", name: "Team", aliases: ["team"] }];
  assert.equal(showPersonalWorkspace(items, 2), true);
  assert.equal(resolveDashboardWorkspace(items, 2, "personal"), "personal");
  assert.equal(resolveDashboardWorkspace([], 0, null), "personal");
});

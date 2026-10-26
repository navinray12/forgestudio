import test from "node:test";
import assert from "node:assert/strict";
import { findPublishedFormNode } from "../utils/published-form.js";

test("published form lookup finds forms nested in pages and containers", () => {
  const snapshot = {
    pages: [{
      id: "home",
      elements: [{
        id: "container-1",
        type: "container",
        children: [{
          id: "contact-form",
          type: "atomic-form",
          actions: { activeActions: ["database"] },
        }],
      }],
    }],
  };

  const form = findPublishedFormNode(snapshot, "contact-form");
  assert.equal(form?.id, "contact-form");
  assert.deepEqual(form?.actions.activeActions, ["database"]);
});

test("published form lookup rejects non-form nodes with a matching id", () => {
  const snapshot = {
    pages: [{ id: "home", elements: [{ id: "contact-form", type: "button" }] }],
  };

  assert.equal(findPublishedFormNode(snapshot, "contact-form"), null);
  assert.equal(findPublishedFormNode(snapshot, "missing"), null);
});

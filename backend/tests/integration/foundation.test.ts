/**
 * @file Foundation test: regression or diagnostic checks for the behavior named by this file.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/platform/database/prisma.js";
import { processWordPressWebhook } from "../../src/modules/wordpress-connections/webhook.service.js";
import { processNextWebhookReceipt } from "../../src/modules/wordpress-connections/process-webhook-receipts.js";
import {
  recordDeploymentFailure,
  transitionDeployment,
} from "../../src/modules/publishing/deployment-state.repository.js";
import {
  activatePublishedSnapshot,
  saveDraftPreservingPublishedSnapshot,
} from "../../src/modules/publishing/published-snapshot.repository.js";
import { canUserAccessResource } from "../../src/modules/permissions/permission.service.js";
import { getOrCreatePersonalWorkspace } from "../../src/modules/workspaces/workspace-membership.service.js";
import {
  connectWordPress,
  getWordPressStatus,
  verifyWordPressConnection,
  publishToWordPress,
} from "../../src/modules/wordpress-connections/connector.service.js";
import {
  publishWebsite,
  rollbackDeployment,
} from "../../src/modules/publishing/publishing.service.js";
import {
  updateWebsiteEditorData,
  updateWebsite,
} from "../../src/modules/websites/website.service.js";
import { destinationRegistry } from "../../src/modules/publishing/destinations/registry.js";
import { checkDatabaseReadiness } from "../../src/platform/database/database-readiness.js";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const key = crypto.randomBytes(32).toString("hex");
let ownerId: string, memberId: string, websiteId: string, connectionId: string;
beforeAll(async () => {
  const owner = await prisma.user.create({
    data: { email: `${crypto.randomUUID()}@example.invalid` },
  });
  const member = await prisma.user.create({
    data: { email: `${crypto.randomUUID()}@example.invalid` },
  });
  ownerId = owner.id;
  memberId = member.id;
  const ownerWorkspace = await getOrCreatePersonalWorkspace(ownerId);
  const site = await prisma.website.create({
    data: {
      userId: ownerId,
      name: "Fixture",
      slug: `fixture-${crypto.randomUUID()}`,
      workspaceId: ownerWorkspace.id,
    },
  });
  websiteId = site.id;
  await prisma.websiteCollaborator.create({
    data: { websiteId, userId: memberId, permission: "DESIGNER" },
  });
  const connection = await prisma.wordPressConnection.create({
    data: {
      websiteId,
      userId: ownerId,
      siteUrl: "https://fixture.invalid",
      status: "CONNECTED",
      apiKeyHash: "not-the-signing-secret",
    },
  });
  connectionId = connection.id;
  process.env.WORDPRESS_WEBHOOK_SECRETS = JSON.stringify({
    [connectionId]: key,
  });
});
afterAll(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: [ownerId, memberId].filter(Boolean) } },
  });
  await prisma.$disconnect();
});

/**
 * Event.
 * @param eventId Event Id supplied to this operation. Defaults to crypto.randomUUID().
 */
function event(eventId = crypto.randomUUID()) {
  const body = JSON.stringify(
    {
      eventId,
      event: "form_submitted",
      timestamp: Math.floor(Date.now() / 1000),
      data: { formId: "contact", formData: { message: "hello" } },
    },
    null,
    2,
  );
  return {
    body,
    signature: crypto.createHmac("sha256", key).update(body).digest("hex"),
  };
}

describe("durable webhook receipts", () => {
  it("deduplicates concurrent deliveries and processes one business effect", async () => {
    const { body, signature } = event();
    const receipts = await Promise.all(
      Array.from({ length: 4 }, () =>
        processWordPressWebhook(websiteId, signature, body),
      ),
    );
    expect(new Set(receipts.map((receipt) => receipt.receiptId)).size).toBe(1);
    expect(await prisma.formSubmission.count({ where: { websiteId } })).toBe(0);
    await Promise.all([
      processNextWebhookReceipt(),
      processNextWebhookReceipt(),
    ]);
    expect(await prisma.formSubmission.count({ where: { websiteId } })).toBe(1);
    expect(
      await prisma.wordPressWebhookReceipt.findUnique({
        where: { id: receipts[0].receiptId },
      }),
    ).toMatchObject({ status: "PROCESSED" });
  });
  it("rejects reusing an event ID with different signed content", async () => {
    const { body, signature } = event();
    await processWordPressWebhook(websiteId, signature, body);
    const changed = body.replace("hello", "different");
    await expect(
      processWordPressWebhook(
        websiteId,
        crypto.createHmac("sha256", key).update(changed).digest("hex"),
        changed,
      ),
    ).rejects.toMatchObject({ code: "WEBHOOK_EVENT_CONFLICT" });
    await processNextWebhookReceipt();
  });
  it("does not acknowledge a failed receipt insert", async () => {
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION reject_test_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected receipt failure'; END $$`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER reject_test_receipt BEFORE INSERT ON wordpress_webhook_receipts FOR EACH ROW EXECUTE FUNCTION reject_test_receipt()`,
    );
    try {
      const { body, signature } = event();
      await expect(
        processWordPressWebhook(websiteId, signature, body),
      ).rejects.toThrow();
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER reject_test_receipt ON wordpress_webhook_receipts`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION reject_test_receipt()`);
    }
  });
  it("rolls back failed form effects and retries the durable receipt", async () => {
    const { body, signature } = event();
    const receipt = await processWordPressWebhook(websiteId, signature, body);
    const count = await prisma.formSubmission.count({ where: { websiteId } });
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION reject_test_form() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected form failure'; END $$`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER reject_test_form BEFORE INSERT ON form_submissions FOR EACH ROW EXECUTE FUNCTION reject_test_form()`,
    );
    try {
      await expect(processNextWebhookReceipt()).rejects.toThrow();
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER reject_test_form ON form_submissions`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION reject_test_form()`);
    }
    expect(await prisma.formSubmission.count({ where: { websiteId } })).toBe(
      count,
    );
    expect(
      await prisma.wordPressWebhookReceipt.findUnique({
        where: { id: receipt.receiptId },
      }),
    ).toMatchObject({ status: "PENDING", attempts: 1 });
    await prisma.wordPressWebhookReceipt.update({
      where: { id: receipt.receiptId },
      data: { nextAttemptAt: new Date(0) },
    });
    await processNextWebhookReceipt();
    expect(await prisma.formSubmission.count({ where: { websiteId } })).toBe(
      count + 1,
    );
  });
});

describe("guarded publishing and authorization", () => {
  it("keeps design editing separate from explicit, revocable publication grants", async () => {
    const ws = await getOrCreatePersonalWorkspace(ownerId);
    const site = await prisma.website.create({ data: { userId: ownerId, name: "Publication policy", slug: crypto.randomUUID(), workspaceId: ws.id } });
    await prisma.websiteCollaborator.create({ data: { websiteId: site.id, userId: memberId, permission: "DESIGNER" } });
    expect(await canUserAccessResource(memberId, site.id, "*", "EDIT")).toBe(true);
    expect(await canUserAccessResource(memberId, site.id, "*", "PUBLISH")).toBe(false);
    const grant = await prisma.granularPermission.create({ data: { websiteId: site.id, userId: memberId, resourceId: "*", capability: "PUBLISH", effect: "ALLOW" } });
    expect(await canUserAccessResource(memberId, site.id, "*", "PUBLISH")).toBe(true);
    await prisma.granularPermission.update({ where: { id: grant.id }, data: { effect: "DENY" } });
    expect(await canUserAccessResource(memberId, site.id, "*", "PUBLISH")).toBe(false);
  });
  it("preserves published data when upgrading a legacy JSON-string document", async () => {
    const ws = await getOrCreatePersonalWorkspace(ownerId);
    const site = await prisma.website.create({ data: {
      userId: ownerId, name: "Legacy", slug: crypto.randomUUID(), workspaceId: ws.id,
      editorData: JSON.stringify({ elements: [{ id: "legacy" }], publishedData: { version: 1 }, publishing: { status: "PUBLISHED" } }),
    } });
    await activatePublishedSnapshot(site.id, { version: 2 }, { status: "PUBLISHED" }, "1");
    const saved = await saveDraftPreservingPublishedSnapshot(site.id, { elements: [{ id: "edited" }] });
    expect(saved.editorData).toMatchObject({ elements: [{ id: "edited" }], publishedData: { version: 2 } });
  });
  it("cannot bypass stored denies when the policy table is unavailable", async () => {
    await prisma.granularPermission.create({
      data: {
        websiteId,
        userId: memberId,
        resourceId: "*",
        capability: "PUBLISH",
        effect: "DENY",
      },
    });
    expect(
      await canUserAccessResource(memberId, websiteId, "*", "PUBLISH"),
    ).toBe(false);
    await prisma.$executeRawUnsafe(
      `ALTER TABLE granular_permissions RENAME TO test_hidden_permissions`,
    );
    try {
      await expect(
        canUserAccessResource(memberId, websiteId, "*", "PUBLISH"),
      ).rejects.toMatchObject({ code: "AUTHORIZATION_UNAVAILABLE" });
    } finally {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE test_hidden_permissions RENAME TO granular_permissions`,
      );
    }
  });
  it.each(["PUBLISHED", "VERIFICATION_FAILED", "RECONCILIATION_REQUIRED"])(
    "retains %s and its original error after a generic failure",
    async (status) => {
      const deployment = await prisma.deployment.create({
        data: { websiteId, version: 100, status, error: { code: "ORIGINAL" } },
      });
      await recordDeploymentFailure(deployment.id, {
        code: "LATER",
        message: "generic catch",
      });
      expect(
        await prisma.deployment.findUnique({ where: { id: deployment.id } }),
      ).toMatchObject({ status, error: { code: "ORIGINAL" } });
    },
  );
  it("allows only one concurrent transition and records uncertain activation", async () => {
    const deployment = await prisma.deployment.create({
      data: { websiteId, version: 101, status: "QUEUED" },
    });
    const result = await Promise.allSettled([
      transitionDeployment(deployment.id, "BUILDING"),
      transitionDeployment(deployment.id, "BUILDING"),
    ]);
    expect(result.filter((item) => item.status === "fulfilled")).toHaveLength(
      1,
    );
    await transitionDeployment(deployment.id, "PROCESSING");
    await transitionDeployment(deployment.id, "DEPLOYING");
    await recordDeploymentFailure(deployment.id, {
      code: "TIMEOUT",
      message: "result unknown",
    });
    expect(
      await prisma.deployment.findUnique({ where: { id: deployment.id } }),
    ).toMatchObject({ status: "RECONCILIATION_REQUIRED" });
  });
  it("preserves draft edits across publication and rejects stale activation", async () => {
    await prisma.website.update({
      where: { id: websiteId },
      data: { editorData: { elements: [{ id: "new-draft" }] } },
    });
    await activatePublishedSnapshot(
      websiteId,
      { version: 1, elements: [{ id: "old-live" }] },
      { status: "PUBLISHED" },
      null,
    );
    await expect(
      activatePublishedSnapshot(websiteId, { version: 2 }, {}, null),
    ).rejects.toMatchObject({ code: "LIVE_RELEASE_CONFLICT" });
    await saveDraftPreservingPublishedSnapshot(websiteId, {
      elements: [{ id: "newer-draft" }],
      publishedData: { version: 999 },
      publishing: { status: "PUBLISHED" },
    });
    const site = await prisma.website.findUniqueOrThrow({
      where: { id: websiteId },
    });
    expect(site.editorData).toMatchObject({
      elements: [{ id: "newer-draft" }],
      publishedData: { version: 1 },
    });
  });
  it("publishes a durable revision and rollback preserves a newer draft", async () => {
    const original = {
      elements: [
        { id: "heading", type: "heading", content: "original release" },
      ],
    };
    const release = await publishWebsite(websiteId, ownerId, {
      editorData: original,
    });
    const revision = await prisma.websiteRevision.findUniqueOrThrow({
      where: { id: release.sourceRevisionId },
    });
    expect(revision.data).toMatchObject(original);
    const next = await publishWebsite(websiteId, ownerId, {
      editorData: {
        elements: [{ id: "heading", type: "heading", content: "next release" }],
      },
    });
    expect(next.version).toBeGreaterThan(release.version);
    await updateWebsiteEditorData(websiteId, ownerId, {
      elements: [
        { id: "heading", type: "heading", content: "unpublished work" },
      ],
    });
    await rollbackDeployment(websiteId, release.deploymentId, ownerId);
    expect(
      (await prisma.website.findUniqueOrThrow({ where: { id: websiteId } }))
        .editorData,
    ).toMatchObject({
      elements: [{ content: "unpublished work" }],
      publishedData: { elements: [{ content: "original release" }] },
    });
  });
  it("the SDK update path cannot replace published content or bypass publishing", async () => {
    const before = await prisma.website.findUniqueOrThrow({
      where: { id: websiteId },
    });
    await updateWebsite(
      websiteId,
      { editorData: { elements: [], publishedData: { version: 9000 } } },
      ownerId,
    );
    expect(
      (await prisma.website.findUniqueOrThrow({ where: { id: websiteId } }))
        .editorData,
    ).toMatchObject({
      publishedData: (before.editorData as any).publishedData,
    });
    await expect(
      updateWebsite(websiteId, { status: "DRAFT" }, ownerId),
    ).rejects.toMatchObject({ code: "PUBLISH_WORKFLOW_REQUIRED" });
  });
  it("fails before live mutation if the candidate revision cannot be persisted", async () => {
    const before = await prisma.website.findUniqueOrThrow({
      where: { id: websiteId },
    });
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION reject_test_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected revision failure'; END $$`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER reject_test_revision BEFORE INSERT ON website_revisions FOR EACH ROW EXECUTE FUNCTION reject_test_revision()`,
    );
    try {
      await expect(
        publishWebsite(websiteId, ownerId, {
          editorData: {
            elements: [
              {
                id: "candidate",
                type: "heading",
                content: "Must never go live",
              },
            ],
          },
        }),
      ).rejects.toMatchObject({ code: "REVISION_CREATE_FAILED" });
      expect(
        (await prisma.website.findUniqueOrThrow({ where: { id: websiteId } }))
          .editorData,
      ).toEqual(before.editorData);
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER reject_test_revision ON website_revisions`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION reject_test_revision()`);
    }
  });
});

it("disabled adapters never claim remote verification or create mappings", async () => {
  for (const target of ["WORDPRESS", "SFTP"])
    expect(() => destinationRegistry.getPublisher(target)).toThrow();
  for (const operation of [
    () =>
      connectWordPress(
        websiteId,
        ownerId,
        "https://unreachable.invalid",
        "invalid-key",
      ),
    () => verifyWordPressConnection(websiteId, ownerId),
    () => publishToWordPress(websiteId, ownerId, "attempt", {}),
    () => publishWebsite(websiteId, ownerId, { destinationType: "SFTP" }),
  ])
    await expect(operation()).rejects.toMatchObject({
      code: "DESTINATION_UNAVAILABLE",
    });
  expect((await getWordPressStatus(websiteId, ownerId)).isConnected).toBe(
    false,
  );
  expect(
    await prisma.wordPressPageMapping.count({ where: { websiteId } }),
  ).toBe(0);
});

it("database readiness works while an application role cannot change schema", async () => {
  await checkDatabaseReadiness();
  await prisma.$executeRawUnsafe(
    `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'forgestudio_runtime_fixture') THEN CREATE ROLE forgestudio_runtime_fixture LOGIN PASSWORD 'fixture-only'; END IF; END $$;`,
  );
  await prisma.$executeRawUnsafe(
    `GRANT USAGE ON SCHEMA public TO forgestudio_runtime_fixture`,
  );
  await prisma.$executeRawUnsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO forgestudio_runtime_fixture`,
  );
  const url = new URL(process.env.DATABASE_URL!);
  url.username = "forgestudio_runtime_fixture";
  url.password = "fixture-only";
  const runtime = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString() }),
  });
  try {
    await runtime.$queryRaw`SELECT id FROM wordpress_webhook_receipts LIMIT 0`;
    await expect(
      runtime.$executeRawUnsafe(
        `ALTER TABLE websites ADD COLUMN forbidden_test_column TEXT`,
      ),
    ).rejects.toThrow();
  } finally {
    await runtime.$disconnect();
  }

  const child = spawn(process.execPath, ["dist/server.js"], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    env: {
      ...process.env,
      DATABASE_URL: url.toString(),
      PORT: "0",
      GOOGLE_CLIENT_ID: "",
      GITHUB_CLIENT_ID: "",
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const port = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Built API did not become ready.")),
        10000,
      );
      let output = "";
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
        const match = output.match(/API listening on port (\d+)/);
        if (match) {
          clearTimeout(timeout);
          resolve(match[1]);
        }
      });
      child.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once("exit", (code) => {
        clearTimeout(timeout);
        reject(new Error(`Built API exited early (${code}).`));
      });
    });
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/ready`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ready: true });
  } finally {
    child.kill();
    if (child.exitCode === null)
      await new Promise<void>((resolve) => child.once("exit", () => resolve()));
  }
});

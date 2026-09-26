import http from "http";
import { WebSocket } from "ws";
import { prisma } from "../config/prisma.js";
import {
  getClientBilling,
  updateClientBilling,
  generateClientInvoice,
} from "../services/billing/clientBilling.service.js";
import {
  getExperiments,
  createExperiment,
  updateExperiment,
  recordImpression,
  recordConversion,
  concludeExperiment,
  deleteExperiment,
} from "../services/experiment.service.js";
import { initPresenceWebSocketServer } from "../services/collaboration/presence.service.js";

const db = prisma as any;

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, details || "");
    failed++;
  }
}

async function runPhase3Tests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO PHASE 3 VERIFICATION SUITE");
  console.log("Commercial & Market Expansion (Moat Builders)");
  console.log("=================================================\n");

  let testUser: any = null;
  let testWebsite: any = null;
  let wsServer: http.Server | null = null;
  const TEST_WS_PORT = 5899;

  try {
    // 0. Setup test user & website
    const email = `phase3_agency_${Date.now()}@example.com`;
    testUser = await db.user.create({
      data: {
        email,
        fullName: "Agency Lead Architect",
        passwordHash: "dummy-hash",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    testWebsite = await db.website.create({
      data: {
        userId: testUser.id,
        name: "Acme Enterprise Corp",
        slug: `acme-corp-${Date.now()}`,
        status: "DRAFT",
        editorData: { version: 1, elements: [] },
      },
    });

    // -------------------------------------------------------------------------
    // GROUP 1: Agency Client Invoicing & Markup Engine (Stripe Connect)
    // -------------------------------------------------------------------------
    console.log("--- Group 1: Agency Client Invoicing & Markup Engine ---");

    // 1.1 Read initial client billing defaults
    const initialBilling = await getClientBilling(testWebsite.id, testUser.id);
    assert(
      initialBilling.config.baseCostMonthly === 15,
      "getClientBilling defaults platform base cost to $15"
    );
    assert(
      initialBilling.config.subscriptionStatus === "UNBILLED",
      "Initial client subscription status is UNBILLED"
    );

    // 1.2 Update billing markup configuration
    const updatedBilling = await updateClientBilling(testWebsite.id, testUser.id, {
      enabled: true,
      clientName: "Acme Invoicing Dept",
      clientEmail: "billing@acme.com",
      currency: "USD",
      clientPriceMonthly: 79, // $79 retail to client
      baseCostMonthly: 15,    // $15 base
      billingInterval: "month",
    });

    assert(
      updatedBilling.config.clientPriceMonthly === 79,
      "updateClientBilling saves retail client price"
    );
    assert(
      updatedBilling.config.marginMonthly === 64, // 79 - 15 = 64
      "updateClientBilling correctly computes monthly margin ($64/mo)"
    );
    assert(
      updatedBilling.metrics.annualProjectedProfit === 768, // 64 * 12
      "updateClientBilling projects annual agency profit ($768/yr)"
    );
    assert(
      updatedBilling.metrics.marginPercentage === 81, // 64 / 79 * 100 = 81%
      "updateClientBilling computes correct margin percentage (81%)"
    );

    // 1.3 Generate client invoice checkout link
    const invoiceResult = await generateClientInvoice(testWebsite.id, testUser.id, {
      sendEmail: false,
    });

    assert(
      invoiceResult.success === true,
      "generateClientInvoice returns success"
    );
    assert(
      invoiceResult.invoiceUrl.includes("pay.forgestudio.io"),
      "generateClientInvoice creates valid checkout link"
    );

    const postInvoiceBilling = await getClientBilling(testWebsite.id, testUser.id);
    assert(
      postInvoiceBilling.config.subscriptionStatus === "PENDING",
      "Invoice generation transitions client status to PENDING"
    );

    // -------------------------------------------------------------------------
    // GROUP 2: A/B Split Testing & Conversion Experiments Engine
    // -------------------------------------------------------------------------
    console.log("\n--- Group 2: A/B Split Testing & Conversion Experiments ---");

    // 2.1 Create experiment
    const experiment = await createExperiment(testWebsite.id, {
      title: "Hero Headline Conversion Test",
      targetType: "SECTION",
      goalAction: "FORM_SUBMIT",
      status: "RUNNING",
      variants: [
        {
          id: "control",
          name: "Original Headline",
          trafficAllocation: 50,
          targetEntityId: "hero-1",
          impressions: 0,
          conversions: 0,
        },
        {
          id: "variant_b",
          name: "Action-Oriented Headline",
          trafficAllocation: 50,
          targetEntityId: "hero-2",
          impressions: 0,
          conversions: 0,
        },
      ],
    });

    assert(
      experiment.id.startsWith("exp_"),
      "createExperiment generates unique exp_ ID prefix"
    );
    assert(
      experiment.variants.length === 2,
      "createExperiment initializes both Control and Challenger variants"
    );

    // 2.2 Record impressions telemetry
    await recordImpression(testWebsite.id, experiment.id, "control");
    await recordImpression(testWebsite.id, experiment.id, "control");
    await recordImpression(testWebsite.id, experiment.id, "variant_b");
    await recordImpression(testWebsite.id, experiment.id, "variant_b");
    await recordImpression(testWebsite.id, experiment.id, "variant_b");
    await recordImpression(testWebsite.id, experiment.id, "variant_b");

    // 2.3 Record conversions telemetry
    await recordConversion(testWebsite.id, experiment.id, "variant_b");
    await recordConversion(testWebsite.id, experiment.id, "variant_b");

    const experimentList = await getExperiments(testWebsite.id);
    const activeExp = experimentList.find((e) => e.id === experiment.id);

    assert(
      activeExp !== undefined,
      "getExperiments retrieves active experiment"
    );
    assert(
      activeExp?.analytics?.totalImpressions === 6,
      "Analytics aggregate total impressions across variants (6 impressions)"
    );
    assert(
      activeExp?.analytics?.totalConversions === 2,
      "Analytics aggregate total conversions (2 conversions)"
    );

    const variantB = activeExp?.variants.find((v) => v.id === "variant_b");
    assert(
      variantB?.conversionRate === 50, // 2 conversions / 4 impressions = 50%
      "Variant B conversion rate accurately computed (50.0%)"
    );

    // 2.4 Conclude experiment and declare winner
    const concluded = await concludeExperiment(testWebsite.id, experiment.id, "variant_b");
    assert(
      concluded.status === "CONCLUDED",
      "concludeExperiment sets status to CONCLUDED"
    );
    assert(
      concluded.winningVariantId === "variant_b",
      "concludeExperiment crowns variant_b as the winning variant"
    );

    // 2.5 Delete experiment
    const deleteRes = await deleteExperiment(testWebsite.id, experiment.id);
    assert(deleteRes.success, "deleteExperiment removes test safely");

    // -------------------------------------------------------------------------
    // GROUP 3: Real-Time Multi-User Presence & WebSocket Collaboration
    // -------------------------------------------------------------------------
    console.log("\n--- Group 3: Real-Time WebSocket Presence Engine ---");

    // Start a lightweight test HTTP server with presence WebSocket attached
    wsServer = http.createServer();
    initPresenceWebSocketServer(wsServer);

    await new Promise<void>((resolve) => {
      wsServer!.listen(TEST_WS_PORT, () => resolve());
    });

    const wsUrl = `ws://127.0.0.1:${TEST_WS_PORT}/ws/presence`;

    let client1Joined = false;
    let client2ReceivedJoin = false;
    let client2ReceivedCursor = false;
    let client2ReceivedSelection = false;

    // Connect Client 1 (Alice)
    const client1 = new WebSocket(wsUrl);

    await new Promise<void>((resolve) => {
      client1.on("open", () => {
        client1.send(
          JSON.stringify({
            type: "JOIN",
            websiteId: testWebsite.id,
            user: { id: "user_alice", name: "Alice Designer", color: "#8b5cf6" },
          })
        );
      });

      client1.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "SYNC") {
          client1Joined = true;
          resolve();
        }
      });
    });

    assert(client1Joined, "Client 1 connected and received SYNC room state");

    // Connect Client 2 (Bob)
    const client2 = new WebSocket(wsUrl);

    await new Promise<void>((resolve) => {
      let client2Synced = false;
      let client1Notified = false;

      const checkDone = () => {
        if (client2Synced && client1Notified) resolve();
      };

      client1.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "PEER_JOINED" && msg.peer?.user?.name === "Bob Editor") {
          client2ReceivedJoin = true;
          client1Notified = true;
          checkDone();
        }
      });

      client2.on("open", () => {
        client2.send(
          JSON.stringify({
            type: "JOIN",
            websiteId: testWebsite.id,
            user: { id: "user_bob", name: "Bob Editor", color: "#10b981" },
          })
        );
      });

      client2.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "SYNC") {
          client2Synced = true;
          checkDone();
        }
      });
    });

    assert(client2ReceivedJoin, "Client 1 received PEER_JOINED notification when Client 2 entered room");

    // Test cursor broadcasting (Alice moves cursor -> Bob receives)
    await new Promise<void>((resolve) => {
      client2.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "PEER_CURSOR" && msg.cursor?.x === 320 && msg.cursor?.y === 480) {
          client2ReceivedCursor = true;
          resolve();
        }
      });

      client1.send(
        JSON.stringify({
          type: "CURSOR",
          cursor: { x: 320, y: 480 },
        })
      );
    });

    assert(client2ReceivedCursor, "Client 2 received throttled cursor coordinates from Client 1");

    // Test element selection broadcasting (Alice selects hero-section -> Bob receives)
    await new Promise<void>((resolve) => {
      client2.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "PEER_SELECT" && msg.elementId === "hero-section-card") {
          client2ReceivedSelection = true;
          resolve();
        }
      });

      client1.send(
        JSON.stringify({
          type: "SELECT",
          elementId: "hero-section-card",
        })
      );
    });

    assert(client2ReceivedSelection, "Client 2 received live element selection broadcast from Client 1");

    // Clean up WebSockets
    client1.close();
    client2.close();

  } catch (err: any) {
    console.error("Test execution failed:", err);
    failed++;
  } finally {
    if (wsServer) {
      wsServer.close();
    }
    // Cleanup test data
    if (testWebsite?.id) {
      try {
        await db.website.delete({ where: { id: testWebsite.id } });
      } catch {}
    }
    if (testUser?.id) {
      try {
        await db.user.delete({ where: { id: testUser.id } });
      } catch {}
    }
  }

  console.log("\n=================================================");
  console.log(`PHASE 3 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase3Tests().catch((err) => {
  console.error("Test runner crash:", err);
  process.exit(1);
});

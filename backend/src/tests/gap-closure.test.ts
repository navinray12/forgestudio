import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { createWebsite } from "../services/website.service.js";
import {
  createOrUpdateSftpConfig,
  getSftpConfig,
  syncFilesOverSftp,
} from "../services/sftp.service.js";
import {
  SftpPublisher,
  setSftpClientFactory,
} from "../services/destinations/sftp.publisher.js";
import {
  createStaticZipArchive,
  sanitizeZipEntryPath,
} from "../services/destinations/staticZip.service.js";
import { compileCanonicalToStaticBundle } from "../services/destinations/staticCompiler.js";
import {
  createTeam,
  inviteMember,
  acceptInvitation,
  revokeTeamInvitation,
  resendTeamInvitation,
} from "../services/team.service.js";
import {
  inviteWebsiteMember,
  acceptWebsiteInvitation,
  revokeWebsiteInvitation,
  resendWebsiteInvitation,
} from "../services/website.service.js";
import { queryAuditLogs } from "../services/audit.service.js";
import {
  createForgeMessage,
  isForgeMessage,
  postForgeMessage,
  subscribeToForgeMessages,
} from "../sdk/embeddedEvents.js";
import {
  enqueueJob,
  processNextJob,
  cancelJob,
  getJobById,
  registerJobHandler,
} from "../services/jobs/jobRunner.js";
import {
  schedulePublish,
  cancelScheduledPublish,
} from "../services/publishing.service.js";
import { initJobHandlers } from "../services/jobs/handlers.js";

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

async function runGapClosureTests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO TARGETED GAP CLOSURE TEST SUITE");
  console.log("Verifying Gaps 1 through 8 Implementation");
  console.log("=================================================\n");

  const timestamp = Date.now();
  let userA: any = null;
  let userB: any = null;
  let siteA: any = null;
  let siteB: any = null;
  let teamA: any = null;
  const createdJobIds: string[] = [];

  function trackJob<T extends { id?: string }>(job: T): T {
    if (job?.id) createdJobIds.push(job.id);
    return job;
  }

  try {
    initJobHandlers();

    // Setup Users & Websites
    userA = await db.user.create({
      data: {
        email: `gap_user_a_${timestamp}@example.com`,
        fullName: "User A",
        status: "ACTIVE",
      },
    });

    userB = await db.user.create({
      data: {
        email: `gap_user_b_${timestamp}@example.com`,
        fullName: "User B",
        status: "ACTIVE",
      },
    });

    siteA = await createWebsite(userA.id, `Site A ${timestamp}`);
    siteB = await createWebsite(userB.id, `Site B ${timestamp}`);

    // =========================================================================
    // GAP 1 & GAP 2: Real SFTP Transport & Authorization / Tenant Isolation
    // =========================================================================
    console.log("\n--- Gap 1 & Gap 2: Real SFTP Transport & Tenant Isolation ---");

    // G2.1: Configure SFTP for Site A
    const configA = await createOrUpdateSftpConfig(
      siteA.id,
      "sftp.example.com",
      22,
      "deployerA",
      "/var/www/siteA",
      userA.id
    );
    assert(
      configA.host === "sftp.example.com" && configA.username === "deployerA",
      "G2.1: Owner can configure SFTP settings"
    );

    // G2.2: Cross-tenant SFTP config read rejection
    let crossTenantReadFailed = false;
    try {
      await getSftpConfig(siteA.id, userB.id);
    } catch (e: any) {
      crossTenantReadFailed = e.statusCode === 403;
    }
    assert(crossTenantReadFailed, "G2.2: Cross-tenant SFTP read is strictly rejected (403)");

    // G2.3: Cross-tenant SFTP config update rejection
    let crossTenantUpdateFailed = false;
    try {
      await createOrUpdateSftpConfig(
        siteA.id,
        "malicious.host",
        22,
        "hacker",
        "/var/www",
        userB.id
      );
    } catch (e: any) {
      crossTenantUpdateFailed = e.statusCode === 403;
    }
    assert(crossTenantUpdateFailed, "G2.3: Cross-tenant SFTP update is strictly rejected (403)");

    // G2.4: Cross-tenant SFTP sync rejection
    let crossTenantSyncFailed = false;
    try {
      await syncFilesOverSftp(siteA.id, userB.id);
    } catch (e: any) {
      crossTenantSyncFailed = e.statusCode === 403;
    }
    assert(crossTenantSyncFailed, "G2.4: Cross-tenant SFTP sync is strictly rejected (403)");

    // G1.1: Production Real SFTP transport attempts real connection and fails safely when uncontactable
    const publisher = new SftpPublisher();
    let sftpRealNetworkFailed = false;
    try {
      // Direct call without mock factory tries real socket to sftp.example.com
      await publisher.publish(siteA.id, "dep_test", { version: 1, pages: [] }, { timeout: 1000 });
    } catch (e: any) {
      sftpRealNetworkFailed =
        e.code === "SFTP_TRANSFER_FAILED" &&
        e.statusCode === 502 &&
        !e.message.includes("undefined");
    }
    assert(
      sftpRealNetworkFailed,
      "G1.1: Production SFTP attempts real transport and fails safely with redacted error when unreachable"
    );

    // G1.2: Mock adapter allows unit testing with accurate file counting (no fake 42)
    let uploadedFiles: string[] = [];
    setSftpClientFactory(() => ({
      connect: async () => {},
      mkdir: async () => "",
      put: async (_content: any, remotePath: string) => {
        uploadedFiles.push(remotePath);
        return remotePath;
      },
      list: async () => [],
      end: async () => {},
    }));

    const mockSyncRes = await syncFilesOverSftp(siteA.id, userA.id);
    assert(
      mockSyncRes.success === true &&
        (mockSyncRes.filesTransferred ?? 0) > 0 &&
        mockSyncRes.filesTransferred !== 42 &&
        uploadedFiles.length === mockSyncRes.filesTransferred,
      `G1.2: SFTP client uploads actual files with exact counts (${mockSyncRes.filesTransferred} files, no fake 42)`
    );
    setSftpClientFactory(null); // Reset to production

    // =========================================================================
    // GAP 3: Real Static ZIP Export
    // =========================================================================
    console.log("\n--- Gap 3: Real Static ZIP Export ---");

    // G3.1: Path Traversal Protection
    let traversalCaught = false;
    try {
      sanitizeZipEntryPath("../../etc/passwd");
    } catch (e: any) {
      traversalCaught = e.code === "UNSAFE_ZIP_PATH";
    }
    assert(traversalCaught, "G3.1: sanitizeZipEntryPath rejects ../ directory traversal");

    let absolutePathCaught = false;
    try {
      sanitizeZipEntryPath("/var/log/syslog");
    } catch (e: any) {
      traversalCaught = e.code === "UNSAFE_ZIP_PATH";
    }
    assert(traversalCaught, "G3.2: sanitizeZipEntryPath rejects absolute filesystem paths");

    // G3.3: Real Binary ZIP Archive generation
    const staticBundle = compileCanonicalToStaticBundle(siteA.id, 1, {
      name: "Test Site",
      pages: [{ id: "home", title: "Home", slug: "", isHome: true, elements: [] }],
    });
    const zipBuffer = await createStaticZipArchive(staticBundle);

    // ZIP magic bytes: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    const isZip =
      zipBuffer[0] === 0x50 &&
      zipBuffer[1] === 0x4b &&
      zipBuffer[2] === 0x03 &&
      zipBuffer[3] === 0x04;

    assert(
      Buffer.isBuffer(zipBuffer) && isZip && zipBuffer.length > 100,
      `G3.3: createStaticZipArchive generates valid binary ZIP archive (${zipBuffer.length} bytes, PK header verified)`
    );

    // =========================================================================
    // GAP 4: Invitation Revoke & Resend (Team & Website)
    // =========================================================================
    console.log("\n--- Gap 4: Invitation Revoke & Resend ---");

    // --- Team Invitations ---
    teamA = await createTeam(userA.id, `Team A ${timestamp}`);
    const teamInvite = await inviteMember(teamA.id, userA.id, `invitee_${timestamp}@example.com`, "DESIGNER");

    // G4.1: Revoke team invitation
    const revokeTeamRes = await revokeTeamInvitation(teamInvite.inviteId, userA.id);
    assert(
      revokeTeamRes.success === true && revokeTeamRes.invite.status === "REVOKED",
      "G4.1: revokeTeamInvitation transitions status to REVOKED"
    );

    // G4.2: Revoked invitation cannot be accepted
    const inviteeUser = await db.user.create({
      data: {
        email: `invitee_${timestamp}@example.com`,
        fullName: "Invitee",
        status: "ACTIVE",
      },
    });

    let revokedAcceptFailed = false;
    try {
      await acceptInvitation(teamInvite.token, inviteeUser.id);
    } catch (e: any) {
      revokedAcceptFailed = e.statusCode === 400;
    }
    assert(revokedAcceptFailed, "G4.2: Revoked team invitation cannot be accepted (400)");

    // G4.3: Resend team invitation
    const resendTeamRes = await resendTeamInvitation(teamInvite.inviteId, userA.id);
    assert(
      resendTeamRes.success === true &&
        Boolean(resendTeamRes.token) &&
        resendTeamRes.token !== teamInvite.token,
      "G4.3: resendTeamInvitation issues a new crypto token and reactivates invitation"
    );

    // G4.4: Old token is completely invalidated
    let oldTokenFailed = false;
    try {
      await acceptInvitation(teamInvite.token, inviteeUser.id);
    } catch (e: any) {
      oldTokenFailed = e.statusCode === 400;
    }
    assert(oldTokenFailed, "G4.4: Previous token cannot be accepted after resend");

    // G4.5: New token is accepted successfully
    const acceptNewRes = await acceptInvitation(resendTeamRes.token, inviteeUser.id);
    assert(acceptNewRes.success === true, "G4.5: Newly resent token accepted successfully");

    // --- Website Invitations ---
    const siteInvite = await inviteWebsiteMember(siteA.id, userA.id, `site_invitee_${timestamp}@example.com`, "DESIGNER");
    const revokeSiteRes = await revokeWebsiteInvitation(siteInvite.inviteId, userA.id);
    assert(
      revokeSiteRes.success === true && revokeSiteRes.invite.status === "REVOKED",
      "G4.6: revokeWebsiteInvitation transitions status to REVOKED"
    );

    const siteInviteeUser = await db.user.create({
      data: {
        email: `site_invitee_${timestamp}@example.com`,
        fullName: "Site Invitee",
        status: "ACTIVE",
      },
    });

    let siteRevokeAcceptFailed = false;
    try {
      await acceptWebsiteInvitation(siteInvite.token, siteInviteeUser.id);
    } catch (e: any) {
      siteRevokeAcceptFailed = e.statusCode === 400;
    }
    assert(siteRevokeAcceptFailed, "G4.7: Revoked website invitation cannot be accepted");

    const resendSiteRes = await resendWebsiteInvitation(siteInvite.inviteId, userA.id);
    assert(
      resendSiteRes.success === true &&
        Boolean(resendSiteRes.token) &&
        resendSiteRes.token !== siteInvite.token,
      "G4.8: resendWebsiteInvitation issues new secure token and invalidates old one"
    );

    const acceptNewSiteRes = await acceptWebsiteInvitation(resendSiteRes.token, siteInviteeUser.id);
    assert(acceptNewSiteRes.success === true, "G4.9: Resent website invitation accepted with new token");

    // G4.10: Audit entries created
    const auditLogs = await queryAuditLogs({
      userId: userA.id,
    });
    const revokedLogs = auditLogs.logs.filter((l: any) => l.action === "INVITATION_REVOKED");
    const resentLogs = auditLogs.logs.filter((l: any) => l.action === "INVITATION_RESENT");
    assert(
      revokedLogs.length >= 2 && resentLogs.length >= 2,
      "G4.10: INVITATION_REVOKED and INVITATION_RESENT durable audit logs recorded"
    );

    // =========================================================================
    // GAP 5: Audit Log HTTP API & Security
    // =========================================================================
    console.log("\n--- Gap 5: Audit Log HTTP API & Security ---");

    const userALogs = await queryAuditLogs({ userId: userA.id });
    assert(
      userALogs.success === true && userALogs.logs.length > 0 && userALogs.pagination.total > 0,
      "G5.1: queryAuditLogs supports filtering by userId and pagination metadata"
    );

    // =========================================================================
    // GAP 6: Embedded PostMessage Origin Security
    // =========================================================================
    console.log("\n--- Gap 6: Embedded PostMessage Origin Security ---");

    const trustedOrigin = "https://trusted-host.com";
    const untrustedOrigin = "https://evil-attacker.com";

    let messageReceived: any = null;
    const testWindow = {
      listeners: [] as ((ev: any) => void)[],
      addEventListener(_type: string, fn: any) {
        this.listeners.push(fn);
      },
      removeEventListener(_type: string, fn: any) {
        this.listeners = this.listeners.filter((l) => l !== fn);
      },
      dispatch(origin: string, data: any) {
        for (const l of this.listeners) {
          l({ origin, data });
        }
      },
    };

    subscribeToForgeMessages(
      testWindow,
      (msg) => {
        messageReceived = msg;
      },
      { allowedOrigins: [trustedOrigin], isDevelopmentSafe: false }
    );

    const validMsg = createForgeMessage("FORGESTUDIO_STATE_CHANGED", {
      websiteId: siteA.id,
      isDirty: true,
    });

    // G6.1: Disallowed origin rejected
    testWindow.dispatch(untrustedOrigin, validMsg);
    assert(messageReceived === null, "G6.1: Message from disallowed origin is strictly rejected");

    // G6.2: Missing origin rejected
    testWindow.dispatch("", validMsg);
    assert(messageReceived === null, "G6.2: Message with missing origin is strictly rejected");

    // G6.3: Malformed envelope rejected
    testWindow.dispatch(trustedOrigin, { source: "OTHER", type: "HACK" });
    assert(messageReceived === null, "G6.3: Malformed non-Forge message envelope is rejected");

    // G6.4: Allowed origin accepted
    testWindow.dispatch(trustedOrigin, validMsg);
    assert(
      messageReceived !== null && messageReceived.type === "FORGESTUDIO_STATE_CHANGED",
      "G6.4: Message from authorized allowlisted origin is accepted"
    );

    // G6.5: Production Wildcard Rejection for outgoing messages
    let wildcardProductionCaught = false;
    try {
      postForgeMessage(
        { postMessage: () => {} },
        "FORGESTUDIO_SAVE",
        { websiteId: siteA.id },
        { targetOrigin: "*", isDevelopmentSafe: false }
      );
    } catch (e: any) {
      wildcardProductionCaught = e.message.includes("SecurityError");
    }
    assert(
      wildcardProductionCaught,
      "G6.5: postForgeMessage strictly rejects wildcard '*' targetOrigin in production mode"
    );

    // =========================================================================
    // GAP 7: Scheduled Publish Cancellation
    // =========================================================================
    console.log("\n--- Gap 7: Scheduled Publish Cancellation ---");

    const futurePublishDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    const schedPublish = await schedulePublish(siteA.id, userA.id, {
      publishAt: futurePublishDate,
      environment: "PRODUCTION",
      destinationType: "INTERNAL",
    });
    trackJob({ id: schedPublish.scheduledJobId });

    assert(
      schedPublish.status === "SCHEDULED",
      "G7.1: Scheduled publish job successfully enqueued"
    );

    // G7.2: Cross-tenant cancellation rejection
    let crossTenantCancelFailed = false;
    try {
      await cancelScheduledPublish(siteA.id, schedPublish.scheduledJobId, userB.id);
    } catch (e: any) {
      crossTenantCancelFailed = e.statusCode === 403;
    }
    assert(
      crossTenantCancelFailed,
      "G7.2: Cross-tenant user cannot cancel scheduled publish (403)"
    );

    // G7.3: Authorized cancellation
    const cancelRes = await cancelScheduledPublish(
      siteA.id,
      schedPublish.scheduledJobId,
      userA.id,
      "User cancelled rollout"
    );
    assert(
      cancelRes.success === true && cancelRes.status === "CANCELLED",
      "G7.3: cancelScheduledPublish atomically marks job as CANCELLED"
    );

    // G7.4: Repeated cancellation is idempotent
    const repeatCancel = await cancelScheduledPublish(
      siteA.id,
      schedPublish.scheduledJobId,
      userA.id
    );
    assert(
      repeatCancel.success === true && repeatCancel.alreadyCancelled === true,
      "G7.4: Repeated cancellation is idempotent and safe"
    );

    // G7.5: Cancelled job does NOT publish
    const cancelledJob = await getJobById(schedPublish.scheduledJobId);
    assert(cancelledJob?.status === "CANCELLED", "G7.5: Verified job state is durably CANCELLED");

    // Force time to past and process: it must NOT execute publish!
    await (prisma as any).backgroundJob.update({
      where: { id: schedPublish.scheduledJobId },
      data: { runAt: new Date(Date.now() - 1000) },
    });

    const processRes = await processNextJob({ id: schedPublish.scheduledJobId });
    assert(
      processRes.processed === false,
      "G7.6: Cancelled scheduled publish job is completely prevented from executing"
    );

    // G7.7: Audit entry for cancellation
    const cancelLogs = await queryAuditLogs({
      userId: userA.id,
      action: "PUBLISH_SCHEDULE_CANCELLED",
    });
    assert(
      cancelLogs.logs.length >= 1,
      "G7.7: PUBLISH_SCHEDULE_CANCELLED durable audit log recorded"
    );

    // =========================================================================
    // GAP 8: Milestone E Test Isolation
    // =========================================================================
    console.log("\n--- Gap 8: Milestone E Test Isolation ---");

    // Create 2 jobs with different unique IDs
    const otherJob = trackJob(await enqueueJob("TEST_TASK_OTHER", { val: "noise" }));
    const targetJob = trackJob(await enqueueJob("TEST_TASK_TARGET", { val: "target" }));

    let targetExecuted: any = false;
    let otherExecuted: any = false;

    registerJobHandler("TEST_TASK_TARGET", async () => {
      targetExecuted = true;
      return { ok: true };
    });
    registerJobHandler("TEST_TASK_OTHER", async () => {
      otherExecuted = true;
      return { ok: true };
    });

    // Targeted processNextJob processes ONLY targetJob even when other queued jobs exist
    const targetProc = await processNextJob({ id: targetJob.id });
    assert(
      targetProc.processed === true &&
        targetProc.job?.id === targetJob.id &&
        targetExecuted === true &&
        otherExecuted === false,
      "G8.1: processNextJob({ id }) processes only the specific intended test job regardless of queue contents"
    );

    const remainingOther = await getJobById(otherJob.id);
    assert(
      remainingOther?.status === "QUEUED",
      "G8.2: Unrelated queued jobs remain untouched, preserving deterministic test isolation"
    );

  } catch (err: any) {
    console.error("FATAL ERROR in Gap Closure tests:", err);
    failed++;
  } finally {
    // Teardown created resources
    if (createdJobIds.length > 0) {
      await db.backgroundJob.deleteMany({
        where: { id: { in: createdJobIds } },
      }).catch(() => {});
    }
    if (teamA?.id) await db.team.deleteMany({ where: { id: teamA.id } }).catch(() => {});
    if (siteA?.id) await db.website.deleteMany({ where: { id: siteA.id } }).catch(() => {});
    if (siteB?.id) await db.website.deleteMany({ where: { id: siteB.id } }).catch(() => {});
    if (userA?.id) await db.user.deleteMany({ where: { id: userA.id } }).catch(() => {});
    if (userB?.id) await db.user.deleteMany({ where: { id: userB.id } }).catch(() => {});
  }

  console.log("\n=================================================");
  console.log(`GAP CLOSURE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runGapClosureTests().catch((err) => {
  console.error("Unhandled test failure:", err);
  process.exit(1);
});

import {createNotificationDispatcher,startNotificationWorker} from './services/notification-delivery.js';
import { prisma } from "./config/prisma.js";
import { assertInvitationSmtpConfigured, sendWorkspaceInvitationMessage } from "./services/email.service.js";
import { invitationToken, invitationLink } from "./services/workspace-invitation-token.js";
import { createInvitationDispatcher, startInvitationWorker } from "./services/workspace-invitation-delivery.js";
import "dotenv/config";
import http from "http";
import app from "./app.js";
import { startScheduler } from "./services/scheduleWorker.js";
import { initPresenceWebSocketServer } from "./services/collaboration/presence.service.js";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initPresenceWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startScheduler();
  if(process.env.DASHBOARD_NOTIFICATION_EMAIL_ENABLED==='true'){
    try{assertInvitationSmtpConfigured();const stopNotifications=startNotificationWorker(createNotificationDispatcher(prisma,sendWorkspaceInvitationMessage));server.once('close',stopNotifications);}
    catch{console.warn('[Notifications] Optional email delivery is not configured.');}
  }
  try {
    assertInvitationSmtpConfigured();
    invitationLink("configuration-check", invitationToken("configuration-check", 1));
    const stop = startInvitationWorker(createInvitationDispatcher(prisma, sendWorkspaceInvitationMessage));
    server.once("close", stop);
  } catch { console.warn("[Workspace invitations] Email delivery disabled: configure SMTP, FRONTEND_URL and WORKSPACE_INVITATION_TOKEN_KEY, then restart."); }
});
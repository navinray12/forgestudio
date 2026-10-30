import {prisma} from '../config/prisma.js';
import {createDashboardSecurityService} from './dashboard-security.service.js';
// One shared policy for settings and every application session-creation path.
export const dashboardSecurity=createDashboardSecurityService(prisma);

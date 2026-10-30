import { Router } from "express";
import {
  loginController,
  sendLoginOtpController,
  verifyLoginOtpController,
  resendLoginOtpController,
} from "../controllers/login.controller.js";

import { prisma } from "../config/prisma.js";
import { createUserSession } from "../services/session.service.js";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from "../config/auth.js";

const router = Router();

router.post("/login", loginController);
router.post("/login/send-otp", sendLoginOtpController);
router.post("/login/verify-otp", verifyLoginOtpController);
router.post("/login/resend-otp", resendLoginOtpController);

const currentEnv = process.env.NODE_ENV;
const isDevOrTest = currentEnv === "development" || currentEnv === "test";

if (isDevOrTest) {
  router.get("/dev-login", async (req, res, next) => {
    try {
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ error: "Dev login is strictly forbidden in production" });
      }

      const email = ((req.query.email as string) || "demo@forgestudio.com").toLowerCase().trim();

      // Ensure dev login cannot be used to hijack admin or privileged accounts
      let user = await prisma.user.findUnique({ where: { email } });
      if (user && user.role !== "USER") {
        return res.status(403).json({
          error: "Dev login is restricted to standard test accounts with role USER only",
        });
      }

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            fullName: "Demo User",
            role: "USER",
            status: "ACTIVE",
            emailVerified: true,
          },
        });
      }

      const session = await createUserSession(user.id);
      res.cookie(AUTH_COOKIE_NAME, session.token, AUTH_COOKIE_OPTIONS);

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      let redirectPath = (req.query.redirect as string) || "/dashboard";

      // Prevent open redirect vulnerabilities
      if (!redirectPath.startsWith("/") || redirectPath.startsWith("//")) {
        redirectPath = "/dashboard";
      }

      return res.redirect(`${frontendUrl}${redirectPath}`);
    } catch (err) {
      next(err);
    }
  });
}

export default router;
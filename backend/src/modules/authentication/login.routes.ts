/**
 * @file Authentication: HTTP route registration and middleware order. File responsibility: login routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import {
  loginController,
  sendLoginOtpController,
  verifyLoginOtpController,
  resendLoginOtpController,
} from "./login.controller.js";

const router = Router();

router.post("/login", loginController);
router.post("/login/send-otp", sendLoginOtpController);
router.post("/login/verify-otp", verifyLoginOtpController);
router.post("/login/resend-otp", resendLoginOtpController);

export default router;
/**
 * @file Authentication: HTTP route registration and middleware order. File responsibility: signup routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import {
  signupController,
  verifySignupOtpController,
  resendSignupOtpController,
} from "./signup.controller.js";

const router = Router();

router.post("/signup", signupController);
router.post("/signup/verify-otp", verifySignupOtpController);
router.post("/signup/resend-otp", resendSignupOtpController);

export default router;

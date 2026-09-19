import { Router } from "express";
import {
  loginController,
  sendLoginOtpController,
  verifyLoginOtpController,
  resendLoginOtpController,
} from "../controllers/login.controller.js";

const router = Router();

router.post("/login", loginController);
router.post("/login/send-otp", sendLoginOtpController);
router.post("/login/verify-otp", verifyLoginOtpController);
router.post("/login/resend-otp", resendLoginOtpController);

export default router;
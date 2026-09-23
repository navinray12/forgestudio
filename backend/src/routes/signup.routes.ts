import { Router } from "express";
import {
  signupController,
  verifySignupOtpController,
  resendSignupOtpController,
} from "../controllers/signup.controller.js";

const router = Router();

router.post("/signup", signupController);
router.post("/signup/verify-otp", verifySignupOtpController);
router.post("/signup/resend-otp", resendSignupOtpController);

export default router;

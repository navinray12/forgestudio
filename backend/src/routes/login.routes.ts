import { Router } from "express";
<<<<<<< HEAD
import {
  loginController,
  sendLoginOtpController,
  verifyLoginOtpController,
  resendLoginOtpController,
=======

import {
  loginController,
>>>>>>> 8d95dec (Initial project code)
} from "../controllers/login.controller.js";

const router = Router();

<<<<<<< HEAD
router.post("/login", loginController);
router.post("/login/send-otp", sendLoginOtpController);
router.post("/login/verify-otp", verifyLoginOtpController);
router.post("/login/resend-otp", resendLoginOtpController);
=======
router.post(
  "/login",
  loginController
);
>>>>>>> 8d95dec (Initial project code)

export default router;
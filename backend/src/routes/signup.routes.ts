import { Router } from "express";
<<<<<<< HEAD
import {
  signupController,
  verifySignupOtpController,
  resendSignupOtpController,
} from "../controllers/signup.controller.js";
=======
import { signupController } from "../controllers/signup.controller.js";
>>>>>>> 8d95dec (Initial project code)

const router = Router();

router.post("/signup", signupController);
<<<<<<< HEAD
router.post("/signup/verify-otp", verifySignupOtpController);
router.post("/signup/resend-otp", resendSignupOtpController);
=======
>>>>>>> 8d95dec (Initial project code)

export default router;

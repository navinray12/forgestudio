import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/me", requireAuth, (req, res) => {
  const user = res.locals.user;

  return res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        lastLoginAt: user.lastLoginAt,
      },
    },
  });
});

export default router;
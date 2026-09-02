<<<<<<< HEAD
import type { Request, Response, NextFunction } from "express";
import { loginSchema } from "../validators/login.validator.js";
import { loginUser } from "../services/login.service.js";
import { createUserSession } from "../services/session.service.js";
import { generateAndSendOtp, verifyOtp, sendOtpWhatsApp } from "../services/otp.service.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
=======
import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { loginSchema } from "../validators/login.validator.js";
import { loginUser } from "../services/login.service.js";
import { createUserSession } from "../services/session.service.js";

>>>>>>> 8d95dec (Initial project code)
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
} from "../config/auth.js";

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
<<<<<<< HEAD
    const validationResult = loginSchema.safeParse(req.body);
=======
    const validationResult = loginSchema.safeParse(
      req.body
    );
>>>>>>> 8d95dec (Initial project code)

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid login details",
          details: validationResult.error.issues,
        },
      });
    }

<<<<<<< HEAD
    const user = await loginUser(validationResult.data);

    // Prompt user for OTP verification channel selection
    return res.status(200).json({
      success: true,
      requireChannelSelection: true,
      message: "Please select your preferred verification method.",
      data: {
        userId: user.id,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function sendLoginOtpController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId, channel } = req.body;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "User ID is required to send verification code.",
        },
      });
    }

    const selectedChannel = channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL";

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User account not found.", 404, "USER_NOT_FOUND");
    }

    if (selectedChannel === "WHATSAPP") {
      await sendOtpWhatsApp({ userId: user.id, phone: user.phone || undefined });
      return;
    }

    if (!user.email) {
      throw new AppError(
        "Registered email address not found.",
        400,
        "EMAIL_NOT_FOUND"
      );
    }

    await generateAndSendOtp({
      userId: user.id,
      email: user.email,
      purpose: "EMAIL_LOGIN",
      channel: "EMAIL",
    });

    return res.status(200).json({
      success: true,
      requireOtp: true,
      message: "Verification code sent to your email.",
      data: {
        userId: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyLoginOtpController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId, otp } = req.body;

    if (!userId || typeof userId !== "string" || !otp || typeof otp !== "string") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "User ID and verification OTP code are required.",
        },
      });
    }

    await verifyOtp({
      userId,
      otp,
      purpose: "EMAIL_LOGIN",
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User account not found.", 404, "USER_NOT_FOUND");
    }

    const session = await createUserSession(user.id);
    res.cookie(AUTH_COOKIE_NAME, session.token, AUTH_COOKIE_OPTIONS);
=======
    const user = await loginUser(
      validationResult.data
    );

    const session = await createUserSession(
      user.id
    );

    res.cookie(
      AUTH_COOKIE_NAME,
      session.token,
      AUTH_COOKIE_OPTIONS
    );
>>>>>>> 8d95dec (Initial project code)

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
<<<<<<< HEAD
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
        },
=======
        user,
>>>>>>> 8d95dec (Initial project code)
      },
    });
  } catch (error) {
    next(error);
  }
<<<<<<< HEAD
}

export async function resendLoginOtpController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId, channel } = req.body;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "User ID is required to resend verification code.",
        },
      });
    }

    const selectedChannel = channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL";

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(
        "User account not found.",
        404,
        "USER_NOT_FOUND"
      );
    }

    if (selectedChannel === "WHATSAPP") {
      await sendOtpWhatsApp({ userId: user.id, phone: user.phone || undefined });
      return;
    }

    if (!user.email) {
      throw new AppError(
        "Registered email address not found.",
        400,
        "EMAIL_NOT_FOUND"
      );
    }

    await generateAndSendOtp({
      userId: user.id,
      email: user.email,
      purpose: "EMAIL_LOGIN",
      channel: "EMAIL",
    });

    return res.status(200).json({
      success: true,
      message: "Verification code resent successfully.",
    });
  } catch (error) {
    next(error);
  }
=======
>>>>>>> 8d95dec (Initial project code)
}
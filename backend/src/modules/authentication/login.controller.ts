/**
 * @file Authentication: HTTP handlers that translate requests into module operations and responses. File responsibility: login controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { Request, Response, NextFunction } from "express";
import { loginSchema } from "./login.validator.js";
import { loginUser } from "./login.service.js";
import { createUserSession } from "./session.service.js";
import { generateAndSendOtp, verifyOtp, sendOtpWhatsApp } from "./otp.service.js";
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
} from "../../platform/authentication/auth.js";

/**
 * Login Controller.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.body.identifier && req.body.email) {
      req.body.identifier = req.body.email;
    }
    if (!req.body.identifier && req.body.phone) {
      req.body.identifier = req.body.phone;
    }

    const validationResult = loginSchema.safeParse(req.body);

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

    const user = await loginUser(validationResult.data);

    const session = await createUserSession(user.id);
    res.cookie(AUTH_COOKIE_NAME, session.token, AUTH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Send Login Otp Controller.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
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
      await generateAndSendOtp({
        userId: user.id,
        phone: user.phone || undefined,
        purpose: "PHONE_LOGIN",
        channel: "WHATSAPP",
      });
      return res.status(200).json({
        success: true,
        requireOtp: true,
        message: "Verification code sent to WhatsApp.",
        data: {
          userId: user.id,
          phone: user.phone,
        },
      });
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

/**
 * Verify Login Otp Controller.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function verifyLoginOtpController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId, channel } = req.body;
    const otp = req.body.otp || req.body.otpCode;

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
      purpose: channel === "WHATSAPP" ? "PHONE_LOGIN" : "EMAIL_LOGIN",
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User account not found.", 404, "USER_NOT_FOUND");
    }

    const session = await createUserSession(user.id);
    res.cookie(AUTH_COOKIE_NAME, session.token, AUTH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Login successful",
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
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Resend Login Otp Controller.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
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
      await generateAndSendOtp({
        userId: user.id,
        phone: user.phone || undefined,
        purpose: "PHONE_LOGIN",
        channel: "WHATSAPP",
      });
      return res.status(200).json({
        success: true,
        message: "Verification code resent to WhatsApp.",
      });
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
}
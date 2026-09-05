import type { Request, Response, NextFunction } from "express";
import { signupSchema } from "../validators/signup.validator.js";
import { signupUser } from "../services/signup.service.js";
import { createUserSession } from "../services/session.service.js";
import { generateAndSendOtp, verifyOtp } from "../services/otp.service.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
} from "../config/auth.js";

export async function signupController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const validationResult = signupSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid signup details",
          details: validationResult.error.issues,
        },
      });
    }

    const user = await signupUser(validationResult.data);

    if (user.email) {
      await generateAndSendOtp({
        userId: user.id,
        email: user.email,
        purpose: "EMAIL_SIGNUP",
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
    }

    if (user.phone && !user.email) {
      await generateAndSendOtp({
        userId: user.id,
        phone: user.phone,
        purpose: "PHONE_SIGNUP",
        channel: "WHATSAPP",
      });

      return res.status(200).json({
        success: true,
        requireOtp: true,
        message: "Verification code sent to your WhatsApp.",
        data: {
          userId: user.id,
          phone: user.phone,
        },
      });
    }

    const session = await createUserSession(user.id);
    res.cookie(AUTH_COOKIE_NAME, session.token, AUTH_COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifySignupOtpController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId, otp, channel } = req.body;

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
      purpose: channel === "WHATSAPP" ? "PHONE_SIGNUP" : "EMAIL_SIGNUP",
    });

    // We can confidently set both to true or conditionally based on channel,
    // though the request didn't explicitly separate them in the output
    const updateData: any = {};
    if (channel === "WHATSAPP") {
      updateData.phoneVerified = true;
    } else {
      updateData.emailVerified = true;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
      message: "Email verified successfully",
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

export async function resendSignupOtpController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req.body;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "User ID is required to resend verification code.",
        },
      });
    }

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

    if (user.phone && !user.email) {
      await generateAndSendOtp({
        userId: user.id,
        phone: user.phone,
        purpose: "PHONE_SIGNUP",
        channel: "WHATSAPP",
      });

      return res.status(200).json({
        success: true,
        message: "Verification code resent successfully to WhatsApp.",
      });
    }

    if (!user.email) {
      throw new AppError(
        "User or registered email address not found.",
        404,
        "USER_NOT_FOUND"
      );
    }

    await generateAndSendOtp({
      userId: user.id,
      email: user.email,
      purpose: "EMAIL_SIGNUP",
    });

    return res.status(200).json({
      success: true,
      message: "Verification code resent successfully.",
    });
  } catch (error) {
    next(error);
  }
}

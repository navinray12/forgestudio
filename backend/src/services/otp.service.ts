import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { sendOtpEmail } from "./email.service.js";

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_FAILED_ATTEMPTS = 5;

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function generate6DigitOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function sendOtpWhatsApp(params: {
  userId?: string;
  phone?: string;
  otp?: string;
}): Promise<void> {
  // Placeholder boundary for future WhatsApp integration
  // DO NOT connect to any WhatsApp API/provider yet
  throw new AppError(
    "WhatsApp OTP will be available soon.",
    400,
    "WHATSAPP_OTP_NOT_CONFIGURED"
  );
}

export async function generateAndSendOtp(params: {
  userId: string;
  email?: string;
  phone?: string;
  purpose: "EMAIL_SIGNUP" | "EMAIL_LOGIN" | "PHONE_SIGNUP" | "PHONE_LOGIN";
  channel?: "EMAIL" | "WHATSAPP";
}) {
  const { userId, email, phone, purpose, channel = "EMAIL" } = params;

  if (channel === "WHATSAPP") {
    await sendOtpWhatsApp({ userId, phone });
    return;
  }

  const normalizedEmail = (email || "").toLowerCase().trim();

  // Check resend cooldown
  const recentOtp = await prisma.otpVerification.findFirst({
    where: {
      userId,
      purpose,
      createdAt: {
        gte: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentOtp) {
    const elapsedSeconds = Math.floor(
      (Date.now() - recentOtp.createdAt.getTime()) / 1000
    );
    const remainingSeconds = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
    throw new AppError(
      `Please wait ${
        remainingSeconds > 0 ? remainingSeconds : 60
      } seconds before requesting a new verification code.`,
      429,
      "OTP_RESEND_COOLDOWN"
    );
  }

  // Invalidate previous unverified OTPs for this user and purpose
  await prisma.otpVerification.deleteMany({
    where: {
      userId,
      purpose,
      verifiedAt: null,
    },
  });

  const otp = generate6DigitOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(
    Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
  );

  const createData: any = {
    email: normalizedEmail,
    otpHash,
    purpose,
    channel,
    attempts: 0,
    expiresAt,
  };

  if (userId) {
    createData.user = { connect: { id: userId } };
  }

  await prisma.otpVerification.create({
    data: createData,
  });

  const emailPurpose = purpose === "EMAIL_SIGNUP" ? "SIGNUP" : "LOGIN";
  await sendOtpEmail(normalizedEmail, otp, emailPurpose);
}

export async function verifyOtp(params: {
  userId: string;
  otp: string;
  purpose: "EMAIL_SIGNUP" | "EMAIL_LOGIN";
}) {
  const { userId, otp, purpose } = params;
  const cleanOtp = otp.trim();

  if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
    throw new AppError(
      "Invalid verification code. OTP must be exactly 6 digits.",
      400,
      "INVALID_OTP"
    );
  }

  const record = await prisma.otpVerification.findFirst({
    where: {
      userId,
      purpose,
      verifiedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new AppError(
      "No active verification code found. Please request a new one.",
      400,
      "OTP_NOT_FOUND"
    );
  }

  if (record.expiresAt < new Date()) {
    throw new AppError(
      "Verification code has expired. Please request a new code.",
      400,
      "OTP_EXPIRED"
    );
  }

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    throw new AppError(
      "Maximum verification attempts exceeded. Please request a new code.",
      400,
      "MAX_ATTEMPTS_EXCEEDED"
    );
  }

  const inputHash = hashOtp(cleanOtp);

  if (record.otpHash !== inputHash) {
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    const remainingAttempts =
      MAX_FAILED_ATTEMPTS - (record.attempts + 1);

    if (remainingAttempts <= 0) {
      throw new AppError(
        "Maximum verification attempts exceeded. Please request a new code.",
        400,
        "MAX_ATTEMPTS_EXCEEDED"
      );
    }

    throw new AppError(
      `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
      400,
      "INVALID_OTP"
    );
  }

  // Mark as verified
  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verifiedAt: new Date() },
  });

  return true;
}

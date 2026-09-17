/**
 * @file Authentication: business operations and coordination with persistence or external services. File responsibility: otp service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import crypto from "crypto";
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";
import { sendOtpEmail } from "../notifications/email.service.js";

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Hash Otp.
 * @param otp Otp supplied to this operation (type: string).
 */
function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/**
 * Generate6 Digit Otp.
 */
function generate6DigitOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Send Otp Whats App.
 * @param params Params supplied to this operation (type: { userId?: string; phone?: string; otp?: string; }).
 */
export async function sendOtpWhatsApp(params: {
  userId?: string;
  phone?: string;
  otp?: string;
}): Promise<void> {
  // Placeholder boundary for future WhatsApp integration
  console.log(`\n==================================================`);
  console.log(`[WHATSAPP OTP] (SIMULATED) Sent to: ${params.phone}`);
  console.log(`[WHATSAPP OTP] OTP Code: ${params.otp}`);
  console.log(`==================================================\n`);
  return;
}

/**
 * Generate And Send Otp.
 * @param params Params supplied to this operation (type: { userId: string; email?: string; phone?: string; purpose: "EMAIL_SIGNUP" | "EMAIL_LOGIN" | "PHONE_SIGNUP" | "PHONE_LOGIN"; channel?: "EMAIL" | "WHATSAPP"; }).
 */
export async function generateAndSendOtp(params: {
  userId: string;
  email?: string;
  phone?: string;
  purpose: "EMAIL_SIGNUP" | "EMAIL_LOGIN" | "PHONE_SIGNUP" | "PHONE_LOGIN";
  channel?: "EMAIL" | "WHATSAPP";
}) {
  const { userId, email, phone, purpose, channel = "EMAIL" } = params;

  const normalizedEmail = email ? email.toLowerCase().trim() : null;

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
      `Please wait ${remainingSeconds > 0 ? remainingSeconds : 60
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
    otpHash,
    purpose,
    channel,
    attempts: 0,
    expiresAt,
  };

  if (normalizedEmail) {
    createData.email = normalizedEmail;
  }

  if (userId) {
    createData.user = { connect: { id: userId } };
  }

  await prisma.otpVerification.create({
    data: createData,
  });

  if (channel === "WHATSAPP") {
    await sendOtpWhatsApp({ userId, phone, otp });
    return;
  }

  if (normalizedEmail) {
    const emailPurpose = purpose === "EMAIL_SIGNUP" ? "SIGNUP" : "LOGIN";
    await sendOtpEmail(normalizedEmail, otp, emailPurpose);
  }
}

/**
 * Verify Otp.
 * @param params Params supplied to this operation (type: { userId: string; otp: string; purpose: "EMAIL_SIGNUP" | "EMAIL_LOGIN" | "PHONE_SIGNUP" | "PHONE_LOGIN"; }).
 */
export async function verifyOtp(params: {
  userId: string;
  otp: string;
  purpose: "EMAIL_SIGNUP" | "EMAIL_LOGIN" | "PHONE_SIGNUP" | "PHONE_LOGIN";
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

import { AppError } from "../utils/app-error.js";
import nodemailer from "nodemailer";

export interface SentTestEmail {
  toEmail: string;
  otp: string;
  purpose: "SIGNUP" | "LOGIN";
  sentAt: Date;
}

export const emailTestTransport: SentTestEmail[] = [];

let isolatedTestTransportExplicitlyEnabled = false;

export function enableIsolatedTestTransport(): void {
  isolatedTestTransportExplicitlyEnabled = true;
}

export function disableIsolatedTestTransport(): void {
  isolatedTestTransportExplicitlyEnabled = false;
  emailTestTransport.length = 0;
}

export function isIsolatedTestTransportEnabled(): boolean {
  return (
    isolatedTestTransportExplicitlyEnabled ||
    (process.env.NODE_ENV === "test" && process.env.ENABLE_TEST_OTP_TRANSPORT === "true")
  );
}

export function clearEmailTestTransport(): void {
  emailTestTransport.length = 0;
}

export function getLastSentOtp(email?: string): string | undefined {
  if (!isIsolatedTestTransportEnabled()) {
    return undefined;
  }
  if (email) {
    const matching = emailTestTransport.filter((e) => e.toEmail.toLowerCase() === email.toLowerCase());
    return matching[matching.length - 1]?.otp;
  }
  return emailTestTransport[emailTestTransport.length - 1]?.otp;
}

export async function sendOtpEmail(
  toEmail: string,
  otp: string,
  purpose: "SIGNUP" | "LOGIN"
): Promise<void> {
  // Capture into isolated test transport ONLY when explicitly enabled for isolated tests
  if (isIsolatedTestTransportEnabled()) {
    emailTestTransport.push({
      toEmail,
      otp,
      purpose,
      sentAt: new Date(),
    });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  const hasSmtpConfig = Boolean(smtpHost && smtpUser && smtpPassword && smtpFrom);
  const isProduction = process.env.NODE_ENV === "production";

  // Production requirement: missing SMTP configuration must fail clearly, not silently simulate delivery
  if (isProduction && !hasSmtpConfig) {
    console.error("[EMAIL SERVICE] Error: SMTP configuration is missing in production environment");
    throw new Error("SMTP configuration is missing. Cannot send verification email in production.");
  }

  // In test mode with isolated transport enabled, return after capture without network calls
  if (isIsolatedTestTransportEnabled()) {
    console.log(`[EMAIL SERVICE] OTP dispatched to ${toEmail} via isolated test transport (purpose: ${purpose})`);
    return;
  }

  // In development without SMTP config, log simulated delivery with plaintext OTP
  if (!hasSmtpConfig) {
    console.log(`\n==================================================`);
    console.log(`[EMAIL OTP] (SIMULATED - NO SMTP SETUP) Sent to: ${toEmail}`);
    console.log(`[EMAIL OTP] Purpose: ${purpose}`);
    console.log(`[EMAIL OTP] OTP Code: ${otp}`);
    console.log(`==================================================\n`);
    return;
  }

  // Real SMTP integration via Nodemailer
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  const actionText =
    purpose === "SIGNUP"
      ? "verify your account creation"
      : "sign in to your account";

  const subject = "Your ForgeStudio Verification Code";

  const textContent = `
Your ForgeStudio verification code is: ${otp}

This code will expire in 10 minutes.

Use this 6-digit code to ${actionText}.

If you did not request this code, please ignore this email.
`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e293b;">ForgeStudio Security Code</h2>

      <p style="color: #475569; font-size: 14px;">
        Use the following 6-digit OTP code to ${actionText}:
      </p>

      <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #2563eb; margin: 20px 0;">
        ${otp}
      </div>

      <p style="color: #64748b; font-size: 12px;">
        This code expires in 10 minutes.
        If you did not request this code, please ignore this email.
      </p>
    </div>
  `;

  console.log(`\n==================================================`);
  console.log(`[EMAIL OTP] Sent to: ${toEmail}`);
  console.log(`[EMAIL OTP] Purpose: ${purpose}`);
  console.log(`[EMAIL OTP] OTP Code: ${otp}`);
  console.log(`==================================================\n`);

  try {
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[EMAIL SERVICE] Email successfully sent to ${toEmail} (Message ID: ${info.messageId})`);
  } catch (error) {
    console.error("[EMAIL SERVICE] Failed to send email via SMTP:", error);
    throw error;
  }
}
// Invitations require real delivery configuration; they never use the OTP development simulation.
export function assertInvitationSmtpConfigured(): void {
  const port = Number(process.env.SMTP_PORT || 587);
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !(process.env.SMTP_FROM || process.env.SMTP_USER) ||
      !Number.isInteger(port) || port < 1 || port > 65535)
    throw new AppError("Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_FROM before sending invitations", 503, "INVITATION_DELIVERY_UNAVAILABLE");
}
export async function sendWorkspaceInvitationMessage(message: { to: string; subject: string; text: string; messageId: string }): Promise<void> {
  assertInvitationSmtpConfigured();
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
  });
  await transport.sendMail({ ...message, from: process.env.SMTP_FROM || process.env.SMTP_USER });
}

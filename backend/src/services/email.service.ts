import nodemailer from "nodemailer";

export async function sendOtpEmail(
  toEmail: string,
  otp: string,
  purpose: "SIGNUP" | "LOGIN"
): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPassword || !smtpFrom) {
    throw new Error(
      "SMTP configuration is missing. Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_FROM."
    );
  }

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

    console.log(
      `[EMAIL SERVICE] Email successfully sent to ${toEmail}`
    );
    console.log(`[EMAIL SERVICE] Message ID: ${info.messageId}`);
  } catch (error) {
    console.error("[EMAIL SERVICE] Failed to send email:", error);
    throw error;
  }
}
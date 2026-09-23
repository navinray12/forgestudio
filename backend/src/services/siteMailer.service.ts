import crypto from "crypto";
import nodemailer from "nodemailer";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

const db = prisma as any;

// Encryption key derivation
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || "forgestudio-mailer-default-key-32b";
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptPassword(plainText: string): string {
  if (!plainText) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

function decryptPassword(cipherText: string): string {
  if (!cipherText || !cipherText.includes(":")) return "";
  try {
    const [ivHex, tagHex, encryptedHex] = cipherText.split(":");
    if (!ivHex || !tagHex || !encryptedHex) return "";
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[SiteMailer] Failed to decrypt SMTP password:", err);
    return "";
  }
}

/**
 * Ensure database tables exist for site mailer
 */
export async function initSiteMailerTables() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS site_mailer_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "websiteId" UUID NOT NULL UNIQUE REFERENCES websites(id) ON DELETE CASCADE,
        host VARCHAR(255) NOT NULL,
        port INTEGER NOT NULL DEFAULT 587,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(500) NOT NULL,
        "fromName" VARCHAR(255) NOT NULL,
        "fromEmail" VARCHAR(255) NOT NULL,
        "isVerified" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS email_delivery_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "websiteId" UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'SENT',
        error VARCHAR(2000),
        "sentAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_site_sent ON email_delivery_logs("websiteId", "sentAt");
    `);
  } catch (error) {
    console.error("Site mailer table initialization log:", error);
  }
}

initSiteMailerTables();

export interface SaveMailerConfigInput {
  host: string;
  port?: number;
  username: string;
  password?: string;
  fromName: string;
  fromEmail: string;
}

export async function getMailerConfig(websiteId: string) {
  if (!websiteId) throw new AppError("Website ID is required", 400, "BAD_REQUEST");

  let config: any = null;
  if (db?.siteMailerConfig?.findUnique) {
    config = await db.siteMailerConfig.findUnique({
      where: { websiteId },
    });
  } else {
    const rows: any[] = await prisma.$queryRaw`
      SELECT * FROM site_mailer_configs WHERE "websiteId" = ${websiteId}::uuid
    `;
    config = rows[0] || null;
  }

  if (!config) return null;

  return {
    id: config.id,
    websiteId: config.websiteId,
    host: config.host,
    port: config.port,
    username: config.username,
    fromName: config.fromName,
    fromEmail: config.fromEmail,
    isVerified: config.isVerified,
    hasPassword: Boolean(config.password && config.password.length > 0),
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

export async function saveMailerConfig(websiteId: string, input: SaveMailerConfigInput) {
  const { host, port = 587, username, password, fromName, fromEmail } = input;

  if (!host || !username || !fromEmail) {
    throw new AppError("Host, username, and fromEmail are required for SMTP configuration.", 400, "INVALID_SMTP_CONFIG");
  }

  // Check if existing config has password to retain if not re-provided
  let existing: any = null;
  if (db?.siteMailerConfig?.findUnique) {
    existing = await db.siteMailerConfig.findUnique({ where: { websiteId } });
  }

  let encryptedPass = existing?.password || "";
  if (password && password.trim().length > 0) {
    encryptedPass = encryptPassword(password.trim());
  }

  if (!encryptedPass) {
    throw new AppError("A password is required for SMTP authentication.", 400, "INVALID_SMTP_CONFIG");
  }

  const now = new Date();
  let saved: any = null;

  if (db?.siteMailerConfig?.upsert) {
    saved = await db.siteMailerConfig.upsert({
      where: { websiteId },
      update: {
        host: host.trim(),
        port: Number(port),
        username: username.trim(),
        password: encryptedPass,
        fromName: fromName ? fromName.trim() : "ForgeStudio Site",
        fromEmail: fromEmail.trim(),
        updatedAt: now,
      },
      create: {
        websiteId,
        host: host.trim(),
        port: Number(port),
        username: username.trim(),
        password: encryptedPass,
        fromName: fromName ? fromName.trim() : "ForgeStudio Site",
        fromEmail: fromEmail.trim(),
        isVerified: false,
        createdAt: now,
        updatedAt: now,
      },
    });
  } else {
    const rows: any[] = await prisma.$queryRaw`
      INSERT INTO site_mailer_configs (id, "websiteId", host, port, username, password, "fromName", "fromEmail", "isVerified", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${websiteId}::uuid, ${host}, ${port}, ${username}, ${encryptedPass}, ${fromName || "ForgeStudio Site"}, ${fromEmail}, false, ${now}, ${now})
      ON CONFLICT ("websiteId") DO UPDATE
      SET host = EXCLUDED.host,
          port = EXCLUDED.port,
          username = EXCLUDED.username,
          password = EXCLUDED.password,
          "fromName" = EXCLUDED."fromName",
          "fromEmail" = EXCLUDED."fromEmail",
          "updatedAt" = NOW()
      RETURNING *
    `;
    saved = rows[0];
  }

  return {
    id: saved.id,
    websiteId: saved.websiteId,
    host: saved.host,
    port: saved.port,
    username: saved.username,
    fromName: saved.fromName,
    fromEmail: saved.fromEmail,
    isVerified: saved.isVerified,
    hasPassword: true,
  };
}

export async function testMailerConnection(websiteId: string, testRecipient?: string) {
  let config: any = null;
  if (db?.siteMailerConfig?.findUnique) {
    config = await db.siteMailerConfig.findUnique({ where: { websiteId } });
  } else {
    const rows: any[] = await prisma.$queryRaw`
      SELECT * FROM site_mailer_configs WHERE "websiteId" = ${websiteId}::uuid
    `;
    config = rows[0] || null;
  }

  if (!config) {
    throw new AppError("No SMTP configuration found for this website. Please save settings first.", 404, "NOT_FOUND");
  }

  const plainPassword = decryptPassword(config.password);
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.username,
      pass: plainPassword,
    },
  });

  // 1. Verify handshake
  try {
    await transporter.verify();
  } catch (verifyErr: any) {
    throw new AppError(`SMTP verification failed: ${verifyErr.message || String(verifyErr)}`, 400, "SMTP_VERIFY_FAILED");
  }

  // 2. Mark verified
  if (db?.siteMailerConfig?.update) {
    await db.siteMailerConfig.update({
      where: { websiteId },
      data: { isVerified: true },
    });
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE site_mailer_configs SET "isVerified" = true, "updatedAt" = NOW() WHERE "websiteId" = $1::uuid`,
      websiteId
    );
  }

  // 3. Optional test email dispatch
  const recipient = testRecipient || config.fromEmail;
  let sentInfo: any = null;
  try {
    sentInfo = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: recipient,
      subject: "ForgeStudio Site Mailer Test",
      text: "This is a test email confirming your ForgeStudio SMTP mailer connection is working successfully.",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #10b981; margin-top: 0;">✓ SMTP Connected Successfully</h2>
          <p>Your ForgeStudio transactional Site Mailer is verified and ready to deliver form leads and customer notifications.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;" />
          <p style="font-size: 12px; color: #64748b;">Host: ${config.host}:${config.port} | Sender: ${config.fromEmail}</p>
        </div>
      `,
    });

    // Record delivery log
    await recordDeliveryLog(websiteId, recipient, "ForgeStudio Site Mailer Test", "DELIVERED");
  } catch (sendErr: any) {
    await recordDeliveryLog(websiteId, recipient, "ForgeStudio Site Mailer Test", "FAILED", sendErr.message);
    throw new AppError(`Handshake passed, but failed to deliver test email: ${sendErr.message}`, 500, "EMAIL_DISPATCH_FAILED");
  }

  return {
    verified: true,
    message: `SMTP connection verified and test email sent to ${recipient}`,
    messageId: sentInfo?.messageId,
  };
}

export async function sendSiteEmail(
  websiteId: string,
  payload: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    fromName?: string;
    fromEmail?: string;
  }
) {
  const { to, subject, html, text, fromName, fromEmail } = payload;
  if (!to || !subject) {
    throw new AppError("Recipient and subject are required.", 400, "BAD_REQUEST");
  }

  let config: any = null;
  if (db?.siteMailerConfig?.findUnique) {
    config = await db.siteMailerConfig.findUnique({ where: { websiteId } });
  } else {
    const rows: any[] = await prisma.$queryRaw`
      SELECT * FROM site_mailer_configs WHERE "websiteId" = ${websiteId}::uuid
    `;
    config = rows[0] || null;
  }

  let transporter: any = null;
  let senderName = fromName || "ForgeStudio";
  let senderEmail = fromEmail || process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@forgestudio.io";

  if (config && config.host && config.username) {
    const pass = decryptPassword(config.password);
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.username,
        pass,
      },
    });
    senderName = fromName || config.fromName || "ForgeStudio";
    senderEmail = fromEmail || config.fromEmail;
  } else if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "",
      },
    });
  }

  if (!transporter) {
    console.warn(`[SiteMailer] No SMTP configured for site ${websiteId}, simulating dispatch.`);
    await recordDeliveryLog(websiteId, to, subject, "SIMULATED");
    return { status: "SIMULATED", message: "Email simulated: no SMTP transport configured." };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      text: text || (html ? html.replace(/<[^>]*>/g, "") : ""),
      html: html || text,
    });

    await recordDeliveryLog(websiteId, to, subject, "DELIVERED");
    return { status: "DELIVERED", messageId: info.messageId };
  } catch (err: any) {
    console.error("[SiteMailer] Dispatch error:", err);
    await recordDeliveryLog(websiteId, to, subject, "FAILED", err.message);
    throw new AppError(`Email delivery failed: ${err.message}`, 500, "EMAIL_DISPATCH_FAILED");
  }
}

async function recordDeliveryLog(
  websiteId: string,
  recipient: string,
  subject: string,
  status: string,
  error?: string
) {
  try {
    const now = new Date();
    if (db?.emailDeliveryLog?.create) {
      await db.emailDeliveryLog.create({
        data: {
          websiteId,
          recipient,
          subject,
          status,
          error: error || null,
          sentAt: now,
        },
      });
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO email_delivery_logs (id, "websiteId", recipient, subject, status, error, "sentAt", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, NOW(), NOW())`,
        websiteId,
        recipient,
        subject,
        status,
        error || null,
        now
      );
    }
  } catch (logErr) {
    console.error("[SiteMailer] Failed to save delivery log:", logErr);
  }
}

export async function getDeliveryLogs(
  websiteId: string,
  options: { page?: number; limit?: number; status?: string } = {}
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = { websiteId };
  if (options.status) {
    where.status = options.status;
  }

  let logs: any[] = [];
  let total = 0;

  if (db?.emailDeliveryLog?.findMany) {
    [logs, total] = await Promise.all([
      db.emailDeliveryLog.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip,
        take: limit,
      }),
      db.emailDeliveryLog.count({ where }),
    ]);
  } else {
    logs = await prisma.$queryRaw`
      SELECT * FROM email_delivery_logs
      WHERE "websiteId" = ${websiteId}::uuid
      ORDER BY "sentAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;
    const countRes: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM email_delivery_logs WHERE "websiteId" = ${websiteId}::uuid
    `;
    total = countRes[0]?.count || 0;
  }

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AppError } from "../utils/app-error.js";

export function invitationEmail(value: unknown): string {
  const parsed = z.string().trim().toLowerCase().max(254).email().safeParse(value);
  if (!parsed.success) throw new AppError("A valid invitation email is required", 400, "INVALID_EMAIL");
  return parsed.data;
}
function signingKey(): Buffer {
  const raw = process.env.WORKSPACE_INVITATION_TOKEN_KEY ?? "";
  if (!/^[a-fA-F0-9]{64}$/.test(raw))
    throw new AppError("Invitation signing is not configured", 503, "INVITATION_DELIVERY_UNAVAILABLE");
  return Buffer.from(raw, "hex");
}
// Domain-separated HMAC allows durable redelivery without putting a reusable
// secret in the database, outbox, command journal, job payload or API response.
export function invitationToken(id: string, version: number): string {
  return createHmac("sha256", signingKey()).update(`forge:workspace-invitation:v1:${id}:${version}`).digest("base64url");
}
export function invitationTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export function matchesInvitationToken(token: unknown, hash: string | null): boolean {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token) || !hash || !/^[a-f0-9]{64}$/.test(hash)) return false;
  return timingSafeEqual(Buffer.from(invitationTokenHash(token), "hex"), Buffer.from(hash, "hex"));
}
export function invitationLink(id: string, token: string): string {
  // Fragment keeps the secret out of HTTP access logs and Referer headers.
  return `${browserOrigin()}/workspace-invitations/${encodeURIComponent(id)}#token=${token}`;
}

export function browserOrigin(): string {
  let url: URL;
  try { url = new URL(process.env.FRONTEND_URL || ""); } catch { throw new AppError("FRONTEND_URL is required for invitations", 503, "INVITATION_DELIVERY_UNAVAILABLE"); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && process.env.NODE_ENV !== "production")))
    throw new AppError("Configure a valid frontend origin for invitations", 503, "INVITATION_DELIVERY_UNAVAILABLE");
  return url.origin;
}

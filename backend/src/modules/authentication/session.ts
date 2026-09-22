/**
 * @file Authentication: module implementation. File responsibility: session.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import crypto from "node:crypto";

/**
 * Generate Session Token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Hash Session Token.
 * @param token Token supplied to this operation; do not include secret tokens in logs.
 */
export function hashSessionToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}
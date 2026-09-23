/**
 * @file Authentication: module implementation. File responsibility: password.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import argon2 from "argon2";

/**
 * Hash Password.
 * @param password Password value being checked or transformed; do not log it.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
  });
}

/**
 * Verify Password.
 * @param password Password value being checked or transformed; do not log it.
 * @param passwordHash Password Hash supplied to this operation (type: string).
 */
export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return argon2.verify(passwordHash, password);
}
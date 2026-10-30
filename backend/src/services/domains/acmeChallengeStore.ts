/**
 * Phase 19: Module 19.3 — ACME HTTP-01 Challenge Store
 *
 * Manages pending HTTP-01 challenge tokens and key authorizations.
 * Provides in-memory lookup backed by persistent secure filesystem storage
 * to survive server restarts during certificate authority challenge validation.
 *
 * Security:
 * - Tokens are strictly sanitized (alphanumeric + hyphen + underscore).
 * - Challenges expire after a bounded TTL (default 10 minutes).
 * - Private keys and account credentials are NEVER stored in this challenge store.
 */

import fs from "fs";
import path from "path";
import { getUploadsDir } from "../../config/storage.config.js";

export interface AcmeChallengeRecord {
  token: string;
  keyAuthorization: string;
  domain: string;
  websiteId: string;
  createdAt: number;
  expiresAt: number;
  status: "PENDING" | "COMPLETED" | "EXPIRED";
}

export function getSecureSslStorageDir(): string {
  const envDir = process.env.SSL_STORAGE_DIR?.trim();
  if (envDir) {
    return path.resolve(envDir);
  }
  // Store securely outside public uploads directory
  const baseDir = path.dirname(getUploadsDir());
  return path.join(baseDir, "storage", "ssl_secure");
}

function getChallengesDir(): string {
  const dir = path.join(getSecureSslStorageDir(), "challenges");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

const memoryStore = new Map<string, AcmeChallengeRecord>();

export const acmeChallengeStore = {
  /**
   * Registers a new HTTP-01 challenge with a 10-minute validity window.
   */
  registerChallenge(record: {
    token: string;
    keyAuthorization: string;
    domain: string;
    websiteId: string;
    ttlMs?: number;
  }): AcmeChallengeRecord {
    const cleanToken = String(record.token || "").trim();
    if (!/^[a-zA-Z0-9_-]{10,128}$/.test(cleanToken)) {
      throw new Error("Invalid ACME challenge token format. Must be 10-128 base64url characters.");
    }

    const now = Date.now();
    const ttl = record.ttlMs || 10 * 60 * 1000; // 10 minutes
    const fullRecord: AcmeChallengeRecord = {
      token: cleanToken,
      keyAuthorization: String(record.keyAuthorization || "").trim(),
      domain: String(record.domain || "").toLowerCase().trim(),
      websiteId: String(record.websiteId || "").trim(),
      createdAt: now,
      expiresAt: now + ttl,
      status: "PENDING",
    };

    memoryStore.set(cleanToken, fullRecord);

    try {
      const filePath = path.join(getChallengesDir(), `${cleanToken}.json`);
      fs.writeFileSync(filePath, JSON.stringify(fullRecord, null, 2), { mode: 0o600 });
    } catch (err: any) {
      console.error("[AcmeChallengeStore] Failed to write persistent challenge file:", err?.message || err);
    }

    return fullRecord;
  },

  /**
   * Retrieves a challenge key authorization if the token is valid, active, and not expired.
   */
  getChallenge(token: string): AcmeChallengeRecord | null {
    const cleanToken = String(token || "").trim();
    if (!cleanToken || !/^[a-zA-Z0-9_-]{10,128}$/.test(cleanToken)) {
      return null;
    }

    let record = memoryStore.get(cleanToken);

    if (!record) {
      try {
        const filePath = path.join(getChallengesDir(), `${cleanToken}.json`);
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, "utf-8");
          record = JSON.parse(raw);
          if (record) {
            memoryStore.set(cleanToken, record);
          }
        }
      } catch {
        return null;
      }
    }

    if (!record) {
      return null;
    }

    if (Date.now() > record.expiresAt) {
      record.status = "EXPIRED";
      this.removeChallenge(cleanToken);
      return null;
    }

    if (record.status !== "PENDING") {
      return null;
    }

    return record;
  },

  /**
   * Marks a challenge completed and cleans up its storage.
   */
  completeChallenge(token: string): void {
    const cleanToken = String(token || "").trim();
    const record = memoryStore.get(cleanToken);
    if (record) {
      record.status = "COMPLETED";
    }
    this.removeChallenge(cleanToken);
  },

  /**
   * Removes a challenge record from memory and persistent disk.
   */
  removeChallenge(token: string): void {
    const cleanToken = String(token || "").trim();
    memoryStore.delete(cleanToken);
    try {
      const filePath = path.join(getChallengesDir(), `${cleanToken}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore cleanup error
    }
  },

  /**
   * Cleans up expired challenge files.
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, record] of memoryStore.entries()) {
      if (now > record.expiresAt || record.status !== "PENDING") {
        memoryStore.delete(token);
        cleaned++;
      }
    }

    try {
      const dir = getChallengesDir();
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const filePath = path.join(dir, file);
        try {
          const raw = fs.readFileSync(filePath, "utf-8");
          const rec: AcmeChallengeRecord = JSON.parse(raw);
          if (now > rec.expiresAt || rec.status !== "PENDING") {
            fs.unlinkSync(filePath);
            cleaned++;
          }
        } catch {
          fs.unlinkSync(filePath);
        }
      }
    } catch {
      // Ignore scan error
    }

    return cleaned;
  },

  /**
   * Clears all challenges (used for test isolation).
   */
  reset(): void {
    memoryStore.clear();
    try {
      const dir = getChallengesDir();
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith(".json")) {
            fs.unlinkSync(path.join(dir, file));
          }
        }
      }
    } catch {
      // Ignore
    }
  },
};

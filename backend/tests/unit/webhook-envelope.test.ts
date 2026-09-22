/**
 * @file Webhook envelope test: regression or diagnostic checks for the behavior named by this file.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import crypto from "node:crypto";
import express from "express";
import { once } from "node:events";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonBodyParser } from "../../src/platform/http/webhook-body.middleware.js";
import {
  getWebhookSecret,
  parseWebhookEnvelope,
  verifyWebhookSignature,
} from "../../src/modules/wordpress-connections/webhook-envelope.js";

const secret = "a-separate-webhook-signing-secret-with-32-bytes";
const timestamp = Math.floor(Date.now() / 1000);
const envelope = {
  eventId: "event-1",
  event: "test_ping",
  timestamp,
  data: {},
};
/**
 * Sign.
 * @param body Body supplied to this operation (type: string).
 */
const sign = (body: string) =>
  crypto.createHmac("sha256", secret).update(body).digest("hex");
afterEach(() => vi.unstubAllEnvs());

describe("webhook envelope", () => {
  it("verifies exact received bytes including whitespace", () => {
    const raw = JSON.stringify(envelope, null, 2);
    expect(verifyWebhookSignature(raw, `sha256=${sign(raw)}`, secret)).toBe(
      true,
    );
    expect(
      verifyWebhookSignature(JSON.stringify(envelope), sign(raw), secret),
    ).toBe(false);
    expect(parseWebhookEnvelope(raw)).toEqual(envelope);
  });
  it.each([undefined, 0, "123", timestamp - 301, timestamp + 301])(
    "rejects missing or invalid timestamp %s",
    (timestamp) => {
      expect(() =>
        parseWebhookEnvelope(JSON.stringify({ ...envelope, timestamp })),
      ).toThrow();
    },
  );
  it("requires an event ID and validates form data", () => {
    expect(() =>
      parseWebhookEnvelope(JSON.stringify({ ...envelope, eventId: undefined })),
    ).toThrow();
    expect(() =>
      parseWebhookEnvelope(
        JSON.stringify({ ...envelope, event: "form_submitted" }),
      ),
    ).toThrow();
  });
  it.each(["", "gg".repeat(32), "a".repeat(63), "a".repeat(66)])(
    "rejects malformed signatures",
    (signature) => {
      expect(verifyWebhookSignature("{}", signature, secret)).toBe(false);
    },
  );
  it("requires a separate per-connection signing key", () => {
    vi.stubEnv(
      "WORDPRESS_WEBHOOK_SECRETS",
      JSON.stringify({ connection: secret }),
    );
    expect(getWebhookSecret("connection")).toBe(secret);
    expect(() => getWebhookSecret("other")).toThrow();
  });
  it("preserves signed bytes through the real HTTP JSON parser", async () => {
    const app = express();
    app.use(jsonBodyParser);
    app.post("/:id/wordpress/webhook", (req, res) =>
      res.json({
        valid: verifyWebhookSignature(
          req.rawBody!,
          req.header("x-signature")!,
          secret,
        ),
        parsed: req.body,
      }),
    );
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const port = (server.address() as { port: number }).port;
      const raw = JSON.stringify(envelope, null, 2);
      const response = await fetch(
        `http://127.0.0.1:${port}/site/wordpress/webhook`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-signature": sign(raw),
          },
          body: raw,
        },
      );
      expect(await response.json()).toEqual({ valid: true, parsed: envelope });
      const compressed = await fetch(
        `http://127.0.0.1:${port}/site/wordpress/webhook`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-encoding": "gzip",
            "x-signature": sign(raw),
          },
          body: gzipSync(raw),
        },
      );
      expect(compressed.status).toBe(415);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});

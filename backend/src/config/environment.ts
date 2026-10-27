export interface RuntimeEnvironment {
  nodeEnv: string;
  frontendUrl?: string;
  uploadDir?: string;
  trustProxy: string | number | false;
}

export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): RuntimeEnvironment {
  const nodeEnv = env.NODE_ENV || "development";
  if (!env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required");
  }

  let frontendUrl = env.FRONTEND_URL?.trim();
  if (frontendUrl) {
    let parsed: URL;
    try {
      parsed = new URL(frontendUrl);
    } catch {
      throw new Error("FRONTEND_URL must be an absolute URL");
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error("FRONTEND_URL must use http or https");
    }
    frontendUrl = parsed.origin;
  }

  if (nodeEnv === "production") {
    if (!frontendUrl) throw new Error("FRONTEND_URL is required in production");
    if (!frontendUrl.startsWith("https://")) {
      throw new Error("FRONTEND_URL must use HTTPS in production");
    }
    if (!env.TRUST_PROXY?.trim()) {
      throw new Error("TRUST_PROXY is required in production behind the HTTPS reverse proxy");
    }
  }

  const rawTrustProxy = env.TRUST_PROXY?.trim();
  const trustProxy = !rawTrustProxy
    ? false
    : /^\d+$/.test(rawTrustProxy)
      ? Number(rawTrustProxy)
      : rawTrustProxy;

  return {
    nodeEnv,
    frontendUrl,
    uploadDir: env.UPLOAD_DIR?.trim() || undefined,
    trustProxy,
  };
}

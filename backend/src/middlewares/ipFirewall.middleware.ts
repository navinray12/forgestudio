import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";

const db = prisma as any;

/**
 * F-478 Server-Level Site Lock / IP Firewall Middleware
 * Enforces IP allowlist / denylist rules at the Express infrastructure layer.
 */
export async function enforceIpFirewall(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.websiteId || req.params.id || "");
    if (!websiteId) return next();

    // Prevent IP spoofing: only rely on req.ip if trust proxy is configured, else fallback to socket remote address
    const isTrustProxy = req.app.get("trust proxy");
    const clientIp = ((isTrustProxy ? req.ip : req.socket?.remoteAddress || req.ip) || "").replace(/^::ffff:/, "").trim();
    if (!clientIp) return next();

    const website = await db.website.findUnique({
      where: { id: websiteId },
      select: { editorData: true },
    });

    if (!website) return next();

    const editorData = typeof website.editorData === "string"
      ? JSON.parse(website.editorData)
      : (website.editorData || {});

    const firewall = editorData?.hostingConfig?.ipFirewall;
    if (!firewall || !Array.isArray(firewall.ips) || firewall.ips.length === 0) {
      return next();
    }

    const { mode, ips } = firewall;
    const isMatched = ips.some((ruleIp: string) => {
      if (ruleIp === clientIp) return true;
      // Handle simple wildcard matching e.g. 192.168.1.*
      if (ruleIp.includes("*")) {
        const pattern = new RegExp("^" + ruleIp.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
        return pattern.test(clientIp);
      }
      return false;
    });

    if (mode === "deny" && isMatched) {
      return res.status(403).json({
        success: false,
        error: {
          code: "IP_BLOCKED",
          message: `Access denied by server-level IP firewall rules for IP ${clientIp}`,
        },
      });
    }

    if (mode === "allow" && !isMatched) {
      return res.status(403).json({
        success: false,
        error: {
          code: "IP_NOT_ALLOWED",
          message: `Access restricted to authorized IP addresses. Your IP (${clientIp}) is not allowed.`,
        },
      });
    }

    next();
  } catch (err) {
    next(); // Pass through on unexpected evaluation errors
  }
}

import type { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getImagesDir, resolveSafePath, ensureStorageDirectories } from "../config/storage.config.js";
import { getWebsiteById } from "../services/website.service.js";
import { extractImageDimensions, createMediaAsset } from "../services/media.service.js";

// Ensure upload directory exists
ensureStorageDirectories();

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg"]);
export type SupportedImageFormat = "png" | "jpeg" | "webp" | "gif" | "svg";

export interface FileValidationResult {
  valid: boolean;
  format?: SupportedImageFormat;
  mimeType?: string;
  sanitizedFilename?: string;
  code?: string;
  message?: string;
}

/**
 * Sanitize filename to prevent directory traversal and illegal characters
 */
export function sanitizeFilename(originalName: string): string {
  if (!originalName || typeof originalName !== "string") {
    return "upload.png";
  }
  // Strip null bytes
  const noNulls = originalName.replace(/\0/g, "");
  // Normalize Windows backslashes to forward slashes before basename
  const normalized = noNulls.replace(/\\/g, "/");
  const base = path.basename(normalized);
  // Replace dangerous characters, preserve standard alphanumeric, spaces, dashes, dots, underscores
  const clean = base.replace(/[^\w\s.-]/g, "_").trim();
  return clean || "upload.png";
}

/**
 * Detect actual file signature (magic bytes) from raw buffer
 */
export function detectImageSignature(buffer: Buffer): SupportedImageFormat | null {
  if (!buffer || buffer.length < 4) return null;

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A (8 bytes)
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // 2. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  // 3. GIF: GIF87a or GIF89a
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "gif";
  }

  // 4. WebP: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }

  // 5. SVG: UTF-8 XML inspection
  const sample = buffer.toString("utf8", 0, Math.min(buffer.length, 4096)).trim();
  if (
    (sample.startsWith("<?xml") || sample.startsWith("<svg") || sample.includes("<svg")) &&
    (sample.includes("http://www.w3.org/2000/svg") || sample.includes("xmlns") || sample.includes("viewBox"))
  ) {
    return "svg";
  }

  return null;
}

/**
 * Inspect SVG for safety (prevent embedded scripts, javascript: links, and event handlers)
 */
export function isSafeSvg(buffer: Buffer): { safe: boolean; reason?: string } {
  const content = buffer.toString("utf8");
  const lower = content.toLowerCase();

  if (lower.includes("<script") || lower.includes("</script>")) {
    return { safe: false, reason: "SVG contains prohibited <script> tags" };
  }
  if (lower.includes("javascript:") || lower.includes("data:text/html") || lower.includes("vbscript:")) {
    return { safe: false, reason: "SVG contains prohibited script URI schemes" };
  }
  if (/on[a-z]+\s*=/i.test(content)) {
    return { safe: false, reason: "SVG contains prohibited inline event handlers" };
  }
  if (
    lower.includes("<foreignobject") ||
    lower.includes("<iframe") ||
    lower.includes("<object") ||
    lower.includes("<embed")
  ) {
    return { safe: false, reason: "SVG contains prohibited embedded objects or frames" };
  }
  if (lower.includes("<!doctype") || lower.includes("<!entity") || lower.includes("system ")) {
    return { safe: false, reason: "SVG contains prohibited DTD or external entity declarations" };
  }
  if (/(?:href|xlink:href)\s*=\s*["'](?:https?:|\/\/|ftp:)/i.test(content)) {
    return { safe: false, reason: "SVG contains prohibited external resource references" };
  }

  return { safe: true };
}

/**
 * Full file validation: checks size, extension, signatures, mismatches, and corruption
 */
export async function validateImageFile(
  buffer: Buffer,
  rawFilename: string,
  clientMimeType?: string
): Promise<FileValidationResult> {
  // 1. Buffer Size Checks
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      code: "EMPTY_FILE",
      message: "Uploaded file is empty or missing content",
    };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return {
      valid: false,
      code: "FILE_SIZE_EXCEEDED",
      message: `File size exceeds maximum limit of 5MB (${Math.round(buffer.length / (1024 * 1024))}MB uploaded)`,
    };
  }

  // 2. Sanitize Filename & Check Extension
  const sanitized = sanitizeFilename(rawFilename);
  const dotIndex = sanitized.lastIndexOf(".");
  if (dotIndex === -1) {
    return {
      valid: false,
      code: "INVALID_FILE_EXTENSION",
      message: "File missing extension. Allowed extensions: JPG, JPEG, PNG, WEBP, GIF, SVG",
    };
  }

  const ext = sanitized.substring(dotIndex + 1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      code: "INVALID_FILE_EXTENSION",
      message: `Unsupported file extension (.${ext}). Allowed extensions: JPG, JPEG, PNG, WEBP, GIF, SVG`,
    };
  }

  // 3. Binary Signature (Magic Bytes) Detection
  const detectedFormat = detectImageSignature(buffer);
  if (!detectedFormat) {
    return {
      valid: false,
      code: "INVALID_IMAGE_SIGNATURE",
      message: "File content does not match any supported image signature or file is corrupt",
    };
  }

  // 4. Extension / Signature Mismatch Validation
  const extToExpectedFormat: Record<string, SupportedImageFormat> = {
    png: "png",
    jpg: "jpeg",
    jpeg: "jpeg",
    webp: "webp",
    gif: "gif",
    svg: "svg",
  };

  const expectedFormat = extToExpectedFormat[ext];
  if (expectedFormat !== detectedFormat) {
    return {
      valid: false,
      code: "FILE_TYPE_MISMATCH",
      message: `File content (${detectedFormat.toUpperCase()}) does not match extension (.${ext})`,
    };
  }

  // 5. MIME Type Mapping & Client MIME Validation
  const formatMimes: Record<SupportedImageFormat, string> = {
    png: "image/png",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
  };
  const canonicalMime = formatMimes[detectedFormat];

  if (clientMimeType && clientMimeType !== "application/octet-stream") {
    const cleanClientMime = clientMimeType.split(";")[0].trim().toLowerCase();
    // Allow image/jpg as alias for image/jpeg
    const normalizedClientMime = cleanClientMime === "image/jpg" ? "image/jpeg" : cleanClientMime;
    if (normalizedClientMime !== canonicalMime && !normalizedClientMime.startsWith("image/")) {
      return {
        valid: false,
        code: "MIME_TYPE_MISMATCH",
        message: `MIME type (${clientMimeType}) does not match image format (${canonicalMime})`,
      };
    }
  }

  // 6. SVG Security Inspection
  if (detectedFormat === "svg") {
    const svgCheck = isSafeSvg(buffer);
    if (!svgCheck.safe) {
      return {
        valid: false,
        code: "UNSAFE_SVG",
        message: svgCheck.reason || "SVG contains prohibited executable content",
      };
    }
  } else {
    // 7. Raster Image Corruption Check (Sharp decode)
    try {
      const sharp = (await import("sharp")).default;
      const meta = await sharp(buffer).metadata();
      if (!meta.width || !meta.height) {
        return {
          valid: false,
          code: "CORRUPT_IMAGE",
          message: "Uploaded image dimensions cannot be parsed or file is corrupt",
        };
      }
    } catch (sharpErr: any) {
      return {
        valid: false,
        code: "CORRUPT_IMAGE",
        message: `Uploaded image is corrupted or cannot be decoded: ${sharpErr?.message || "Invalid image"}`,
      };
    }
  }

  return {
    valid: true,
    format: detectedFormat,
    mimeType: canonicalMime,
    sanitizedFilename: sanitized,
  };
}

/**
 * Main Express Image Upload Handler
 */
export async function handleImageUpload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  let createdFilePath: string | null = null;

  try {
    const userId = res.locals.user?.id || (req as any).user?.id || null;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required to upload media" },
      });
    }

    const contentType = req.headers["content-type"] || "";

    let fileBuffer: Buffer | null = null;
    let originalName = "upload.png";
    let clientMime: string | undefined = undefined;
    let websiteId: string | undefined = undefined;

    // Check query for websiteId
    if (typeof req.query.websiteId === "string" && req.query.websiteId.trim()) {
      websiteId = req.query.websiteId.trim();
    }

    if (contentType.includes("multipart/form-data")) {
      const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      const boundary = boundaryMatch ? boundaryMatch[1] || boundaryMatch[2] : null;

      if (!boundary) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_FORM", message: "Invalid multipart form boundary" },
        });
      }

      // Stream with early size cutoff protection (MAX_FILE_SIZE + 1MB form overhead)
      const maxStreamBytes = MAX_FILE_SIZE + 1024 * 1024;
      let totalStreamBytes = 0;
      const chunks: Buffer[] = [];

      for await (const chunk of req) {
        totalStreamBytes += chunk.length;
        if (totalStreamBytes > maxStreamBytes) {
          return res.status(400).json({
            success: false,
            error: {
              code: "FILE_SIZE_EXCEEDED",
              message: "Upload payload exceeds maximum limit of 5MB",
            },
          });
        }
        chunks.push(chunk);
      }

      const rawBuffer = Buffer.concat(chunks);
      const boundaryBuffer = Buffer.from(`--${boundary}`);
      const parts = splitBuffer(rawBuffer, boundaryBuffer);

      for (const part of parts) {
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd === -1) continue;

        const headerText = part.subarray(0, headerEnd).toString("utf8");

        // Parse file part
        if (headerText.includes('name="image"') || headerText.includes('filename=')) {
          const filenameMatch = headerText.match(/filename="([^"]+)"/i);
          if (filenameMatch) {
            originalName = filenameMatch[1];
          }

          const mimeMatch = headerText.match(/content-type:\s*([^\r\n;]+)/i);
          if (mimeMatch) {
            clientMime = mimeMatch[1].trim();
          }

          let body = part.subarray(headerEnd + 4);
          if (body.length >= 2 && body[body.length - 2] === 0x0d && body[body.length - 1] === 0x0a) {
            body = body.subarray(0, body.length - 2);
          }
          fileBuffer = body;
        }

        // Parse websiteId field
        if (headerText.includes('name="websiteId"')) {
          let body = part.subarray(headerEnd + 4);
          if (body.length >= 2 && body[body.length - 2] === 0x0d && body[body.length - 1] === 0x0a) {
            body = body.subarray(0, body.length - 2);
          }
          const val = body.toString("utf8").trim();
          if (val && val !== "undefined" && val !== "null") {
            websiteId = val;
          }
        }
      }
    } else if (contentType.startsWith("image/")) {
      clientMime = contentType.split(";")[0].trim();
      const chunks: Buffer[] = [];
      let totalStreamBytes = 0;

      for await (const chunk of req) {
        totalStreamBytes += chunk.length;
        if (totalStreamBytes > MAX_FILE_SIZE) {
          return res.status(400).json({
            success: false,
            error: {
              code: "FILE_SIZE_EXCEEDED",
              message: "Upload payload exceeds maximum limit of 5MB",
            },
          });
        }
        chunks.push(chunk);
      }
      fileBuffer = Buffer.concat(chunks);
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: "EMPTY_FILE", message: "No image file provided in request" },
      });
    }

    // 1. Comprehensive File Validation
    const validation = await validateImageFile(fileBuffer, originalName, clientMime);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: validation.code || "INVALID_FILE",
          message: validation.message || "File validation failed",
        },
      });
    }

    // 2. Validate websiteId authorization if provided
    let cleanWebsiteId: string | undefined = undefined;
    if (websiteId) {
      const trimmedSiteId = websiteId.trim();
      if (trimmedSiteId && trimmedSiteId !== "undefined" && trimmedSiteId !== "null") {
        try {
          await getWebsiteById(trimmedSiteId, userId);
          cleanWebsiteId = trimmedSiteId;
        } catch (siteErr: any) {
          return res.status(siteErr.statusCode || 404).json({
            success: false,
            error: {
              code: siteErr.code || "WEBSITE_NOT_FOUND",
              message: siteErr.message || "Target website not found or unauthorized",
            },
          });
        }
      }
    }

    // 3. Generate safe unique filename on disk
    const canonicalExt =
      validation.format === "jpeg"
        ? (validation.sanitizedFilename?.toLowerCase().endsWith(".jpeg") ? "jpeg" : "jpg")
        : validation.format!;

    const uniqueFilename = `img_${Date.now()}_${crypto.randomBytes(6).toString("hex")}.${canonicalExt}`;
    const targetDir = getImagesDir();
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = resolveSafePath(targetDir, uniqueFilename);
    createdFilePath = filePath;

    // 4. Save to persistent storage
    await fs.promises.writeFile(filePath, fileBuffer);

    // 5. Public URL relative path
    const publicUrl = `/uploads/images/${uniqueFilename}`;

    // 6. Extract dimensions & persist MediaAsset record
    const dimensions = extractImageDimensions(fileBuffer, validation.mimeType!);

    let asset: any = null;
    try {
      asset = await createMediaAsset({
        userId,
        websiteId: cleanWebsiteId,
        filename: uniqueFilename,
        originalName: validation.sanitizedFilename || originalName,
        mimeType: validation.mimeType!,
        sizeBytes: fileBuffer.length,
        url: publicUrl,
        width: dimensions.width,
        height: dimensions.height,
      });
    } catch (assetErr) {
      console.error("Could not create MediaAsset record, rolling back written file:", assetErr);
      if (fs.existsSync(filePath)) {
        try {
          await fs.promises.unlink(filePath);
        } catch (unlinkErr) {
          console.error("Failed to clean up orphaned upload file:", unlinkErr);
        }
      }
      return res.status(500).json({
        success: false,
        error: { code: "DATABASE_ERROR", message: "Failed to persist media asset record" },
      });
    }

    return res.status(200).json({
      success: true,
      url: publicUrl,
      asset: asset || undefined,
      width: dimensions.width,
      height: dimensions.height,
    });
  } catch (error: any) {
    console.error("Image upload error:", error);
    if (createdFilePath && fs.existsSync(createdFilePath)) {
      try {
        fs.unlinkSync(createdFilePath);
      } catch {}
    }
    return res.status(500).json({
      success: false,
      error: { code: "UPLOAD_FAILED", message: error?.message || "Failed to upload image" },
    });
  }
}

function splitBuffer(buffer: Buffer, delimiter: Buffer): Buffer[] {
  const parts: Buffer[] = [];
  let start = 0;
  let index: number;

  while ((index = buffer.indexOf(delimiter, start)) !== -1) {
    if (index > start) {
      parts.push(buffer.subarray(start, index));
    }
    start = index + delimiter.length;
  }

  if (start < buffer.length) {
    parts.push(buffer.subarray(start));
  }

  return parts;
}

import type { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { getImageUploadDirectory } from "../config/storage.js";
import crypto from "crypto";

const UPLOAD_DIR = getImageUploadDirectory();

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function detectRasterImageType(buffer: Buffer): "jpg" | "png" | "webp" | "gif" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"))) return "gif";
  return null;
}

/**
 * Handle multipart or raw image upload parsing safely without external native dependencies
 */
export async function handleImageUpload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const contentType = req.headers["content-type"] || "";

    let fileBuffer: Buffer | null = null;
    let fileExt = "png";
    let originalName = "upload.png";

    if (contentType.includes("multipart/form-data")) {
      // Parse multipart boundary
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBuffer = Buffer.concat(chunks);

      if (rawBuffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          error: { message: "File size exceeds maximum limit of 5MB" },
        });
      }

      const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      const boundary = boundaryMatch ? boundaryMatch[1] || boundaryMatch[2] : null;

      if (!boundary) {
        return res.status(400).json({
          success: false,
          error: { message: "Invalid form boundary" },
        });
      }

      const boundaryBuffer = Buffer.from(`--${boundary}`);
      const parts = splitBuffer(rawBuffer, boundaryBuffer);

      for (const part of parts) {
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd === -1) continue;

        const headerText = part.subarray(0, headerEnd).toString("utf8");
        if (headerText.includes('name="image"') || headerText.includes('filename=')) {
          const filenameMatch = headerText.match(/filename="([^"]+)"/i);
          if (filenameMatch) {
            originalName = filenameMatch[1];
          }

          // Content body is after \r\n\r\n and before trailing \r\n
          let body = part.subarray(headerEnd + 4);
          if (body.subarray(body.length - 2).toString() === "\r\n") {
            body = body.subarray(0, body.length - 2);
          }
          fileBuffer = body;
          break;
        }
      }
    } else if (contentType.startsWith("image/")) {
      // Direct binary stream
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      fileBuffer = Buffer.concat(chunks);

      const mimeSub = contentType.split("/")[1]?.split(";")[0] || "png";
      fileExt = mimeSub === "svg+xml" ? "svg" : mimeSub;
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: "No image file provided in request" },
      });
    }

    if (fileBuffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: { message: "File size exceeds maximum limit of 5MB" },
      });
    }

    // Extract extension
    const extMatch = originalName.lastIndexOf(".");
    if (extMatch !== -1) {
      fileExt = originalName.substring(extMatch + 1).toLowerCase();
    }

    if (!ALLOWED_EXTENSIONS.has(fileExt)) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid file type. Allowed: JPG, PNG, WEBP, GIF" },
      });
    }

    const detectedType = detectRasterImageType(fileBuffer);
    const normalizedExtension = fileExt === "jpeg" ? "jpg" : fileExt;
    if (!detectedType || detectedType !== normalizedExtension) {
      return res.status(400).json({
        success: false,
        error: { message: "File content does not match a supported image type" },
      });
    }

    // Generate safe unique filename
    const uniqueFilename = `img_${Date.now()}_${crypto.randomBytes(6).toString("hex")}.${fileExt}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    // Save to disk
    await fs.promises.writeFile(filePath, fileBuffer);

    // Public URL relative path
    const publicUrl = `/uploads/images/${uniqueFilename}`;
    const mimeType = detectedType === "jpg" ? "image/jpeg" : `image/${detectedType}`;

    const { extractImageDimensions, createMediaAsset } = await import("../services/media.service.js");
    const dimensions = extractImageDimensions(fileBuffer, mimeType);

    let asset: any = null;
    const userId = res.locals.user?.id || (req as any).user?.id || null;
    if (userId) {
      try {
        asset = await createMediaAsset({
          userId,
          filename: uniqueFilename,
          originalName,
          mimeType,
          sizeBytes: fileBuffer.length,
          url: publicUrl,
          width: dimensions.width,
          height: dimensions.height,
        });
      } catch (assetErr) {
        console.warn("Could not create MediaAsset record:", assetErr);
      }
    }

    return res.status(200).json({
      success: true,
      url: publicUrl,
      asset: asset || undefined,
      width: dimensions.width,
      height: dimensions.height,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return res.status(500).json({
      success: false,
      error: { message: "Failed to upload image" },
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

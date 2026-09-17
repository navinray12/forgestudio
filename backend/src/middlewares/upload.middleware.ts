import type { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "images");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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
        error: { message: "Invalid file type. Allowed: JPG, PNG, WEBP, GIF, SVG" },
      });
    }

    // Generate safe unique filename
    const uniqueFilename = `img_${Date.now()}_${crypto.randomBytes(6).toString("hex")}.${fileExt}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    // Save to disk
    await fs.promises.writeFile(filePath, fileBuffer);

    // Public URL relative path
    const publicUrl = `/uploads/images/${uniqueFilename}`;

    return res.status(200).json({
      success: true,
      url: publicUrl,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return res.status(500).json({
      success: false,
      error: { message: "Failed to upload image" },
    });
  }
}

const UPLOAD_VIDEO_DIR = path.join(process.cwd(), "uploads", "videos");

if (!fs.existsSync(UPLOAD_VIDEO_DIR)) {
  fs.mkdirSync(UPLOAD_VIDEO_DIR, { recursive: true });
}

const ALLOWED_VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "ogg", "m4v"]);
const ALLOWED_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
  "video/x-m4v",
  "video/mp4v-es",
]);
const MAX_VIDEO_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Handle multipart or raw video upload parsing safely without external native dependencies
 */
export async function handleVideoUpload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const contentType = req.headers["content-type"] || "";

    let fileBuffer: Buffer | null = null;
    let fileExt = "mp4";
    let originalName = "upload.mp4";
    let mimeType = "video/mp4";

    if (contentType.includes("multipart/form-data")) {
      const chunks: Buffer[] = [];
      let currentLength = 0;

      for await (const chunk of req) {
        currentLength += chunk.length;
        if (currentLength > MAX_VIDEO_FILE_SIZE) {
          return res.status(413).json({
            success: false,
            error: {
              code: "FILE_TOO_LARGE",
              message: "Video file size exceeds maximum limit of 50 MB",
            },
          });
        }
        chunks.push(chunk);
      }
      const rawBuffer = Buffer.concat(chunks);

      const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      const boundary = boundaryMatch ? boundaryMatch[1] || boundaryMatch[2] : null;

      if (!boundary) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_FORM_BOUNDARY",
            message: "Invalid form boundary in multipart request",
          },
        });
      }

      const boundaryBuffer = Buffer.from(`--${boundary}`);
      const parts = splitBuffer(rawBuffer, boundaryBuffer);

      for (const part of parts) {
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd === -1) continue;

        const headerText = part.subarray(0, headerEnd).toString("utf8");
        if (
          headerText.includes('name="video"') ||
          headerText.includes('name="file"') ||
          headerText.includes("filename=")
        ) {
          const filenameMatch = headerText.match(/filename="([^"]+)"/i);
          if (filenameMatch) {
            // Path traversal defense: extract basename
            originalName = path.basename(filenameMatch[1].replace(/\\/g, "/"));
          }

          const mimeMatch = headerText.match(/Content-Type:\s*([^\r\n;]+)/i);
          if (mimeMatch) {
            mimeType = mimeMatch[1].toLowerCase().trim();
          }

          let body = part.subarray(headerEnd + 4);
          if (body.subarray(body.length - 2).toString() === "\r\n") {
            body = body.subarray(0, body.length - 2);
          }
          fileBuffer = body;
          break;
        }
      }
    } else if (contentType.startsWith("video/")) {
      const chunks: Buffer[] = [];
      let currentLength = 0;

      for await (const chunk of req) {
        currentLength += chunk.length;
        if (currentLength > MAX_VIDEO_FILE_SIZE) {
          return res.status(413).json({
            success: false,
            error: {
              code: "FILE_TOO_LARGE",
              message: "Video file size exceeds maximum limit of 50 MB",
            },
          });
        }
        chunks.push(chunk);
      }
      fileBuffer = Buffer.concat(chunks);
      mimeType = contentType.split(";")[0].toLowerCase().trim();
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NO_FILE_PROVIDED",
          message: "No video file provided in request",
        },
      });
    }

    if (fileBuffer.length > MAX_VIDEO_FILE_SIZE) {
      return res.status(413).json({
        success: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: "Video file size exceeds maximum limit of 50 MB",
        },
      });
    }

    // Extract extension safely
    const extMatch = originalName.lastIndexOf(".");
    if (extMatch !== -1) {
      fileExt = originalName.substring(extMatch + 1).toLowerCase();
    }

    // Validate video extension
    if (!ALLOWED_VIDEO_EXTENSIONS.has(fileExt)) {
      return res.status(415).json({
        success: false,
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: `Invalid video format '.${fileExt}'. Allowed formats: MP4, WebM, MOV, OGG, M4V`,
        },
      });
    }

    // Generate safe unique server-side filename
    const uniqueFilename = `vid_${Date.now()}_${crypto.randomBytes(6).toString("hex")}.${fileExt}`;
    const filePath = path.join(UPLOAD_VIDEO_DIR, uniqueFilename);

    // Save to disk
    await fs.promises.writeFile(filePath, fileBuffer);

    // Public URL relative path
    const publicUrl = `/uploads/videos/${uniqueFilename}`;

    return res.status(200).json({
      success: true,
      message: "Video uploaded successfully",
      data: {
        url: publicUrl,
        filename: uniqueFilename,
        originalName,
        mimeType,
        size: fileBuffer.length,
      },
      url: publicUrl,
    });
  } catch (error) {
    console.error("Video upload error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "UPLOAD_FAILED",
        message: "Failed to upload video file",
      },
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

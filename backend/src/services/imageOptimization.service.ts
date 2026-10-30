import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getWebsiteById } from "./website.service.js";
import { getMediaAssetById, createMediaAsset } from "./media.service.js";
import {
  getUploadsDir,
  getOptimizedImagesDir,
  resolveSafePath,
  resolveMediaAssetFilePath,
} from "../config/storage.config.js";
import { validateSafeUrl } from "../utils/ssrf.validator.js";

const db = prisma as any;

let tablesInitialized = false;

export async function initOptimizationTables(): Promise<void> {
  if (tablesInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='optimizationCredits'
        ) THEN
          ALTER TABLE users ADD COLUMN "optimizationCredits" INTEGER DEFAULT 250;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS media_optimization_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "websiteId" UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        "originalUrl" VARCHAR(1000) NOT NULL,
        "optimizedUrl" VARCHAR(1000) NOT NULL,
        "originalBytes" INTEGER NOT NULL,
        "optimizedBytes" INTEGER NOT NULL,
        format VARCHAR(50) NOT NULL DEFAULT 'webp',
        status VARCHAR(50) NOT NULL DEFAULT 'OPTIMIZED',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_media_opt_site_created ON media_optimization_assets("websiteId", "createdAt");

      CREATE TABLE IF NOT EXISTS optimization_credit_ledgers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "websiteId" UUID,
        "creditsUsed" INTEGER NOT NULL,
        "actionType" VARCHAR(100) NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_opt_credits_user ON optimization_credit_ledgers("userId", "createdAt");
    `);
    tablesInitialized = true;
  } catch (err) {
    tablesInitialized = true;
  }
}

/**
 * Ensures uploads/optimized directory exists
 */
function getOptimizedDir(): string {
  const uploadDir = getOptimizedImagesDir();
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
}

export interface OptimizeImageOptions {
  imageUrl?: string;
  imageBuffer?: Buffer;
  fileName?: string;
  originalBytes?: number;
  assetId?: string;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: string;
  altText?: string;
}

export interface OptimizeImageResult {
  assetId: string;
  originalUrl: string;
  optimizedUrl: string;
  originalBytes: number;
  optimizedBytes: number;
  bytesSaved: number;
  savingsPercentage: string;
  format: string;
  width?: number;
  height?: number;
  originalWidth?: number;
  originalHeight?: number;
  remainingCredits: number;
  asset?: any;
}

/**
 * Optimize an image using Sharp:
 * - Reads local files via storage.config.ts or safe remote URLs (SSRF protected)
 * - Validates image headers and dimensions
 * - Preserves original image format by default (or respects requested format)
 * - Supports configurable quality (10-100, default 80)
 * - Supports proportional resizing without enlargement
 * - Saves output to persistent storage
 * - Registers new asset in MediaAsset table without touching the original
 * - Atomic cleanup of disk file and credit refund on DB failure
 */
export async function optimizeImage(
  websiteId: string | undefined | null,
  userId: string,
  options: OptimizeImageOptions = {}
): Promise<OptimizeImageResult> {
  await initOptimizationTables();

  // If websiteId is provided, verify website access
  if (websiteId) {
    await getWebsiteById(websiteId, userId);
  }

  // 1. Check user credit balance
  let user: any = null;
  if (db?.user?.findUnique) {
    user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, optimizationCredits: true },
    });
  } else {
    const rows: any[] = await prisma.$queryRaw`
      SELECT id, "optimizationCredits" FROM users WHERE id = ${userId}::uuid
    `;
    user = rows[0];
  }

  const currentCredits = user?.optimizationCredits ?? 250;
  if (currentCredits < 1) {
    throw new AppError(
      "Insufficient optimization credits. Please upgrade your plan or purchase an add-on pack.",
      402,
      "INSUFFICIENT_CREDITS"
    );
  }

  // 2. Prepare source image buffer safely
  let sourceBuffer: Buffer;
  let originalUrl = options.imageUrl || "";
  let originalName = options.fileName || "image.png";

  if (options.imageBuffer && options.imageBuffer.length > 0) {
    sourceBuffer = options.imageBuffer;
    if (!originalUrl) originalUrl = `/uploads/buffer-${Date.now()}.png`;
  } else if (options.assetId) {
    const asset = await getMediaAssetById(options.assetId, userId);
    originalUrl = asset.url;
    originalName = asset.originalName || asset.filename;
    const diskPath = resolveMediaAssetFilePath(asset);
    if (!fs.existsSync(diskPath)) {
      throw new AppError("Source media file not found on storage", 404, "FILE_NOT_FOUND");
    }
    sourceBuffer = await fs.promises.readFile(diskPath);
  } else if (options.imageUrl && typeof options.imageUrl === "string") {
    originalUrl = options.imageUrl.trim();
    originalName = options.fileName || path.basename(originalUrl) || "image.png";

    if (originalUrl.startsWith("/uploads/") || originalUrl.startsWith("uploads/")) {
      // Local persistent upload path
      const subPath = originalUrl.replace(/^\/?uploads\/?/, "");
      const diskPath = resolveSafePath(getUploadsDir(), subPath);
      if (!fs.existsSync(diskPath)) {
        throw new AppError("Local media file not found on storage", 404, "FILE_NOT_FOUND");
      }
      sourceBuffer = await fs.promises.readFile(diskPath);
    } else if (originalUrl.startsWith("http://") || originalUrl.startsWith("https://")) {
      // Remote URL: validate against SSRF
      validateSafeUrl(originalUrl, "Image URL");

      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 8000);
      try {
        const resp = await fetch(originalUrl, { signal: ac.signal, redirect: "follow" });
        if (!resp.ok) {
          throw new AppError(`Remote image server responded with HTTP ${resp.status}`, 400, "IMAGE_FETCH_FAILED");
        }
        const arrayBuf = await resp.arrayBuffer();
        sourceBuffer = Buffer.from(arrayBuf);
      } catch (fetchErr: any) {
        if (fetchErr instanceof AppError) throw fetchErr;
        throw new AppError(`Failed to fetch remote image: ${fetchErr?.message || "Network error"}`, 400, "IMAGE_FETCH_FAILED");
      } finally {
        clearTimeout(timer);
      }
    } else {
      throw new AppError("Unsupported image URL scheme. Expected /uploads/... or http(s)://", 400, "INVALID_IMAGE_URL");
    }
  } else {
    throw new AppError("Image source is required (assetId, imageUrl, or imageBuffer)", 400, "MISSING_IMAGE_SOURCE");
  }

  // Validate buffer size
  if (!sourceBuffer || sourceBuffer.length === 0) {
    throw new AppError("Image source buffer is empty", 400, "EMPTY_IMAGE");
  }
  if (sourceBuffer.length > 25 * 1024 * 1024) {
    throw new AppError("Image size exceeds maximum limit of 25MB", 400, "IMAGE_TOO_LARGE");
  }

  // 3. Inspect image headers & validate using Sharp
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;

  let metadata: any;
  try {
    metadata = await sharp(sourceBuffer).metadata();
  } catch (err: any) {
    throw new AppError(`Invalid or corrupted image: ${err?.message || "Cannot parse image headers"}`, 400, "INVALID_IMAGE");
  }

  if (!metadata || !metadata.format) {
    throw new AppError("Invalid or unrecognizable image format", 400, "INVALID_IMAGE");
  }

  const originalFormat = metadata.format.toLowerCase();
  const supportedFormats = new Set(["jpeg", "jpg", "png", "webp", "gif", "avif", "tiff", "svg"]);
  if (!supportedFormats.has(originalFormat)) {
    throw new AppError(`Unsupported image format: ${originalFormat}`, 400, "UNSUPPORTED_FORMAT");
  }

  // Validate quality parameter (10 - 100, default: 80)
  let quality = 80;
  if (options.quality !== undefined) {
    const q = Number(options.quality);
    if (isNaN(q) || q < 10 || q > 100) {
      throw new AppError("Quality must be an integer between 10 and 100", 400, "INVALID_QUALITY");
    }
    quality = Math.round(q);
  }

  // 4. Construct Sharp optimization pipeline with proportional resizing
  let pipeline = sharp(sourceBuffer);

  if (options.maxWidth !== undefined || options.maxHeight !== undefined) {
    const w = options.maxWidth ? Number(options.maxWidth) : undefined;
    const h = options.maxHeight ? Number(options.maxHeight) : undefined;
    if ((w !== undefined && (isNaN(w) || w <= 0)) || (h !== undefined && (isNaN(h) || h <= 0))) {
      throw new AppError("Max width and height must be positive numbers", 400, "INVALID_DIMENSIONS");
    }
    // Proportional resize preserving aspect ratio without enlargement
    pipeline = pipeline.resize({
      width: w,
      height: h,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Feature 8: Preserve original image format by default where Sharp supports it
  const targetFormat = (options.format?.toLowerCase() || originalFormat);

  if (targetFormat === "jpeg" || targetFormat === "jpg") {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  } else if (targetFormat === "png") {
    pipeline = pipeline.png({ quality, compressionLevel: 9, effort: 7 });
  } else if (targetFormat === "webp") {
    pipeline = pipeline.webp({ quality });
  } else if (targetFormat === "avif") {
    pipeline = pipeline.avif({ quality });
  }

  // Execute compression
  let optimizedBuffer: Buffer;
  let info: any;
  try {
    const res = await pipeline.toBuffer({ resolveWithObject: true });
    optimizedBuffer = res.data;
    info = res.info;
  } catch (transErr: any) {
    throw new AppError(`Image processing failed: ${transErr?.message || "Sharp error"}`, 500, "OPTIMIZATION_PROCESSING_FAILED");
  }

  const originalBytes = sourceBuffer.length;
  const optimizedBytes = optimizedBuffer.length;
  const bytesSaved = Math.max(0, originalBytes - optimizedBytes);
  const savingsPercentage = originalBytes > 0 
    ? `${Math.round((bytesSaved / originalBytes) * 100)}%` 
    : "0%";

  // 5. Write output file to persistent storage
  const outExt = info.format === "jpeg" ? "jpg" : info.format;
  const fileName = `opt_${Date.now()}_${crypto.randomBytes(6).toString("hex")}.${outExt}`;
  const targetPath = resolveSafePath(getOptimizedDir(), fileName);
  await fs.promises.writeFile(targetPath, optimizedBuffer);
  const optimizedUrl = `/uploads/optimized/${fileName}`;

  // 6. Deduct 1 credit & register new MediaAsset (with atomic rollback on error)
  const newCredits = currentCredits - 1;
  let createdMediaAsset: any = null;

  try {
    // Deduct credit
    await db.user.update({
      where: { id: userId },
      data: { optimizationCredits: newCredits },
    });

    // Ledger record
    await db.optimizationCreditLedger.create({
      data: {
        userId,
        websiteId: websiteId || null,
        creditsUsed: 1,
        actionType: "IMAGE_OPTIMIZATION",
      },
    });

    // Register as new MediaAsset in Media Library (format: OPTIMIZED, original untouched)
    createdMediaAsset = await createMediaAsset({
      userId,
      websiteId: websiteId || undefined,
      filename: fileName,
      originalName: `optimized-${originalName}`,
      mimeType: `image/${info.format}`,
      sizeBytes: optimizedBytes,
      url: optimizedUrl,
      width: info.width,
      height: info.height,
      altText: options.altText || `Optimized ${originalName}`,
    });

    // Log to media_optimization_assets if websiteId exists
    if (websiteId) {
      try {
        await db.mediaOptimizationAsset.create({
          data: {
            websiteId,
            originalUrl,
            optimizedUrl,
            originalBytes,
            optimizedBytes,
            format: info.format,
            status: "OPTIMIZED",
          },
        });
      } catch (optAssetErr) {
        console.warn("[ImageOptimization] mediaOptimizationAsset log warning:", optAssetErr);
      }
    }

    return {
      assetId: createdMediaAsset.id,
      originalUrl,
      optimizedUrl,
      originalBytes,
      optimizedBytes,
      bytesSaved,
      savingsPercentage,
      format: info.format,
      width: info.width,
      height: info.height,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      remainingCredits: newCredits,
      asset: createdMediaAsset,
    };
  } catch (dbErr: any) {
    // Clean up physical file on disk to prevent orphaned storage
    if (fs.existsSync(targetPath)) {
      try {
        await fs.promises.unlink(targetPath);
      } catch {}
    }
    // Refund credit
    try {
      await db.user.update({
        where: { id: userId },
        data: { optimizationCredits: currentCredits },
      });
    } catch {}

    throw new AppError(
      `Failed to register optimized asset records: ${dbErr?.message || "Database error"}`,
      500,
      "OPTIMIZATION_DB_FAILED"
    );
  }
}

/**
 * Get optimization stats, savings breakdown, and remaining credits
 */
export async function getOptimizationStats(websiteId: string, userId: string) {
  await initOptimizationTables();
  await getWebsiteById(websiteId, userId);

  // 1. Fetch user credit balance
  let user: any = null;
  if (db?.user?.findUnique) {
    user = await db.user.findUnique({
      where: { id: userId },
      select: { optimizationCredits: true },
    });
  } else {
    const rows: any[] = await prisma.$queryRaw`
      SELECT "optimizationCredits" FROM users WHERE id = ${userId}::uuid
    `;
    user = rows[0];
  }
  const credits = user?.optimizationCredits ?? 250;

  // 2. Fetch media assets
  let assets: any[] = [];
  try {
    if (db?.mediaOptimizationAsset?.findMany) {
      assets = await db.mediaOptimizationAsset.findMany({
        where: { websiteId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    } else {
      assets = await prisma.$queryRaw`
        SELECT * FROM media_optimization_assets
        WHERE "websiteId" = ${websiteId}::uuid
        ORDER BY "createdAt" DESC
        LIMIT 50
      `;
    }
  } catch {
    assets = [];
  }

  const totalAssets = assets.length;
  const totalOriginalBytes = assets.reduce((acc, a) => acc + (a.originalBytes || 0), 0);
  const totalOptimizedBytes = assets.reduce((acc, a) => acc + (a.optimizedBytes || 0), 0);
  const totalBytesSaved = Math.max(0, totalOriginalBytes - totalOptimizedBytes);
  const totalMbSaved = parseFloat((totalBytesSaved / (1024 * 1024)).toFixed(2));
  const avgCompressionRatio = totalOriginalBytes > 0 
    ? `${Math.round((totalBytesSaved / totalOriginalBytes) * 100)}%` 
    : "0%";

  return {
    websiteId,
    remainingCredits: credits,
    totalImagesOptimized: totalAssets,
    totalMbSaved,
    avgCompressionRatio,
    recentAssets: assets.map((a) => ({
      id: a.id,
      originalUrl: a.originalUrl,
      optimizedUrl: a.optimizedUrl,
      originalBytes: a.originalBytes,
      optimizedBytes: a.optimizedBytes,
      bytesSaved: Math.max(0, a.originalBytes - a.optimizedBytes),
      format: a.format,
      createdAt: a.createdAt,
    })),
  };
}

export interface ConvertToWebpOptions {
  imageUrl?: string;
  imageBuffer?: Buffer;
  fileName?: string;
  assetId?: string;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  altText?: string;
}

export interface ConvertToWebpResult {
  assetId: string;
  originalUrl: string;
  convertedUrl: string;
  originalBytes: number;
  convertedBytes: number;
  bytesSaved: number;
  savingsPercentage: string;
  format: "webp";
  width?: number;
  height?: number;
  originalWidth?: number;
  originalHeight?: number;
  asset?: any;
}

/**
 * Convert a raster image to WebP (Feature 9)
 * - Safe asset retrieval and authorization
 * - Format inspection (rejects SVG, animated GIFs, unsupported formats)
 * - Configurable quality (10-100, default 80)
 * - Proportional resizing without enlargement
 * - Writes .webp to persistent storage (uploads/optimized/)
 * - Registers new MediaAsset (format: 'WEBP', mimeType: 'image/webp')
 * - Original image remains untouched
 * - Atomic cleanup of physical file if database registration fails
 */
export async function convertToWebp(
  websiteId: string | undefined | null,
  userId: string,
  options: ConvertToWebpOptions = {}
): Promise<ConvertToWebpResult> {
  await initOptimizationTables();

  // If websiteId is provided, verify website access
  if (websiteId) {
    await getWebsiteById(websiteId, userId);
  }

  // 1. Prepare source image buffer safely
  let sourceBuffer: Buffer;
  let originalUrl = options.imageUrl || "";
  let originalName = options.fileName || "image.png";
  let sourceAltText: string | null = options.altText || null;

  if (options.imageBuffer && options.imageBuffer.length > 0) {
    sourceBuffer = options.imageBuffer;
    if (!originalUrl) originalUrl = `/uploads/buffer-${Date.now()}.png`;
  } else if (options.assetId) {
    const asset = await getMediaAssetById(options.assetId, userId);
    originalUrl = asset.url;
    originalName = asset.originalName || asset.filename;
    sourceAltText = asset.altText || null;
    const diskPath = resolveMediaAssetFilePath(asset);
    if (!fs.existsSync(diskPath)) {
      throw new AppError("Source media file not found on storage", 404, "FILE_NOT_FOUND");
    }
    sourceBuffer = await fs.promises.readFile(diskPath);
  } else if (options.imageUrl && typeof options.imageUrl === "string") {
    originalUrl = options.imageUrl.trim();
    originalName = options.fileName || path.basename(originalUrl) || "image.png";

    if (originalUrl.startsWith("/uploads/") || originalUrl.startsWith("uploads/")) {
      const subPath = originalUrl.replace(/^\/?uploads\/?/, "");
      const diskPath = resolveSafePath(getUploadsDir(), subPath);
      if (!fs.existsSync(diskPath)) {
        throw new AppError("Local media file not found on storage", 404, "FILE_NOT_FOUND");
      }
      sourceBuffer = await fs.promises.readFile(diskPath);
    } else if (originalUrl.startsWith("http://") || originalUrl.startsWith("https://")) {
      validateSafeUrl(originalUrl, "Image URL");
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 8000);
      try {
        const resp = await fetch(originalUrl, { signal: ac.signal, redirect: "follow" });
        if (!resp.ok) {
          throw new AppError(`Remote image server responded with HTTP ${resp.status}`, 400, "IMAGE_FETCH_FAILED");
        }
        const arrayBuf = await resp.arrayBuffer();
        sourceBuffer = Buffer.from(arrayBuf);
      } catch (fetchErr: any) {
        if (fetchErr instanceof AppError) throw fetchErr;
        throw new AppError(`Failed to fetch remote image: ${fetchErr?.message || "Network error"}`, 400, "IMAGE_FETCH_FAILED");
      } finally {
        clearTimeout(timer);
      }
    } else {
      throw new AppError("Unsupported image URL scheme. Expected /uploads/... or http(s)://", 400, "INVALID_IMAGE_URL");
    }
  } else {
    throw new AppError("Image source is required (assetId, imageUrl, or imageBuffer)", 400, "MISSING_IMAGE_SOURCE");
  }

  // Validate buffer
  if (!sourceBuffer || sourceBuffer.length === 0) {
    throw new AppError("Image source buffer is empty", 400, "EMPTY_IMAGE");
  }
  if (sourceBuffer.length > 25 * 1024 * 1024) {
    throw new AppError("Image size exceeds maximum limit of 25MB", 400, "IMAGE_TOO_LARGE");
  }

  // 2. Inspect headers & metadata via Sharp
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;

  let metadata: any;
  try {
    metadata = await sharp(sourceBuffer).metadata();
  } catch (err: any) {
    throw new AppError(`Invalid or corrupted image: ${err?.message || "Cannot parse image headers"}`, 400, "INVALID_IMAGE");
  }

  if (!metadata || !metadata.format) {
    throw new AppError("Invalid or unrecognizable image format", 400, "INVALID_IMAGE");
  }

  const fmt = metadata.format.toLowerCase();

  // Reject SVG vector graphics per requirement
  if (fmt === "svg" || fmt === "svg+xml") {
    throw new AppError("SVG vector graphics cannot be converted to WebP raster format", 400, "UNSUPPORTED_FORMAT");
  }

  // Reject animated GIF if multiple pages/frames
  if (fmt === "gif" && metadata.pages && metadata.pages > 1) {
    throw new AppError("Animated GIF conversions to WebP are not supported", 400, "ANIMATED_GIF_NOT_SUPPORTED");
  }

  const supportedFormats = new Set(["jpeg", "jpg", "png", "webp", "gif", "avif", "tiff"]);
  if (!supportedFormats.has(fmt)) {
    throw new AppError(`Unsupported image format for WebP conversion: ${fmt}`, 400, "UNSUPPORTED_FORMAT");
  }

  // Validate quality (10 - 100, default: 80)
  let quality = 80;
  if (options.quality !== undefined) {
    const q = Number(options.quality);
    if (isNaN(q) || q < 10 || q > 100) {
      throw new AppError("Quality must be an integer between 10 and 100", 400, "INVALID_QUALITY");
    }
    quality = Math.round(q);
  }

  // 3. Build WebP pipeline
  let pipeline = sharp(sourceBuffer);

  if (options.maxWidth !== undefined || options.maxHeight !== undefined) {
    const w = options.maxWidth ? Number(options.maxWidth) : undefined;
    const h = options.maxHeight ? Number(options.maxHeight) : undefined;
    if ((w !== undefined && (isNaN(w) || w <= 0)) || (h !== undefined && (isNaN(h) || h <= 0))) {
      throw new AppError("Max width and height must be positive numbers", 400, "INVALID_DIMENSIONS");
    }
    pipeline = pipeline.resize({
      width: w,
      height: h,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  pipeline = pipeline.webp({ quality, effort: 4 });

  let convertedBuffer: Buffer;
  let info: any;
  try {
    const res = await pipeline.toBuffer({ resolveWithObject: true });
    convertedBuffer = res.data;
    info = res.info;
  } catch (transErr: any) {
    throw new AppError(`WebP conversion failed: ${transErr?.message || "Sharp error"}`, 500, "WEBP_PROCESSING_FAILED");
  }

  const originalBytes = sourceBuffer.length;
  const convertedBytes = convertedBuffer.length;
  const bytesSaved = Math.max(0, originalBytes - convertedBytes);
  const savingsPercentage = originalBytes > 0 && bytesSaved > 0
    ? `${Math.round((bytesSaved / originalBytes) * 100)}%`
    : "0%";

  // 4. Save to persistent storage
  const baseName = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, "_") || "image";
  const fileName = `webp_${Date.now()}_${crypto.randomBytes(6).toString("hex")}.webp`;
  const targetPath = resolveSafePath(getOptimizedDir(), fileName);
  await fs.promises.writeFile(targetPath, convertedBuffer);
  const convertedUrl = `/uploads/optimized/${fileName}`;

  // 5. Register in MediaAsset table (atomic rollback on error)
  let createdMediaAsset: any = null;
  try {
    createdMediaAsset = await createMediaAsset({
      userId,
      websiteId: websiteId || undefined,
      filename: fileName,
      originalName: `${baseName}.webp`,
      mimeType: "image/webp",
      sizeBytes: convertedBytes,
      url: convertedUrl,
      width: info.width,
      altText:
        options.altText !== undefined
          ? (typeof options.altText === "string" ? options.altText.trim() : null)
          : (sourceAltText !== undefined ? sourceAltText : null),
    });

    // Update format column in media_assets
    try {
      await db.mediaAsset.update({
        where: { id: createdMediaAsset.id },
        data: { format: "WEBP" },
      });
      createdMediaAsset.format = "WEBP";
    } catch {}

    // Record in media_optimization_assets if websiteId exists
    if (websiteId) {
      try {
        await db.mediaOptimizationAsset.create({
          data: {
            websiteId,
            originalUrl,
            optimizedUrl: convertedUrl,
            originalBytes,
            optimizedBytes: convertedBytes,
            format: "webp",
            status: "CONVERTED_WEBP",
          },
        });
      } catch (optErr) {}
    }

    return {
      assetId: createdMediaAsset.id,
      originalUrl,
      convertedUrl,
      originalBytes,
      convertedBytes,
      bytesSaved,
      savingsPercentage,
      format: "webp",
      width: info.width,
      height: info.height,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      asset: createdMediaAsset,
    };
  } catch (dbErr: any) {
    if (fs.existsSync(targetPath)) {
      try {
        await fs.promises.unlink(targetPath);
      } catch {}
    }
    throw new AppError(
      `Failed to register WebP converted asset: ${dbErr?.message || "Database error"}`,
      500,
      "WEBP_DB_FAILED"
    );
  }
}

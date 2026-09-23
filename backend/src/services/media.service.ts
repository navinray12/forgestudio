import fs from "fs";
import path from "path";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

const db = prisma as any;

/**
 * Ensure media_assets table exists in PostgreSQL
 */
export async function initMediaAssetTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS media_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "websiteId" UUID REFERENCES websites(id) ON DELETE SET NULL,
        filename VARCHAR(255) NOT NULL,
        "originalName" VARCHAR(255) NOT NULL,
        "mimeType" VARCHAR(100) NOT NULL,
        "sizeBytes" INTEGER NOT NULL,
        url VARCHAR(1000) NOT NULL,
        width INTEGER,
        height INTEGER,
        "altText" VARCHAR(500),
        format VARCHAR(50) NOT NULL DEFAULT 'ORIGINAL',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON media_assets("userId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_media_assets_website_id ON media_assets("websiteId");
    `);

    // Additive column checks
    await prisma.$executeRawUnsafe(`
      ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS "altText" VARCHAR(500);
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS width INTEGER;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS height INTEGER;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS format VARCHAR(50) DEFAULT 'ORIGINAL';
    `);
  } catch (error) {
    console.error("Media assets table initialization log:", error);
  }
}

// Auto-run table initialization
initMediaAssetTable();

/**
 * Parse image dimensions from buffer headers without requiring native C++ binary dependencies
 */
export function extractImageDimensions(
  buffer: Buffer,
  mimeType: string
): { width?: number; height?: number } {
  try {
    if (!buffer || buffer.length < 16) return {};

    // 1. PNG: 8-byte signature, then IHDR chunk (length 4, type 4, width 4 BE, height 4 BE)
    if (
      mimeType === "image/png" ||
      (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)
    ) {
      if (buffer.length >= 24) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }
    }

    // 2. GIF: GIF87a or GIF89a
    if (
      mimeType === "image/gif" ||
      (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46)
    ) {
      if (buffer.length >= 10) {
        const width = buffer.readUInt16LE(6);
        const height = buffer.readUInt16LE(8);
        return { width, height };
      }
    }

    // 3. WebP: RIFF ... WEBP
    if (
      mimeType === "image/webp" ||
      (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46)
    ) {
      // VP8 chunk
      if (buffer.toString("ascii", 12, 16) === "VP8 ") {
        if (buffer.length >= 30) {
          const width = buffer.readUInt16LE(26) & 0x3fff;
          const height = buffer.readUInt16LE(28) & 0x3fff;
          return { width, height };
        }
      }
      // VP8L chunk (lossless)
      if (buffer.toString("ascii", 12, 16) === "VP8L") {
        if (buffer.length >= 25) {
          const b1 = buffer[21];
          const b2 = buffer[22];
          const b3 = buffer[23];
          const b4 = buffer[24];
          const width = 1 + (((b2 & 0x3f) << 8) | b1);
          const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
          return { width, height };
        }
      }
      // VP8X chunk (extended)
      if (buffer.toString("ascii", 12, 16) === "VP8X") {
        if (buffer.length >= 30) {
          const width = 1 + buffer.readUIntLE(24, 3);
          const height = 1 + buffer.readUIntLE(27, 3);
          return { width, height };
        }
      }
    }

    // 4. JPEG: Starts with 0xFFD8, scan for SOF0 (0xFFC0) or SOF2 (0xFFC2)
    if (
      mimeType === "image/jpeg" ||
      mimeType === "image/jpg" ||
      (buffer[0] === 0xff && buffer[1] === 0xd8)
    ) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        // SOF markers: 0xC0 (baseline), 0xC1, 0xC2 (progressive)
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        // Advance by segment length
        const segmentLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
      }
    }

    // 5. SVG: Text match viewBox="minX minY width height" or width="X" height="Y"
    if (mimeType === "image/svg+xml" || buffer.toString("utf8", 0, 100).includes("<svg")) {
      const text = buffer.toString("utf8", 0, Math.min(buffer.length, 2048));
      const viewBoxMatch = text.match(/viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.-]+)\s+([\d.-]+)/i);
      if (viewBoxMatch) {
        return {
          width: Math.round(parseFloat(viewBoxMatch[1])),
          height: Math.round(parseFloat(viewBoxMatch[2])),
        };
      }
      const wMatch = text.match(/width=["']([\d.-]+)(?:px)?["']/i);
      const hMatch = text.match(/height=["']([\d.-]+)(?:px)?["']/i);
      if (wMatch && hMatch) {
        return {
          width: Math.round(parseFloat(wMatch[1])),
          height: Math.round(parseFloat(hMatch[1])),
        };
      }
    }
  } catch (err) {
    console.warn("Error parsing image dimensions:", err);
  }
  return {};
}

export interface CreateMediaAssetInput {
  userId: string;
  websiteId?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  width?: number;
  height?: number;
  altText?: string;
}

/**
 * Persist a new media asset record
 */
export async function createMediaAsset(input: CreateMediaAssetInput) {
  const {
    userId,
    websiteId,
    filename,
    originalName,
    mimeType,
    sizeBytes,
    url,
    width,
    height,
    altText,
  } = input;

  if (!userId || !filename || !url) {
    throw new AppError("Missing required media asset fields", 400, "INVALID_MEDIA_ASSET");
  }

  const asset = await db.mediaAsset.create({
    data: {
      userId,
      websiteId: websiteId || null,
      filename,
      originalName: originalName || filename,
      mimeType: mimeType || "application/octet-stream",
      sizeBytes: sizeBytes || 0,
      url,
      width: width || null,
      height: height || null,
      altText: altText || null,
    },
  });

  return asset;
}

/**
 * List media assets with tenant isolation
 */
export async function listMediaAssets(
  userId: string,
  options: {
    websiteId?: string;
    search?: string;
    mimeType?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 50));
  const skip = (page - 1) * limit;

  const where: any = { userId };

  if (options.websiteId) {
    where.OR = [{ websiteId: options.websiteId }, { websiteId: null }];
  }

  if (options.mimeType) {
    where.mimeType = { startsWith: options.mimeType };
  }

  if (options.search && options.search.trim().length > 0) {
    const q = options.search.trim();
    where.AND = [
      {
        OR: [
          { originalName: { contains: q, mode: "insensitive" } },
          { altText: { contains: q, mode: "insensitive" } },
          { filename: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const [assets, total] = await Promise.all([
    db.mediaAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.mediaAsset.count({ where }),
  ]);

  return {
    assets,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single media asset by ID with tenant verification
 */
export async function getMediaAssetById(id: string, userId: string) {
  const asset = await db.mediaAsset.findFirst({
    where: { id, userId },
  });

  if (!asset) {
    throw new AppError("Media asset not found", 404, "MEDIA_NOT_FOUND");
  }

  return asset;
}

/**
 * Update media asset metadata (altText, etc.)
 */
export async function updateMediaAsset(
  id: string,
  userId: string,
  data: { altText?: string; websiteId?: string }
) {
  // Ensure ownership
  await getMediaAssetById(id, userId);

  const updated = await db.mediaAsset.update({
    where: { id },
    data: {
      altText: data.altText !== undefined ? data.altText : undefined,
      websiteId: data.websiteId !== undefined ? data.websiteId : undefined,
    },
  });

  return updated;
}

/**
 * Delete media asset and remove file from disk
 */
export async function deleteMediaAsset(id: string, userId: string) {
  const asset = await getMediaAssetById(id, userId);

  await db.mediaAsset.delete({
    where: { id },
  });

  // Attempt to delete physical file from disk if under local uploads
  try {
    const uploadsDir = path.resolve(process.cwd(), "public/uploads");
    const filePath = path.join(uploadsDir, asset.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (fsErr) {
    console.warn("Could not delete physical media file from disk:", fsErr);
  }

  return { success: true };
}

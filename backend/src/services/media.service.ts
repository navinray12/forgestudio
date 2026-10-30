import fs from "fs";
import path from "path";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getWebsiteById } from "./website.service.js";
import { resolveMediaAssetFilePath } from "../config/storage.config.js";

const db = prisma as any;

/**
 * Ensure media_assets table exists in PostgreSQL (Managed via Prisma migrations)
 */
export async function initMediaAssetTable() {
  // Database schema and tables are strictly managed via versioned Prisma migrations
  return;
}

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
  altText?: string | null;
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

  // Verify website ownership/access if associated with a website
  if (websiteId) {
    await getWebsiteById(websiteId, userId);
  }

  let sanitizedAltText: string | null = null;
  if (altText !== undefined && altText !== null) {
    if (typeof altText === "string") {
      const trimmed = altText.trim();
      if (trimmed.length > 500) {
        throw new AppError("Alt text must not exceed 500 characters", 400, "INVALID_ALT_TEXT");
      }
      sanitizedAltText = trimmed;
    } else {
      throw new AppError("Alt text must be a valid string or null", 400, "INVALID_ALT_TEXT");
    }
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
      altText: sanitizedAltText,
    },
  });

  return asset;
}

/**
 * List media assets with tenant isolation and website authorization
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

  const rawWebsiteId = typeof options.websiteId === "string" ? options.websiteId.trim() : undefined;
  const targetWebsiteId =
    rawWebsiteId && rawWebsiteId !== "undefined" && rawWebsiteId !== "null" && rawWebsiteId !== ""
      ? rawWebsiteId
      : undefined;

  // Verify website access if websiteId is requested
  if (targetWebsiteId) {
    await getWebsiteById(targetWebsiteId, userId);
  }

  const where: any = { userId };

  if (targetWebsiteId) {
    where.OR = [{ websiteId: targetWebsiteId }, { websiteId: null }];
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
  data: { altText?: string | null; websiteId?: string | null }
) {
  // Ensure ownership
  await getMediaAssetById(id, userId);

  // If reassigning website, ensure requester has access to target website
  if (data.websiteId) {
    await getWebsiteById(data.websiteId, userId);
  }

  let sanitizedAltText: string | null | undefined = undefined;
  if (data.altText !== undefined) {
    if (data.altText === null) {
      sanitizedAltText = null;
    } else if (typeof data.altText === "string") {
      const trimmed = data.altText.trim();
      if (trimmed.length > 500) {
        throw new AppError("Alt text must not exceed 500 characters", 400, "INVALID_ALT_TEXT");
      }
      sanitizedAltText = trimmed;
    } else {
      throw new AppError("Alt text must be a valid string or null", 400, "INVALID_ALT_TEXT");
    }
  }

  const updated = await db.mediaAsset.update({
    where: { id },
    data: {
      altText: sanitizedAltText !== undefined ? sanitizedAltText : undefined,
      websiteId: data.websiteId !== undefined ? data.websiteId : undefined,
    },
  });

  return updated;
}

/**
 * Delete media asset safely:
 * 1. Verifies ownership.
 * 2. Checks whether asset URL or filename is actively referenced in website editorData.
 *    Throws 409 ASSET_IN_USE if referenced (unless force: true is explicitly requested).
 * 3. Removes the physical file from the actual upload directory (uploads/images/).
 * 4. Ensures DB record is only removed if physical deletion succeeds (or file already missing).
 */
export async function deleteMediaAsset(
  id: string,
  userId: string,
  options: { force?: boolean } = {}
) {
  const asset = await getMediaAssetById(id, userId);

  // 1. Reference Check: Protect websites from broken assets
  const referencingWebsites: any[] = await prisma.$queryRaw`
    SELECT id, name, slug
    FROM websites
    WHERE ("editorData"::text LIKE ${'%' + asset.url + '%'}
       OR "editorData"::text LIKE ${'%' + asset.filename + '%'})
    LIMIT 5
  `;

  if (referencingWebsites.length > 0 && !options.force) {
    const siteNames = referencingWebsites.map((w) => w.name || w.slug).join(", ");
    throw new AppError(
      `Cannot delete media asset "${asset.originalName || asset.filename}" because it is currently used by website(s): ${siteNames}. Remove it from the website first or force deletion.`,
      409,
      "ASSET_IN_USE"
    );
  }

  // 2. Resolve Physical File Path under configured persistent uploads directory
  let resolvedFilePath: string;
  try {
    resolvedFilePath = resolveMediaAssetFilePath(asset);
  } catch (pathErr: any) {
    throw new AppError(
      `Invalid storage path or unsafe filename for asset: ${pathErr?.message}`,
      400,
      "INVALID_STORAGE_PATH"
    );
  }

  // 3. Physical cleanup first: If physical deletion throws unexpectedly, abort to keep DB consistent
  if (fs.existsSync(resolvedFilePath)) {
    try {
      fs.unlinkSync(resolvedFilePath);
    } catch (fsErr: any) {
      console.error("[Media Service] Failed to delete physical media file from disk:", fsErr);
      throw new AppError(
        `Failed to delete physical media file from storage: ${fsErr?.message || "Disk I/O error"}`,
        500,
        "STORAGE_DELETE_FAILED"
      );
    }
  } else {
    // Missing file handled safely: Log notice and allow DB cleanup so orphaned records can be removed
    console.warn(`[Media Service] Physical file missing during deletion (${resolvedFilePath}), proceeding with DB cleanup.`);
  }

  // 4. Delete Database Record once physical cleanup is confirmed
  await db.mediaAsset.delete({
    where: { id },
  });

  return { success: true };
}

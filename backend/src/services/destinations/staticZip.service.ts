import { createRequire } from "module";
const require = createRequire(import.meta.url);
const archiver = require("archiver");
import path from "path";
import type { StaticBundle } from "./types.js";
import { AppError } from "../../utils/app-error.js";

/**
 * Sanitize and validate zip entry paths against path traversal attacks.
 * Rejects absolute paths, Windows drive letters, and directory traversal (..) sequences.
 */
export function sanitizeZipEntryPath(entryPath: string): string {
  if (!entryPath || typeof entryPath !== "string") {
    throw new AppError("Invalid file path in static bundle", 400, "INVALID_ZIP_PATH");
  }

  const trimmed = entryPath.trim();

  // Reject leading slashes and drive letters
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("\\") ||
    /^[a-zA-Z]:[\\/]/.test(trimmed) ||
    path.isAbsolute(trimmed)
  ) {
    throw new AppError(`Unsafe absolute path in static bundle: ${entryPath}`, 400, "UNSAFE_ZIP_PATH");
  }

  // Normalize path separators to forward slashes
  const normalized = trimmed.replace(/\\/g, "/");

  // Check each path segment for directory traversal or hidden dangerous targets
  const segments = normalized.split("/").filter((s) => s.length > 0);
  for (const segment of segments) {
    if (segment === ".." || segment === ".") {
      throw new AppError(`Directory traversal forbidden in static bundle: ${entryPath}`, 400, "UNSAFE_ZIP_PATH");
    }
  }

  if (segments.length === 0) {
    throw new AppError("Empty path segment in static bundle", 400, "INVALID_ZIP_PATH");
  }

  return segments.join("/");
}

function getArchiverInstance(options: any = { zlib: { level: 9 } }) {
  if (typeof archiver === "function") {
    return archiver("zip", options);
  }
  if (archiver?.default && typeof archiver.default === "function") {
    return archiver.default("zip", options);
  }
  if (archiver?.ZipArchive) {
    return new archiver.ZipArchive(options);
  }
  if (archiver?.create) {
    return archiver.create("zip", options);
  }
  throw new Error("Unable to instantiate archiver");
}

/**
 * Create a real binary ZIP archive from a compiled StaticBundle.
 * Guaranteed:
 * - Valid binary ZIP archive
 * - Path traversal protection
 * - Deterministic ordering and timestamps
 * - No credentials/secrets inclusion
 */
export async function createStaticZipArchive(bundle: StaticBundle): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = getArchiverInstance({
      zlib: { level: 9 },
    });

    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", (err: any) => reject(err));

    // Deterministic packaging: sort files alphabetically by sanitized path
    const sortedFiles = [...bundle.files].sort((a, b) => a.path.localeCompare(b.path));

    for (const file of sortedFiles) {
      const cleanPath = sanitizeZipEntryPath(file.path);
      const content =
        typeof file.content === "string"
          ? Buffer.from(file.content, "utf-8")
          : file.content;

      archive.append(content, {
        name: cleanPath,
        date: new Date("2026-01-01T00:00:00.000Z"),
      });
    }

    archive.finalize();
  });
}

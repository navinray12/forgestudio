import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Determine the root upload directory:
 * 1. Honors process.env.UPLOAD_DIR or process.env.MEDIA_STORAGE_PATH if explicitly configured.
 * 2. If running locally without configuration, resolves consistently regardless of whether the
 *    Node process was launched from the repository root or the backend subdirectory.
 */
export function getUploadsDir(): string {
  const envUploadDir = process.env.UPLOAD_DIR?.trim() || process.env.MEDIA_STORAGE_PATH?.trim();
  if (envUploadDir) {
    return path.resolve(envUploadDir);
  }

  // Check if cwd already has an "uploads" directory
  const cwdUploads = path.resolve(process.cwd(), "uploads");
  if (fs.existsSync(cwdUploads)) {
    return cwdUploads;
  }

  // Check if process was launched from repository root (where backend/uploads exists)
  const repoBackendUploads = path.resolve(process.cwd(), "backend", "uploads");
  if (fs.existsSync(repoBackendUploads)) {
    return repoBackendUploads;
  }

  // Infer based on the current module's file location (__dirname of storage.config.ts is backend/src/config)
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const inferredBackendUploads = path.resolve(currentDir, "..", "..", "uploads");
    if (fs.existsSync(inferredBackendUploads)) {
      return inferredBackendUploads;
    }
  } catch {
    // Ignore error if import.meta is unavailable
  }

  // Default fallback: return cwd/uploads (will be created if missing)
  return cwdUploads;
}

/**
 * Returns the directory for uploaded image assets: <uploadsDir>/images
 */
export function getImagesDir(): string {
  return path.join(getUploadsDir(), "images");
}

/**
 * Returns the directory for website backups: <uploadsDir>/backups
 */
export function getBackupsDir(): string {
  return path.join(getUploadsDir(), "backups");
}

/**
 * Returns the directory for optimized images: <uploadsDir>/optimized
 */
export function getOptimizedImagesDir(): string {
  return path.join(getUploadsDir(), "optimized");
}

/**
 * Validate that a target path resides strictly inside baseDir (path traversal defense)
 */
export function isSafeSubpath(baseDir: string, targetPath: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedBase, resolvedTarget);
  // Ensure the relative path does not navigate outside baseDir and is not an absolute drive root
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

/**
 * Resolves a filename or subpath against a base directory, throwing an error if traversal is attempted.
 */
export function resolveSafePath(baseDir: string, relativeOrUnsafePath: string): string {
  // Strip dangerous path prefixes or normalize separators
  const cleanSubPath = relativeOrUnsafePath.replace(/^[/\\]+/, "");
  const target = path.resolve(baseDir, cleanSubPath);
  if (!isSafeSubpath(baseDir, target)) {
    throw new Error(`Path traversal attempt detected: ${relativeOrUnsafePath}`);
  }
  return target;
}

/**
 * Safely resolves the absolute physical filesystem path for a media asset.
 * Uses path.basename on asset.filename to prevent directory traversal and verifies containment inside getImagesDir().
 */
export function resolveMediaAssetFilePath(asset: { url?: string; filename?: string }): string {
  const imagesDir = getImagesDir();
  const optimizedDir = getOptimizedImagesDir();
  
  // Extract base filename from filename property or URL
  const candidateName = asset.filename || (asset.url ? path.basename(asset.url) : "");
  const cleanFilename = path.basename(candidateName.trim());

  if (!cleanFilename || cleanFilename === "." || cleanFilename === "..") {
    throw new Error("Invalid media asset filename");
  }

  // Check if asset is inside optimized directory
  if (asset.url?.includes("/optimized/")) {
    const optPath = resolveSafePath(optimizedDir, cleanFilename);
    if (fs.existsSync(optPath)) return optPath;
  }

  const standardPath = resolveSafePath(imagesDir, cleanFilename);
  if (fs.existsSync(standardPath)) return standardPath;

  const fallbackOptPath = resolveSafePath(optimizedDir, cleanFilename);
  if (fs.existsSync(fallbackOptPath)) return fallbackOptPath;

  return standardPath;
}

/**
 * Ensure all standard storage subdirectories exist recursively on disk.
 */
export function ensureStorageDirectories(): void {
  const dirs = [getUploadsDir(), getImagesDir(), getBackupsDir(), getOptimizedImagesDir()];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.warn(`[Storage Config] Could not create directory ${dir}:`, err);
      }
    }
  }
}

// Auto-ensure base storage directories exist on module load
ensureStorageDirectories();

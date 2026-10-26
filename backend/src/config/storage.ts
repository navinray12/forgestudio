import path from "node:path";

export function getUploadRoot(): string {
  return path.resolve(process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), "uploads"));
}

export function getImageUploadDirectory(): string {
  return path.join(getUploadRoot(), "images");
}

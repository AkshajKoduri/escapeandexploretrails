export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";
const IMAGE_TYPES = new Set(IMAGE_ACCEPT.split(","));
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

export function validateImageUpload(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!IMAGE_TYPES.has(file.type) || !IMAGE_EXTENSIONS.has(extension)) return "Choose a JPG, PNG, WebP, GIF, or AVIF image.";
  if (file.size === 0) return "This image is empty. Choose a different file.";
  if (file.size > 10 * 1024 * 1024) return "Images must be 10 MB or smaller.";
  return null;
}

export function imageStoragePath(prefix: string, file: File): string {
  return `${prefix}/${crypto.randomUUID()}.${file.name.split(".").pop()!.toLowerCase()}`;
}

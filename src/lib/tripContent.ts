export type TripPhoto = { id: string; url: string; path: string | null; alt: string };

export function normalizeAssemblyTime(value: string | null | undefined): string | null {
  const time = value?.trim();
  return !time || /^n\/?a$/i.test(time) ? null : time;
}

export function normalizeHighlights(value: unknown): string[] {
  return Array.isArray(value) ? value.flatMap((item) => typeof item === "string" && item.trim() ? [item.trim()] : []) : [];
}

export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function normalizeTripPhotos(value: unknown): TripPhoto[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const url = safeHttpUrl(item.url);
    if (!url) return [];
    return [{ id: typeof item.id === "string" ? item.id : `photo-${index}`, url,
      path: typeof item.path === "string" ? item.path : null, alt: typeof item.alt === "string" ? item.alt.trim() : "" }];
  });
}

export function validateTripImage(file: File): string | null {
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) return "Choose a JPEG, PNG, WebP or AVIF image.";
  if (!file.size || file.size > 10 * 1024 * 1024) return "Images must be non-empty and no larger than 10MB.";
  return null;
}

import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "e2_admin_token";
const EXP_KEY = "e2_admin_token_exp";

/** The raw password is never stored — only the server-issued session token. */
export function setAdminSession(token: string, expiresAt: number) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EXP_KEY, String(expiresAt));
}

export function clearAdminSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXP_KEY);
}

export function getAdminToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const exp = Number(sessionStorage.getItem(EXP_KEY) ?? 0);
  if (!token || !exp || Date.now() >= exp) {
    if (token) clearAdminSession();
    return null;
  }
  return token;
}

export function isAdminSession(): boolean {
  return !!getAdminToken();
}

/** Exchange the admin password for a short-lived session token. */
export async function adminLogin(password: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body: { action: "login", payload: { password } },
  });
  if (error) {
    const status = (error as any)?.context?.status;
    if (status === 429) throw new Error("Too many attempts. Please try again later.");
    throw new Error("Invalid password");
  }
  if (!data?.token) throw new Error("Invalid password");
  setAdminSession(data.token, Number(data.expiresAt));
}

export async function adminLogout() {
  try {
    await adminApi("logout");
  } catch {
    /* token may already be gone */
  }
  clearAdminSession();
}

export async function adminApi<T = any>(action: string, payload?: any): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body: { action, payload },
    headers: { "x-admin-token": token },
  });
  if (error) {
    // Session bad or expired — clear so the user is re-prompted.
    if ((error as any)?.context?.status === 401) clearAdminSession();
    throw new Error(error.message || "Admin request failed");
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as T;
}

/** Convert a File to base64 (no data-URL prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export type AdminBucket = "trek-images" | "itineraries" | "gallery-images" | "trail-log-pdfs" | "team-photos";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const BUCKET_TYPES: Record<AdminBucket, string[]> = {
  "trek-images": IMAGE_TYPES,
  "gallery-images": IMAGE_TYPES,
  "team-photos": IMAGE_TYPES,
  itineraries: ["application/pdf"],
  "trail-log-pdfs": ["application/pdf"],
};

export async function adminUpload(
  bucket: AdminBucket,
  path: string,
  file: File,
  upsert = false,
): Promise<{ path: string; publicUrl: string | null }> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File too large (max 10 MB)");
  const allowed = BUCKET_TYPES[bucket];
  if (file.type && !allowed.includes(file.type.toLowerCase())) {
    throw new Error(allowed[0] === "application/pdf" ? "Please upload a PDF file" : "Please upload an image file");
  }
  const base64 = await fileToBase64(file);
  return adminApi("uploadFile", {
    bucket,
    path,
    base64,
    contentType: file.type,
    upsert,
  });
}

export async function adminRemove(bucket: AdminBucket, path: string) {
  return adminApi("removeFile", { bucket, path });
}

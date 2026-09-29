import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "e2_admin_token";
const TOKEN_EXPIRY_KEY = "e2_admin_token_expires_at";
const LEGACY_PASSWORD_KEY = "e2_admin_pwd";

type AdminLoginResponse = {
  token: string;
  expiresAt: number;
};

function storeAdminSession({ token, expiresAt }: AdminLoginResponse) {
  sessionStorage.removeItem(LEGACY_PASSWORD_KEY);
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(expiresAt));
}

export function clearAdminSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(LEGACY_PASSWORD_KEY);
}

export function getAdminToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY));
  if (!token || !Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    clearAdminSession();
    return null;
  }
  return token;
}

export function isAdminSession(): boolean {
  return !!getAdminToken();
}

export async function loginAdmin(password: string): Promise<void> {
  clearAdminSession();
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body: { action: "login", payload: { password } },
  });
  if (error) throw new Error(error.message || "Admin login failed");
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  if (
    !data ||
    typeof data !== "object" ||
    typeof data.token !== "string" ||
    !data.token ||
    typeof data.expiresAt !== "number" ||
    !Number.isFinite(data.expiresAt)
  ) {
    throw new Error("Invalid admin login response");
  }
  storeAdminSession(data as AdminLoginResponse);
}

export async function adminApi<T = unknown>(action: string, payload?: unknown): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body: { action, payload },
    headers: { "x-admin-token": token },
  });
  if (error) {
    // Session likely bad — clear so the user is re-prompted.
    if ((error as { context?: { status?: number } })?.context?.status === 401) {
      clearAdminSession();
    }
    let message = error.message || "Admin request failed";
    const context = (error as { context?: { json?: () => Promise<{ error?: unknown }> } }).context;
    try {
      const body = await context?.json?.();
      if (body?.error) message = String(body.error);
    } catch { /* Retain the transport error when there is no JSON response. */ }
    throw new Error(message);
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

export async function adminUpload(
  bucket: AdminBucket,
  path: string,
  file: File,
  upsert = false,
): Promise<{ path: string; publicUrl: string | null }> {
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

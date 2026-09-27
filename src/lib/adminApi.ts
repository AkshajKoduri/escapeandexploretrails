import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "e2_admin_token";

function setAdminToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminPassword() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem("e2_admin_pwd");
}

function getAdminToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function isAdminSession(): boolean {
  return !!getAdminToken();
}

export async function adminLogin(password: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body: { action: "login", payload: { password } },
  });
  if (error) throw new Error(error.message || "Admin login failed");
  if (!data || typeof data.token !== "string") {
    throw new Error(String(data?.error || "Admin login failed"));
  }
  setAdminToken(data.token);
}

export async function adminApi<T = any>(action: string, payload?: any): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body: { action, payload },
    headers: { "x-admin-token": token },
  });
  if (error) {
    // Session likely bad — clear so the user is re-prompted.
    if ((error as any)?.context?.status === 401) clearAdminPassword();
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

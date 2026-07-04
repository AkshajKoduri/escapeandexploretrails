import { supabase } from "@/integrations/supabase/client";

const PWD_KEY = "e2_admin_pwd";

export function setAdminPassword(pwd: string) {
  sessionStorage.setItem(PWD_KEY, pwd);
}

export function clearAdminPassword() {
  sessionStorage.removeItem(PWD_KEY);
}

export function getAdminPassword(): string | null {
  return sessionStorage.getItem(PWD_KEY);
}

export function isAdminSession(): boolean {
  return !!sessionStorage.getItem(PWD_KEY);
}

export async function adminApi<T = any>(action: string, payload?: any): Promise<T> {
  const pwd = getAdminPassword();
  if (!pwd) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body: { action, payload },
    headers: { "x-admin-password": pwd },
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

export async function adminUpload(
  bucket: "trek-images" | "itineraries",
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

export async function adminRemove(bucket: "trek-images" | "itineraries", path: string) {
  return adminApi("removeFile", { bucket, path });
}

import { supabase } from "@/integrations/supabase/client";

/**
 * All anonymous writes go through the rate-limited, server-validated
 * `public-api` edge function — never straight to the database.
 */
export async function publicApi<T = any>(action: string, payload: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke("public-api", {
    body: { action, payload },
  });
  if (error) {
    const status = (error as any)?.context?.status;
    if (status === 429) throw new Error("Too many requests. Please wait a moment and try again.");
    // Surface the server's validation message when there is one.
    let message = error.message || "Request failed";
    try {
      const body = await (error as any)?.context?.json?.();
      if (body?.error) message = String(body.error);
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }
  if (data && typeof data === "object" && "error" in data && (data as any).error) {
    throw new Error(String((data as any).error));
  }
  return data as T;
}

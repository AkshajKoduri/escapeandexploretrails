// Durable sliding-window rate limiter.
//
// Edge-function isolates are short lived and requests are spread across many
// of them, so an in-memory counter never sees enough traffic to trigger.
// State therefore lives in the database (`public.rate_limit_hits`) and is
// evaluated atomically by the `check_rate_limit` SQL function, which makes the
// limit hold across every isolate.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!client) {
    client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  try {
    const { data, error } = await db().rpc("check_rate_limit", {
      _key: key,
      _limit: limit,
      _window_seconds: Math.ceil(windowMs / 1000),
    });
    if (error) throw error;
    const r = data as { allowed: boolean; remaining: number; retry_after: number };
    return { allowed: !!r.allowed, remaining: r.remaining ?? 0, retryAfter: r.retry_after ?? 1 };
  } catch (_err) {
    // Fail open on infrastructure errors so a database hiccup can't take the
    // public forms offline. The action itself is still fully validated.
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
}

/** Clear a key's history (e.g. after a successful login). */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await db().rpc("reset_rate_limit", { _key: key });
  } catch (_err) {
    // best effort
  }
}

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "unknown";
}

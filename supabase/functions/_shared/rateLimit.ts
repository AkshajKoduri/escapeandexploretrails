// Simple in-memory sliding-window rate limiter.
// Scope: per edge-function instance (not distributed). Adequate for this
// traffic level; it stops scripted spam / brute force from a single client.

type Bucket = number[]; // timestamps (ms)

const store = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number, maxWindow: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of store) {
    if (v.length === 0 || now - v[v.length - 1] > maxWindow) store.delete(k);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);
  const hits = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    store.set(key, hits);
    const retryAfter = Math.ceil((windowMs - (now - hits[0])) / 1000);
    return { allowed: false, remaining: 0, retryAfter: Math.max(retryAfter, 1) };
  }
  hits.push(now);
  store.set(key, hits);
  return { allowed: true, remaining: limit - hits.length, retryAfter: 0 };
}

/** Clear a key's history (e.g. after a successful login). */
export function resetRateLimit(key: string) {
  store.delete(key);
}

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "unknown";
}

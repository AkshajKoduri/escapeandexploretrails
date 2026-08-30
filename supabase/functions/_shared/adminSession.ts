// Signed, short-lived admin session tokens (HMAC-SHA256).
// Format: base64url(payloadJson).base64url(signature)

const SECRET = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";
const TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key(): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Constant-time string comparison (length-safe). */
export function timingSafeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // Compare a fixed-size digest so differing lengths don't leak via early exit.
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

export async function issueToken(): Promise<{ token: string; expiresAt: number }> {
  if (!SECRET) throw new Error("Session secret not configured");
  const expiresAt = Date.now() + TTL_MS;
  const payload = b64url(enc.encode(JSON.stringify({ sub: "admin", exp: expiresAt, jti: crypto.randomUUID() })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), enc.encode(payload)));
  return { token: `${payload}.${b64url(sig)}`, expiresAt };
}

export async function verifyToken(token: string | null): Promise<{ valid: boolean; jti?: string }> {
  if (!SECRET || !token) return { valid: false };
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false };
  const [payload, sig] = parts;
  let ok = false;
  try {
    ok = await crypto.subtle.verify("HMAC", await key(), fromB64url(sig), enc.encode(payload));
  } catch {
    return { valid: false };
  }
  if (!ok) return { valid: false };
  try {
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (data?.sub !== "admin" || typeof data?.exp !== "number" || Date.now() > data.exp) {
      return { valid: false };
    }
    return { valid: true, jti: String(data.jti ?? "") };
  } catch {
    return { valid: false };
  }
}

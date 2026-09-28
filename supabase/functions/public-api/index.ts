// Public write API: the only path for anonymous submissions.
// Rate limited per IP and fully validated server-side; runs with the service
// role so the underlying tables need no anonymous insert grants.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { clientIp, rateLimit } from "../_shared/rateLimit.ts";
import { galleryUrlsPayload, publicBookingPayload, publicCallbackPayload, z } from "../_shared/validation.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, ...extra, "content-type": "application/json" },
  });

const parse = <T>(schema: z.ZodType<T>, payload: unknown): T => {
  const r = schema.safeParse(payload);
  if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Invalid input");
  return r.data;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = clientIp(req);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const { action, payload = {} } = body ?? {};

  // Read-only actions get their own, looser bucket; writes stay tightly limited.
  const readOnly = action === "galleryUrls";
  const limited = readOnly
    ? await rateLimit(`public-read:${ip}`, 60, 60_000)
    : await rateLimit(`public:${ip}`, 5, 60_000);
  if (!limited.allowed) {
    return json(
      { error: "Too many requests. Please wait a moment and try again." },
      429,
      { "retry-after": String(limited.retryAfter) },
    );
  }


  try {
    switch (action) {
      case "createCallbackRequest": {
        const p = parse(publicCallbackPayload, payload);
        const { error } = await supabase.from("callback_requests").insert({
          trip_id: p.trip_id ?? null,
          trip_name: p.trip_name ?? null,
          full_name: p.full_name,
          email: p.email || null,
          mobile_number: p.mobile_number,
          preferred_time: p.preferred_time || null,
        });
        if (error) throw error;
        return json({ ok: true });
      }

      case "createBooking": {
        const p = parse(publicBookingPayload, payload);
        const { data, error } = await supabase.rpc("create_booking_v2", {
          p_trek_id: p.trek_id,
          p_trek_date: p.trek_date,
          p_name: p.primary_name,
          p_phone: p.primary_phone,
          p_email: p.primary_email || null,
          p_age: p.primary_age ?? null,
          p_gender: p.primary_gender ?? null,
          p_members: p.members,
          p_package_id: p.package_id ?? null,
          p_client_ref: crypto.randomUUID(),
        });
        if (error) throw error;
        return json(data);
      }

      case "galleryUrls": {
        // Signs only storage paths that are registered gallery images, so the
        // bucket itself needs no anonymous read policy.
        const p = parse(galleryUrlsPayload, payload);
        const q = supabase.from("gallery_images").select("storage_path");
        const { data: rows, error } = p.paths?.length
          ? await q.in("storage_path", p.paths)
          : await q;
        if (error) throw error;

        const paths = (rows ?? [])
          .map((r: any) => r.storage_path)
          .filter((v: unknown): v is string => typeof v === "string" && v.length > 0);
        if (paths.length === 0) return json({ urls: {} });

        const { data: signed, error: sErr } = await supabase.storage
          .from("gallery-images")
          .createSignedUrls(paths, 60 * 60 * 6);
        if (sErr) throw sErr;

        const urls: Record<string, string> = {};
        (signed ?? []).forEach((s: any) => {
          if (s?.path && s?.signedUrl) urls[s.path] = s.signedUrl;
        });
        return json({ urls });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err: any) {
    return json({ error: err?.message ?? "Request failed" }, 400);
  }
});

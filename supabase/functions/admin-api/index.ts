// Admin API: password login -> short-lived signed session token.
// Every privileged action runs with the service role, behind token auth,
// rate limiting and server-side payload validation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { clientIp, rateLimit, resetRateLimit } from "../_shared/rateLimit.ts";
import { issueToken, timingSafeEqual, verifyToken } from "../_shared/adminSession.ts";
import {
  assertUploadAllowed,
  BOOKING_COLUMNS,
  CALLBACK_COLUMNS,
  GALLERY_COLUMNS,
  idPayload,
  patchPayload,
  pickAllowed,
  removePayload,
  reorderPayload,
  TEAM_COLUMNS,
  TREK_COLUMNS,
  uploadPayload,
  z,
} from "../_shared/validation.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") ?? "";
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

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const parse = <T>(schema: z.ZodType<T>, payload: unknown): T => {
  const r = schema.safeParse(payload);
  if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Invalid payload");
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
  if (typeof action !== "string" || action.length > 64) {
    return json({ error: "Invalid action" }, 400);
  }

  // ---- Login: strict brute-force limiting, constant-time compare ----
  if (action === "login") {
    const limited = await rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
    if (!limited.allowed) {
      return json(
        { error: "Too many attempts. Try again later." },
        429,
        { "retry-after": String(limited.retryAfter) },
      );
    }
    const pwd = typeof payload?.password === "string" ? payload.password : "";
    if (!ADMIN_PASSWORD || !timingSafeEqual(pwd, ADMIN_PASSWORD)) {
      return json({ error: "Invalid password" }, 401);
    }
    await resetRateLimit(`login:${ip}`);
    const { token, expiresAt } = await issueToken();
    return json({ token, expiresAt });
  }

  // ---- Everything else requires a valid session token ----
  const session = await verifyToken(req.headers.get("x-admin-token"));
  if (!session.valid) return json({ error: "Unauthorized" }, 401);

  const perSession = await rateLimit(`admin:${session.jti ?? ip}`, 120, 60_000);
  if (!perSession.allowed) {
    return json({ error: "Too many requests" }, 429, { "retry-after": String(perSession.retryAfter) });
  }

  try {
    switch (action) {
      case "verify":
      case "logout":
        // Tokens are stateless and short-lived; the client simply discards it.
        return json({ ok: true });

      // ---- Reads ----
      case "listBookings": {
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return json({ data });
      }
      case "listBookingMembers": {
        const { data, error } = await supabase.from("booking_members").select("*");
        if (error) throw error;
        return json({ data });
      }
      case "listCallbackRequests": {
        const { data, error } = await supabase
          .from("callback_requests")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return json({ data });
      }

      // ---- Bookings ----
      case "updateBooking": {
        const { id, patch } = parse(patchPayload, payload);
        const safe = pickAllowed(patch, BOOKING_COLUMNS);
        const { error } = await supabase.from("bookings").update(safe).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "insertBooking": {
        const row = pickAllowed(payload?.row, BOOKING_COLUMNS) as Record<string, unknown>;
        if (!row.primary_name || !row.primary_phone || !row.trek_name) {
          return json({ error: "Missing required fields" }, 400);
        }
        const { data, error } = await supabase.from("bookings").insert(row).select().single();
        if (error) throw error;
        return json({ data });
      }

      // ---- Callbacks ----
      case "updateCallback": {
        const { id, patch } = parse(patchPayload, payload);
        const safe = pickAllowed(patch, CALLBACK_COLUMNS);
        const { error } = await supabase.from("callback_requests").update(safe).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "deleteCallback": {
        const { id } = parse(idPayload, payload);
        const { error } = await supabase.from("callback_requests").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      // ---- Treks ----
      case "insertTrek": {
        const row = pickAllowed(payload?.row, TREK_COLUMNS) as Record<string, unknown>;
        if (!row.name || !row.event_type) return json({ error: "Trip name and event type are required" }, 400);
        const { data, error } = await supabase
          .from("upcoming_treks")
          .insert(row)
          .select()
          .single();
        if (error) throw error;
        return json({ data });
      }
      case "updateTrek": {
        const { id, patch } = parse(patchPayload, payload);
        const safe = pickAllowed(patch, TREK_COLUMNS);
        const { error } = await supabase.from("upcoming_treks").update(safe).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "deleteTrek": {
        const { id } = parse(idPayload, payload);
        const { error } = await supabase.from("upcoming_treks").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      // ---- Storage ----
      case "uploadFile": {
        const { bucket, path, base64, contentType, upsert } = parse(uploadPayload, payload);
        const bytes = b64ToBytes(base64);
        assertUploadAllowed(bucket, path, contentType, bytes.byteLength);
        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, bytes, { contentType: contentType || "application/octet-stream", upsert });
        if (error) throw error;
        let publicUrl: string | null = null;
        if (bucket === "trek-images") {
          publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
        }
        return json({ path, publicUrl });
      }
      case "removeFile": {
        const { bucket, path } = parse(removePayload, payload);
        const { error } = await supabase.storage.from(bucket).remove([path]);
        if (error) throw error;
        return json({ ok: true });
      }

      // ---- Gallery ----
      case "listGalleryImages": {
        const { data, error } = await supabase
          .from("gallery_images")
          .select("*")
          .order("display_order", { ascending: true });
        if (error) throw error;
        return json({ data });
      }
      case "insertGalleryImage": {
        const row = pickAllowed(payload?.row, GALLERY_COLUMNS) as Record<string, unknown>;
        if (!row.image_url && !row.storage_path) return json({ error: "Image is required" }, 400);
        const { data, error } = await supabase
          .from("gallery_images")
          .insert(row)
          .select()
          .single();
        if (error) throw error;
        return json({ data });
      }
      case "updateGalleryImage": {
        const { id, patch } = parse(patchPayload, payload);
        const safe = pickAllowed(patch, GALLERY_COLUMNS);
        const { error } = await supabase.from("gallery_images").update(safe).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "deleteGalleryImage": {
        const { id } = parse(idPayload, payload);
        const { error } = await supabase.from("gallery_images").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "reorderGalleryImages": {
        const { updates } = parse(reorderPayload, payload);
        for (const u of updates) {
          const { error } = await supabase
            .from("gallery_images")
            .update({ display_order: u.display_order })
            .eq("id", u.id);
          if (error) throw error;
        }
        return json({ ok: true });
      }

      // ---- Trail Log ----
      case "listTrailLog": {
        const { data, error } = await supabase
          .from("trail_log")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return json({ data });
      }
      case "insertTrailLog": {
        const schema = z.object({
          title: z.string().trim().min(1).max(200),
          category: z.string().trim().min(1).max(100),
          description: z.string().trim().min(1).max(5000),
          pdf_storage_path: z.string().trim().max(300).optional().nullable(),
          instagram_url: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
        });
        const row = parse(schema, payload?.row);
        const hasPdf = !!row.pdf_storage_path;
        const hasIg = !!row.instagram_url;
        if (hasPdf === hasIg) {
          return json({ error: "Provide either a PDF or an Instagram URL" }, 400);
        }
        const insertRow: Record<string, unknown> = {
          title: row.title,
          category: row.category,
          description: row.description,
        };
        if (hasPdf) {
          insertRow.pdf_storage_path = row.pdf_storage_path;
          insertRow.pdf_url = row.pdf_storage_path; // signed URL generated at read time
        } else {
          insertRow.instagram_url = row.instagram_url;
        }
        const { data, error } = await supabase.from("trail_log").insert(insertRow).select().single();
        if (error) throw error;
        return json({ data });
      }
      case "deleteTrailLog": {
        const { id } = parse(idPayload, payload);
        const { data: existing, error: fetchErr } = await supabase
          .from("trail_log").select("pdf_storage_path").eq("id", id).maybeSingle();
        if (fetchErr) throw fetchErr;
        if (existing?.pdf_storage_path) {
          await supabase.storage.from("trail-log-pdfs").remove([existing.pdf_storage_path]);
        }
        const { error } = await supabase.from("trail_log").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      // ---- Team Members ----
      case "listTeamMembers": {
        const { data, error } = await supabase
          .from("team_members")
          .select("*")
          .order("display_order", { ascending: true });
        if (error) throw error;
        return json({ data });
      }
      case "insertTeamMember": {
        const row = pickAllowed(payload?.row, TEAM_COLUMNS) as Record<string, unknown>;
        if (!row.full_name || !row.role_title) return json({ error: "Missing required fields" }, 400);
        const { data, error } = await supabase.from("team_members").insert(row).select().single();
        if (error) throw error;
        return json({ data });
      }
      case "updateTeamMember": {
        const { id, patch } = parse(patchPayload, payload);
        // is_founder is not in the allow-list, so it can never be changed here.
        const safe = pickAllowed(patch, TEAM_COLUMNS);
        const { error } = await supabase.from("team_members").update(safe).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "deleteTeamMember": {
        const { id } = parse(idPayload, payload);
        const { data: existing, error: fetchErr } = await supabase
          .from("team_members").select("is_founder, photo_url").eq("id", id).maybeSingle();
        if (fetchErr) throw fetchErr;
        if (existing?.is_founder) return json({ error: "Cannot delete the founder" }, 400);
        if (existing?.photo_url) {
          try { await supabase.storage.from("team-photos").remove([existing.photo_url]); } catch { /* ignore */ }
        }
        const { error } = await supabase.from("team_members").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "reorderTeamMembers": {
        const { updates } = parse(reorderPayload, payload);
        for (const u of updates) {
          const { error } = await supabase
            .from("team_members")
            .update({ display_order: u.display_order })
            .eq("id", u.id);
          if (error) throw error;
        }
        return json({ ok: true });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    return json({ error: err?.message ?? "Server error" }, 400);
  }
});

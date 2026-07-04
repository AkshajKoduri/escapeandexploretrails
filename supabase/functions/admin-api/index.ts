// Admin API: password-gated, uses service role for privileged ops.
// Actions dispatch model. Client must send header `x-admin-password`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-password",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const pwd = req.headers.get("x-admin-password") ?? "";
  if (!ADMIN_PASSWORD || pwd !== ADMIN_PASSWORD) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const { action, payload = {} } = body ?? {};

  try {
    switch (action) {
      case "verify":
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
        const { id, patch } = payload;
        const { error } = await supabase.from("bookings").update(patch).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      // ---- Callbacks ----
      case "updateCallback": {
        const { id, patch } = payload;
        const { error } = await supabase.from("callback_requests").update(patch).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "deleteCallback": {
        const { id } = payload;
        const { error } = await supabase.from("callback_requests").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      // ---- Treks ----
      case "insertTrek": {
        const { data, error } = await supabase
          .from("upcoming_treks")
          .insert(payload.row)
          .select()
          .single();
        if (error) throw error;
        return json({ data });
      }
      case "updateTrek": {
        const { id, patch } = payload;
        const { error } = await supabase.from("upcoming_treks").update(patch).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "deleteTrek": {
        const { id } = payload;
        const { error } = await supabase.from("upcoming_treks").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      // ---- Storage ----
      case "uploadFile": {
        const { bucket, path, base64, contentType, upsert = false } = payload;
        if (!bucket || !path || !base64) return json({ error: "Missing fields" }, 400);
        if (!["trek-images", "itineraries"].includes(bucket)) {
          return json({ error: "Bucket not allowed" }, 400);
        }
        const bytes = b64ToBytes(base64);
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
        const { bucket, path } = payload;
        if (!bucket || !path) return json({ error: "Missing fields" }, 400);
        if (!["trek-images", "itineraries"].includes(bucket)) {
          return json({ error: "Bucket not allowed" }, 400);
        }
        const { error } = await supabase.storage.from(bucket).remove([path]);
        if (error) throw error;
        return json({ ok: true });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    return json({ error: err?.message ?? "Server error" }, 500);
  }
});

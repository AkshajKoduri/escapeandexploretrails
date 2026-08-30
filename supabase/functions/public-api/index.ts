// Public write API: the only path for anonymous submissions.
// Rate limited per IP and fully validated server-side; runs with the service
// role so the underlying tables need no anonymous insert grants.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { clientIp, rateLimit } from "../_shared/rateLimit.ts";
import { publicBookingPayload, publicCallbackPayload, z } from "../_shared/validation.ts";

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
  const limited = rateLimit(`public:${ip}`, 5, 60_000);
  if (!limited.allowed) {
    return json(
      { error: "Too many requests. Please wait a moment and try again." },
      429,
      { "retry-after": String(limited.retryAfter) },
    );
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

        // Trek must exist and be published.
        const { data: trek, error: tErr } = await supabase
          .from("upcoming_treks")
          .select("id, name, max_seats, seats_taken, is_archived, is_draft")
          .eq("id", p.trek_id)
          .maybeSingle();
        if (tErr) throw tErr;
        if (!trek || trek.is_archived || trek.is_draft) {
          return json({ error: "This trip is not open for booking" }, 400);
        }

        const members = p.is_group ? p.members : [];
        const seatsNeeded = 1 + members.length;
        const remaining = Math.max((trek.max_seats ?? 0) - (trek.seats_taken ?? 0), 0);
        if (remaining < seatsNeeded) {
          return json({ error: `Only ${remaining} seat(s) left for this trip` }, 409);
        }

        const bookingId = crypto.randomUUID();
        const { error: bErr } = await supabase.from("bookings").insert({
          id: bookingId,
          trek_id: trek.id,
          trek_name: trek.name,
          primary_name: p.primary_name,
          primary_age: p.primary_age ?? null,
          primary_gender: p.primary_gender ?? null,
          primary_phone: p.primary_phone,
          primary_email: p.primary_email || null,
          primary_aadhaar: "",
          primary_aadhaar_photo: "",
          is_group: members.length > 0,
          seats_booked: seatsNeeded,
          status: "confirmed",
          booking_source: "online",
        });
        if (bErr) throw bErr;

        if (members.length > 0) {
          const { error: mErr } = await supabase.from("booking_members").insert(
            members.map((m) => ({
              booking_id: bookingId,
              full_name: m.full_name,
              aadhaar_number: "",
              aadhaar_photo: "",
            })),
          );
          if (mErr) throw mErr;
        }

        return json({ ok: true, id: bookingId });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err: any) {
    return json({ error: err?.message ?? "Request failed" }, 400);
  }
});

// Public: returns a short-lived signed URL for a trek's itinerary PDF,
// but only if the trek is published (not archived, not draft) and actually has one.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const trekId = body?.trekId;
  if (!trekId) return json({ error: "trekId required" }, 400);

  const { data: trek, error: tErr } = await supabase
    .from("upcoming_treks")
    .select("itinerary_file_path, is_archived, is_draft")
    .eq("id", trekId)
    .maybeSingle();

  if (tErr) return json({ error: tErr.message }, 500);
  if (!trek || trek.is_archived || trek.is_draft || !trek.itinerary_file_path) {
    return json({ error: "Not available" }, 404);
  }

  const { data: signed, error: sErr } = await supabase.storage
    .from("itineraries")
    .createSignedUrl(trek.itinerary_file_path, 60 * 60);
  if (sErr) return json({ error: sErr.message }, 500);

  return json({ url: signed?.signedUrl ?? null });
});

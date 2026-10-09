import {
  renderItineraryPreviewHtml,
} from "../src/lib/itineraryPreview.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function html(body: string, status = 200): Promise<Response> {
  try {
    const shell = await readFile(join(process.cwd(), "dist/index.html"), "utf8");
    const metadata = body.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? "";
    body = shell.replace(/<title>[\s\S]*?<\/title>/g, "")
      .replace(/<meta\b[^>]*(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*>/g, "")
      .replace(/<link\b[^>]*rel="canonical"[^>]*>/g, "")
      .replace("</head>", `${metadata}</head>`);
  } catch {
    // Unit tests have no built shell. Deployed functions include dist/index.html.
  }
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    const params = new URL(request.url).searchParams;
    const trekId = params.get("trekId") ?? "";
    const route = params.get("route") === "adventures" ? "adventures" : "itinerary";
    if (!UUID.test(trekId)) return html(renderItineraryPreviewHtml("unknown", null, true), 404);

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !publishableKey) {
      console.error("Itinerary preview requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY at runtime");
      return html(renderItineraryPreviewHtml(trekId), 503);
    }

    try {
      // Forward one IP value so the public metadata action can apply its
      // existing per-IP read rate limit without trusting a client-supplied list.
      const forwardedFor = request.headers.get("x-forwarded-for")?.split(",").map((ip) => ip.trim()).filter(Boolean);
      const ip = forwardedFor?.at(-1);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      let response: Response;
      try {
        response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/public-api`, {
          method: "POST",
          headers: {
            apikey: publishableKey,
            "content-type": "application/json",
            ...(ip ? { "x-forwarded-for": ip } : {}),
          },
          body: JSON.stringify({ action: "itineraryMetadata", payload: { trekId } }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      if (!response.ok) throw new Error(`Metadata service returned ${response.status}`);

      const result = await response.json() as { data?: unknown };
      const row = result.data && typeof result.data === "object" ? result.data as Record<string, unknown> : null;
      const published = row
        && row.id === trekId
        && row.is_archived === false
        && row.is_draft === false
        && typeof row.name === "string"
        && row.name.trim();
      if (!published) return html(renderItineraryPreviewHtml(trekId, null, true, route), 404);

      return html(renderItineraryPreviewHtml(trekId, {
        id: trekId,
        name: row.name as string,
        description: typeof row.description === "string" ? row.description : null,
        destination: typeof row.destination === "string" ? row.destination : null,
        location: typeof row.location === "string" ? row.location : null,
        image_url: typeof row.image_url === "string" ? row.image_url : null,
      }, false, route));
    } catch (error) {
      console.error("Unable to build itinerary social preview", error);
      // During a temporary metadata outage, return generic brand metadata
      // instead of inventing trip details or leaking a PDF URL.
      return html(renderItineraryPreviewHtml(trekId), 503);
    }
  },
};

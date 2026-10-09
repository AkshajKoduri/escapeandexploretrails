const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BYTES = 10 * 1024 * 1024;

export function publicPdfDownloadUrl(value: string, uploaded: boolean, supabaseUrl: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (uploaded && url.origin === new URL(supabaseUrl).origin && url.pathname.startsWith("/storage/v1/object/sign/itineraries/")) return url.href;
    if (!uploaded && url.hostname === "drive.google.com") {
      const id = url.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] || url.searchParams.get("id");
      if (id && /^[a-zA-Z0-9_-]{10,200}$/.test(id)) return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
    }
    return null;
  } catch { return null; }
}

const errorResponse = (message: string, status: number) => new Response(message, {
  status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
});

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET") return errorResponse("Method not allowed", 405);
    const params = new URL(request.url).searchParams;
    const trekId = params.get("trekId") ?? "";
    if (!UUID.test(trekId)) return errorResponse("Itinerary not available", 404);
    const base = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!base || !key) return errorResponse("Itinerary service unavailable", 503);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let streaming = false;
    try {
      const metadata = await fetch(`${base}/functions/v1/public-api`, {
        method: "POST", headers: { apikey: key, "content-type": "application/json", ...(request.headers.get("x-forwarded-for") ? { "x-forwarded-for": request.headers.get("x-forwarded-for")!.split(",").at(-1)!.trim() } : {}) },
        body: JSON.stringify({ action: "itineraryPdfSource", payload: { trekId } }), signal: controller.signal,
      });
      if (!metadata.ok) return errorResponse("Itinerary not available. Please try again.", metadata.status === 404 ? 404 : 503);
      const { data } = await metadata.json() as { data?: { name: string; url: string; uploaded: boolean } };
      const url = data?.url && publicPdfDownloadUrl(data.url, data.uploaded === true, base);
      if (!url) return errorResponse("Please ask E2 Trails to upload the complete itinerary PDF.", 422);
      // Never follow a user-configured redirect to an arbitrary host.
      const pdf = await fetch(url, { redirect: "error", signal: controller.signal });
      if (!pdf.ok || !pdf.body) return errorResponse("The itinerary PDF is unavailable. Please try again.", 502);
      const reader = pdf.body.getReader();
      const first = await reader.read();
      if (!first.value || new TextDecoder().decode(first.value.slice(0, 5)) !== "%PDF-") {
        await reader.cancel();
        return errorResponse("The configured link does not provide a public PDF. Please ask E2 Trails to upload the complete itinerary PDF.", 422);
      }
      const length = pdf.headers.get("content-length");
      if (Number(length) > MAX_BYTES) { await reader.cancel(); return errorResponse("This PDF exceeds the 10 MB download limit.", 413); }
      let total = first.value.byteLength;
      // Stream large uploaded PDFs; buffering would exceed Vercel's response limit.
      const stream = new ReadableStream<Uint8Array>({
        start(controller) { controller.enqueue(first.value); },
        async pull(controller) {
          try {
            const chunk = await reader.read();
            if (chunk.done) { clearTimeout(timeout); controller.close(); return; }
            total += chunk.value.byteLength;
            if (total > MAX_BYTES) { await reader.cancel(); controller.error(new Error("PDF too large")); return; }
            controller.enqueue(chunk.value);
          } catch (error) { clearTimeout(timeout); controller.error(error); }
        },
        cancel() { clearTimeout(timeout); return reader.cancel(); },
      });
      const filename = `${(data?.name || "e2-trails").replace(/[^a-z0-9]+/gi, "-").slice(0, 90)}-itinerary.pdf`;
      streaming = true;
      return new Response(stream, { headers: {
        "content-type": "application/pdf", ...(length && !pdf.headers.get("content-encoding") ? { "content-length": length } : {}),
        "content-disposition": `${params.get("view") === "inline" ? "inline" : "attachment"}; filename="${filename}"`,
        "cache-control": "no-store", "x-content-type-options": "nosniff",
      } });
    } catch {
      return errorResponse("The PDF download failed. Please try again or open the provider link.", 502);
    } finally { if (!streaming) clearTimeout(timeout); }
  },
};

import { afterEach, describe, expect, it, vi } from "vitest";
import handler, { publicPdfDownloadUrl } from "../../api/itinerary-pdf";
const tripId = "e7ec1f68-3160-499f-9a59-3f94b2029c8f";
const base = "https://project.supabase.co";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("complete itinerary PDF delivery", () => {
  it("allows configured Drive PDFs and rejects unrelated hosts and fake storage paths", () => {
    expect(publicPdfDownloadUrl("https://drive.google.com/file/d/1234567890abcdef/view", false, base)).toContain("drive.usercontent.google.com/download?id=1234567890abcdef");
    expect(publicPdfDownloadUrl("https://private.example/file.pdf", false, base)).toBeNull();
    expect(publicPdfDownloadUrl("https://evil.example/storage/v1/object/sign/itineraries/file", true, base)).toBeNull();
  });
  it("streams every byte of a large uploaded PDF with its filename and content type", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", base); vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
    const bytes = new Uint8Array(7708793);
    bytes.set(new TextEncoder().encode("%PDF-1.7\n"));
    const upstream = new Response(bytes, { headers: { "content-length": String(bytes.length) } });
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: {
      name: "Badami", uploaded: true, url: `${base}/storage/v1/object/sign/itineraries/trip.pdf?token=fresh`,
    } }))).mockResolvedValueOnce(upstream);
    vi.stubGlobal("fetch", fetchMock);
    const response = await handler.fetch(new Request(`https://e2trails.in/api/itinerary-pdf?trekId=${tripId}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("Badami-itinerary.pdf");
    const received = new Uint8Array(await response.arrayBuffer());
    expect(received.byteLength).toBe(bytes.byteLength);
    expect(received.every((value, index) => value === bytes[index])).toBe(true);
    expect(fetchMock.mock.calls[0][1].body).toContain("itineraryPdfSource");
  });
  it("rejects a provider HTML page instead of downloading it as a PDF", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", base); vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: {
      name: "Trip", uploaded: false, url: "https://drive.google.com/file/d/1234567890abcdef/view",
    } }))).mockResolvedValueOnce(new Response("<html>Login required</html>")));
    const response = await handler.fetch(new Request(`https://e2trails.in/api/itinerary-pdf?trekId=${tripId}`));
    expect(response.status).toBe(422);
    expect(await response.text()).toContain("public PDF");
  });
});

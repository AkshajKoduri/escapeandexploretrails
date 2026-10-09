import { afterEach, describe, expect, it, vi } from "vitest";
import itineraryPreview from "../../api/itinerary-preview";

const tripId = "8b650c28-3e35-4f6c-9290-7087cf1461ba";

describe("itinerary preview endpoint", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns crawler-ready metadata from the published trip record", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "public-key-for-test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      id: tripId,
      name: "Hike & Rappelling at Bhongir Fort",
      description: "A guided hike and rappelling adventure.",
      image_url: "https://images.example/bhongir.jpg",
      is_archived: false,
      is_draft: false,
    } }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await itineraryPreview.fetch(new Request(`https://e2trails.in/api/itinerary-preview?trekId=${tripId}`, {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    }));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain('<meta property="og:title" content="Hike &amp; Rappelling at Bhongir Fort">');
    expect(html).toContain('<meta property="og:image" content="https://images.example/bhongir.jpg">');
    expect(fetchMock).toHaveBeenCalledWith("https://project.supabase.co/functions/v1/public-api", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ apikey: "public-key-for-test", "x-forwarded-for": "10.0.0.1" }),
      body: JSON.stringify({ action: "itineraryMetadata", payload: { trekId: tripId } }),
    }));
  });

  it("returns generic noindex metadata for unpublished trips", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "public-key-for-test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: null }), { status: 200 })));

    const response = await itineraryPreview.fetch(new Request(`https://e2trails.in/api/itinerary-preview?trekId=${tripId}`));
    const html = await response.text();
    expect(response.status).toBe(404);
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(html).not.toContain("Bhongir");
  });
});

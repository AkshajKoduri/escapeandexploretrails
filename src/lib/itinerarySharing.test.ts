import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasItineraryPdf, itineraryShareUrl, loadItineraryFile, resolveItineraryUrl, shareItinerary, whatsappItineraryShare } from "./itinerarySharing";
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
const source = { id: "trip", name: "Hills & waterfalls", itineraryFilePath: "trips/private.pdf" };
beforeEach(() => { invoke.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("itinerary PDF and sharing fallbacks", () => {
  it("shares the stable page rather than expiring storage URLs", () => {
    expect(itineraryShareUrl("trip", "https://e2trails.in")).toBe("https://e2trails.in/itinerary/trip");
    expect(decodeURIComponent(whatsappItineraryShare(source, "https://e2trails.in"))).toContain("https://e2trails.in/itinerary/trip");
    expect(hasItineraryPdf({ id: "trip", name: "Trip" })).toBe(false);
  });
  it("requests fresh signed access for every PDF resolution", async () => {
    invoke.mockResolvedValueOnce({ data: { url: "https://files.test/one.pdf?token=one" }, error: null });
    invoke.mockResolvedValueOnce({ data: { url: "https://files.test/one.pdf?token=two" }, error: null });
    expect(await resolveItineraryUrl(source)).toContain("token=one");
    expect(await resolveItineraryUrl(source)).toContain("token=two");
    expect(invoke).toHaveBeenCalledTimes(2);
  });
  it("downloads PDF bytes with a meaningful name and rejects provider HTML", async () => {
    invoke.mockResolvedValue({ data: { url: "https://files.test/one.pdf" }, error: null });
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new TextEncoder().encode("%PDF-1.7\ncontent").buffer })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new TextEncoder().encode("<html>Provider page</html>").buffer });
    vi.stubGlobal("fetch", fetch);
    const pdf = await loadItineraryFile(source);
    expect(pdf.type).toBe("application/pdf");
    expect(pdf.name).toBe("Hills-waterfalls-itinerary.pdf");
    await expect(loadItineraryFile(source)).rejects.toThrow(/provider/);
  });
  it("handles unsupported file sharing and cancellation without claiming success", async () => {
    vi.stubGlobal("navigator", {});
    expect(await shareItinerary(source)).toBe("unsupported");
    const share = vi.fn();
    vi.stubGlobal("navigator", { share, canShare: () => false });
    expect(await shareItinerary(source, new File(["%PDF-"], "trip.pdf"))).toBe("unsupported");
    expect(share).not.toHaveBeenCalled();
    share.mockRejectedValue(new DOMException("Cancelled", "AbortError"));
    expect(await shareItinerary(source)).toBe("cancelled");
  });
  it("reports unavailable PDFs instead of using a broken URL", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("Not found") });
    await expect(resolveItineraryUrl(source)).rejects.toThrow(/unavailable/);
  });
});

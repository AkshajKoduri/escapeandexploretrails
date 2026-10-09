import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasItineraryPdf, itineraryShareUrl, loadItineraryFile, resolveItineraryUrl, shareItinerary, whatsappItineraryShare } from "./itinerarySharing";
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
const source = { id: "trip", name: "Hills & waterfalls", itineraryFilePath: "trips/private.pdf" };
beforeEach(() => { invoke.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("itinerary PDF and sharing fallbacks", () => {
  it("preserves existing PDF links from other providers", async () => {
    expect(await resolveItineraryUrl({ id: "trip", name: "Trip", itineraryUrl: "https://files.example/trip.pdf" })).toBe("https://files.example/trip.pdf");
  });
  it("shares the stable page rather than expiring storage URLs", () => {
    expect(itineraryShareUrl("trip", "https://e2trails.in")).toBe("https://e2trails.in/itinerary/trip");
    expect(decodeURIComponent(whatsappItineraryShare(source, "https://e2trails.in"))).toContain("https://e2trails.in/itinerary/trip");
    expect(hasItineraryPdf({ id: "trip", name: "Trip" })).toBe(false);
  });
  it("uses the stable PDF endpoint so server requests obtain fresh storage access", async () => {
    invoke.mockResolvedValueOnce({ data: { url: "https://files.test/one.pdf?token=one" }, error: null });
    invoke.mockResolvedValueOnce({ data: { url: "https://files.test/one.pdf?token=two" }, error: null });
    expect(await resolveItineraryUrl(source)).toBe("/api/itinerary-pdf?trekId=trip&view=inline");
    expect(await resolveItineraryUrl(source)).not.toContain("token=");
    expect(invoke).not.toHaveBeenCalled();
  });
  it("downloads PDF bytes with a meaningful name and rejects provider HTML", async () => {
    invoke.mockResolvedValue({ data: { url: "https://files.test/one.pdf" }, error: null });
    const completePdf = "%PDF-1.7\n1 0 obj\n<< /Type /Pages /Count 2 >>\n2 0 obj\n<< /Type /Page >>\n3 0 obj\n<< /Type /Page >>\n%%EOF";
    const pdfResponse = () => ({ ok: true, headers: new Headers(), arrayBuffer: async () => new TextEncoder().encode(completePdf).buffer });
    const htmlResponse = () => ({ ok: true, headers: new Headers(), arrayBuffer: async () => new TextEncoder().encode("<html>Provider page</html>").buffer });
    const fetch = vi.fn().mockResolvedValueOnce(pdfResponse())
      .mockResolvedValueOnce(htmlResponse()).mockResolvedValueOnce(htmlResponse());
    vi.stubGlobal("fetch", fetch);
    const pdf = await loadItineraryFile(source);
    expect(pdf.type).toBe("application/pdf");
    expect(pdf.name).toBe("Hills-waterfalls-itinerary.pdf");
    expect(pdf.size).toBe(new TextEncoder().encode(completePdf).byteLength);
    await expect(loadItineraryFile(source)).rejects.toThrow(/not a PDF/);
  });
  it("requests a fresh signed URL and retries when an earlier URL has expired", async () => {
    invoke.mockResolvedValueOnce({ data: { url: "https://files.test/expired.pdf" }, error: null })
      .mockResolvedValueOnce({ data: { url: "https://files.test/fresh.pdf" }, error: null });
    const fetch = vi.fn().mockResolvedValueOnce({ ok: false, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, headers: new Headers(), arrayBuffer: async () => new TextEncoder().encode("%PDF-1.7\nfull document").buffer });
    vi.stubGlobal("fetch", fetch);
    const pdf = await loadItineraryFile(source);
    expect(pdf.type).toBe("application/pdf");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(["/api/itinerary-pdf?trekId=trip", "/api/itinerary-pdf?trekId=trip"]);
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
    share.mockRejectedValue(new Error("Share target failed"));
    expect(await shareItinerary(source)).toBe("failed");
  });
  it("reports unavailable PDFs instead of using a broken URL", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("Not found") });
    await expect(resolveItineraryUrl({ id: "trip", name: "Trip" })).rejects.toThrow(/No itinerary/);
  });
});

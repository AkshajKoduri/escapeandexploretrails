import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ItineraryCoverShare from "./ItineraryCoverShare";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), share: vi.fn(), load: vi.fn() }));
vi.mock("react-router-dom", async importOriginal => ({ ...await importOriginal<typeof import("react-router-dom")>(), useNavigate: () => mocks.navigate }));
vi.mock("@/lib/itinerarySharing", () => ({
  hasItineraryPdf: (source: { itineraryFilePath?: string }) => !!source.itineraryFilePath,
  itineraryShareUrl: () => "https://example.com/itinerary/trip",
  loadItineraryFile: mocks.load, shareItinerary: mocks.share, downloadItineraryFile: vi.fn(),
}));
const source = { id: "trip", name: "Test trip", itineraryFilePath: "trip.pdf" };
let mobile = true;
beforeEach(() => {
  vi.clearAllMocks(); mobile = true;
  vi.stubGlobal("matchMedia", () => ({ matches: mobile }));
  Object.defineProperty(navigator, "share", { configurable: true, value: vi.fn() });
  Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
  mocks.load.mockResolvedValue(new File(["%PDF-"], "trip.pdf", { type: "application/pdf" }));
  mocks.share.mockResolvedValue("shared");
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const show = () => render(<MemoryRouter><ItineraryCoverShare source={source} /></MemoryRouter>);
describe("cover itinerary action", () => {
  it("does not silently share a link while the full PDF is still preparing", async () => {
    mocks.load.mockReturnValue(new Promise(() => {}));
    show(); fireEvent.click(screen.getByRole("button", { name: "Share itinerary" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(mocks.share).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Prepare PDF to share" })).toBeInTheDocument();
  });
  it("opens the PDF viewer on desktop", () => {
    mobile = false; show(); fireEvent.click(screen.getByRole("button", { name: "Share itinerary" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/itinerary/trip?view=pdf");
  });
  it("shares the prepared PDF on touch devices", async () => {
    await act(async () => { show(); });
    fireEvent.click(screen.getByRole("button", { name: "Share itinerary" }));
    await waitFor(() => expect(mocks.share).toHaveBeenCalledWith(source, expect.any(File)));
  });
  it("shares a link if file sharing is unsupported", async () => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => false });
    await act(async () => { show(); }); fireEvent.click(screen.getByRole("button", { name: "Share itinerary" }));
    await waitFor(() => expect(mocks.share).toHaveBeenCalledWith(source, undefined));
  });
  it("offers PDF and copy alternatives when sharing fails", async () => {
    mocks.share.mockResolvedValue("unsupported"); await act(async () => { show(); }); fireEvent.click(screen.getByRole("button", { name: "Share itinerary" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open PDF" })).toHaveAttribute("href", "/itinerary/trip?view=pdf");
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
  });
  it("shows a clear fallback when the native share action fails", async () => {
    mocks.share.mockResolvedValue("failed"); await act(async () => { show(); }); fireEvent.click(screen.getByRole("button", { name: "Share itinerary" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/couldn’t share the itinerary/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
  });
  it("does not show success or a fallback on cancellation", async () => {
    mocks.share.mockResolvedValue("cancelled"); await act(async () => { show(); }); fireEvent.click(screen.getByRole("button", { name: "Share itinerary" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Share itinerary" })).not.toBeDisabled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("hides the action without a PDF", () => {
    render(<MemoryRouter><ItineraryCoverShare source={{ id: "empty", name: "No PDF" }} /></MemoryRouter>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

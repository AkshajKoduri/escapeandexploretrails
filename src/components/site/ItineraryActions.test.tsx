import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ItineraryActions from "./ItineraryActions";

const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/lib/itinerarySharing", async original => ({ ...await original<typeof import("@/lib/itinerarySharing")>(), loadItineraryFile: load }));
afterEach(cleanup);
describe("PDF-page sharing", () => {
  it("offers the original adventure link even when PDF preparation fails", async () => {
    load.mockRejectedValue(new Error("PDF provider unavailable"));
    render(<MemoryRouter initialEntries={["/itinerary/trip?view=pdf"]}><ItineraryActions source={{ id: "trip", name: "Ahobilam", itineraryUrl: "https://drive.google.com/file/d/original/view" }} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Share itinerary" }));
    fireEvent.click(screen.getByRole("button", { name: "Prepare PDF to share" }));
    expect(await screen.findByText(/PDF provider unavailable/)).toBeInTheDocument();
    const link = screen.getByLabelText("Trip details link") as HTMLInputElement;
    expect(link.value).toMatch(/\/adventures\/trip$/);
    expect(link.value).not.toContain("view=pdf");
    const whatsapp = decodeURIComponent(screen.getByRole("link", { name: "Share link on WhatsApp" }).getAttribute("href")!);
    expect(whatsapp).toContain("Ahobilam");
    expect(whatsapp).toContain("/adventures/trip");
  });
});

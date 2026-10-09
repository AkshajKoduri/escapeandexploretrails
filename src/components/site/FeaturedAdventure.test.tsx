import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import FeaturedAdventure from "./FeaturedAdventure";
import type { Adventure } from "@/lib/treks";

const { fetchTrips } = vi.hoisted(() => ({ fetchTrips: vi.fn() }));
vi.mock("@/lib/treks", async original => ({ ...await original<typeof import("@/lib/treks")>(), fetchAdventures: fetchTrips }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
  removeChannel: vi.fn(),
} }));
afterEach(cleanup);
const trip = (id: string, selected: boolean) => ({ id, name: `Adventure ${id}`, showOnHomepage: selected, img: "", diff: "Easy", eventType: "Hike", dates: ["2026-11-08", "2026-11-01", "2026-11-08"], departureStatuses: { "2026-11-01": "Full", "2026-11-08": "Last Few" }, price: 2000, seatsRemaining: 3 } as unknown as Adventure);

describe("selected homepage adventure cards", () => {
  it("shows all selected adventures, excludes unselected ones, and shows every date without status", async () => {
    fetchTrips.mockResolvedValue([...Array.from({ length: 5 }, (_, i) => trip(String(i), true)), trip("hidden", false)]);
    render(<MemoryRouter><FeaturedAdventure /></MemoryRouter>);
    await screen.findByRole("heading", { name: "Adventure 4" });
    expect(screen.queryByRole("heading", { name: "Adventure hidden" })).not.toBeInTheDocument();
    const region = screen.getByRole("region", { name: "Upcoming adventures" });
    expect(within(region).getAllByLabelText("Departure dates")).toHaveLength(5);
    expect(within(region).queryByText("Full")).not.toBeInTheDocument();
    expect(within(region).queryByText("Last Few")).not.toBeInTheDocument();
    for (const dates of within(region).getAllByLabelText("Departure dates")) {
      expect([...dates.querySelectorAll("time")].map(el => el.dateTime)).toEqual(["2026-11-01", "2026-11-08"]);
    }
  });
  it("keeps the catalogue link available when no homepage cards are selected", async () => {
    fetchTrips.mockResolvedValue([trip("hidden", false)]);
    render(<MemoryRouter><FeaturedAdventure /></MemoryRouter>);
    expect(await screen.findByRole("link", { name: "Browse adventures" })).toHaveAttribute("href", "/adventures");
    expect(screen.queryByRole("heading", { name: "Adventure hidden" })).not.toBeInTheDocument();
  });
});

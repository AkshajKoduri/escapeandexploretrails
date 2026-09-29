// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Itinerary from "./Itinerary";

const { maybeSingleMock } = vi.hoisted(() => ({
  maybeSingleMock: vi.fn(async () => ({
    data: {
      id: "trip-1",
      name: "Test trek",
      image_url: null,
      itinerary_days: [{ title: "Day 1", description: "Reach the trailhead." }],
      itinerary_file_path: null,
      itinerary_url: null,
      instructions: null,
      trip_details: {
        inclusions: [{ id: "guide", text: "Local guide" }],
        exclusions: [],
        packages: [],
        paymentPolicy: [],
        thingsToCarry: [],
        thingsToKeepInMind: [{ id: "group", text: "Stay with the group" }],
        cancellationPolicy: [
          { id: "free", window: "Up to 21 days before", charge: "Free cancellation allowed" },
        ],
        cancellationNotes: "Refund timing is confirmed after review.",
      },
    },
    error: null,
  })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: maybeSingleMock }),
      }),
    }),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("@/hooks/useSeo", () => ({ useSeo: vi.fn() }));

describe("Itinerary trek details", () => {
  it("renders saved structured trek details below the itinerary", async () => {
    render(
      <MemoryRouter initialEntries={["/itinerary/trip-1"]}>
        <Routes>
          <Route path="/itinerary/:trekId" element={<Itinerary />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("region", { name: "Trip information" })).toBeInTheDocument();
    expect(screen.queryByText("Plan with clarity")).not.toBeInTheDocument();
    expect(screen.queryByText("Trip essentials")).not.toBeInTheDocument();
    expect(screen.getByText("Local guide")).toBeInTheDocument();
    expect(screen.getByText("Stay with the group")).toBeInTheDocument();
    expect(screen.getByText("Refund timing is confirmed after review.")).toBeInTheDocument();
    expect(screen.getByRole("table", {
      name: "Cancellation windows and the corresponding cancellation charges",
    })).toBeInTheDocument();
  });
});

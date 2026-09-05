// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import BookingForm from "./BookingForm";
import type { Adventure } from "@/lib/treks";

// jsdom lacks a few browser APIs the form touches on error paths.
if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  };
}
Element.prototype.scrollIntoView = vi.fn();

const { submitBookingMock } = vi.hoisted(() => ({
  submitBookingMock: vi.fn(
    async (_args: { trekDate?: string; clientRef?: string; trek?: { id?: string } }) => ({
      ok: true as const,
      bookingId: "booked-1234-5678",
    }),
  ),
}));

vi.mock("@/lib/treks", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    submitBooking: submitBookingMock,
  };
});

function makeAdventure(overrides?: Partial<Adventure>): Adventure {
  return {
    id: "trek-1",
    name: "Ahobilam & Ugrastambam Trek",
    destination: "Ahobilam",
    location: null,
    img: "",
    diff: "Moderate",
    dur: "1 day",
    dist: "8 km",
    durationText: null,
    region: "Nallamala",
    price: 2000,
    startingPrice: 2000,
    startingPriceLabel: null,
    topEndPrice: null,
    topEndPriceLabel: null,
    dates: ["2026-09-05", "2026-09-26"],
    allDates: ["2026-09-05", "2026-09-26"],
    dateLabel: "",
    trekTime: null,
    description: null,
    instructions: null,
    meetingPoint: null,
    itineraryUrl: null,
    itineraryFilePath: null,
    itineraryDays: [],
    seatsRemaining: 20,
    maxSeats: 20,
    seatsTaken: 0,
    isFull: false,
    eventType: "Hike",
    trekCategory: null,
    albumUrl: null,
    extras: [],
    ...overrides,
  };
}

beforeEach(() => {
  submitBookingMock.mockClear();
});

describe("BookingForm", () => {
  it("preselects the date passed via initialDate", () => {
    render(<BookingForm adventure={makeAdventure()} initialDate="2026-09-26" />);
    const secondDate = screen.getByRole("button", { name: /26 Sept/ });
    expect(secondDate).toHaveAttribute("aria-pressed", "true");
    const firstDate = screen.getByRole("button", { name: /5 Sept/ });
    expect(firstDate).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps member-name rows exactly in sync with the people stepper", async () => {
    render(<BookingForm adventure={makeAdventure()} />);
    expect(screen.queryByPlaceholderText(/Traveller 2/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More people" }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Traveller 2/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "More people" }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Traveller 3/)).toBeInTheDocument(),
    );

    // Decrement back to one traveller — no stale member rows may remain.
    fireEvent.click(screen.getByRole("button", { name: "Fewer people" }));
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/Traveller 3/)).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Fewer people" }));
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/Traveller 2/)).not.toBeInTheDocument(),
    );
  });

  it("shows inline validation errors instead of submitting when fields are missing", async () => {
    render(<BookingForm adventure={makeAdventure()} />);
    fireEvent.click(screen.getByRole("button", { name: /Confirm booking/ }));
    await waitFor(() =>
      expect(screen.getByText(/lead traveller's full name/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/valid phone number/)).toBeInTheDocument();
    expect(submitBookingMock).not.toHaveBeenCalled();
  });

  it("submits a valid booking and reports it through onSuccess", async () => {
    const onSuccess = vi.fn();
    render(<BookingForm adventure={makeAdventure()} initialDate="2026-09-26" onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "Ravi Kumar" } });
    fireEvent.change(screen.getByLabelText(/^Age/), { target: { value: "28" } });
    fireEvent.change(screen.getByLabelText(/^Gender/), { target: { value: "Male" } });
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "9876543210" } });

    fireEvent.click(screen.getByRole("button", { name: /Confirm booking/ }));
    await waitFor(() => expect(submitBookingMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/You're on the trail, Ravi!/)).toBeInTheDocument());
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ date: "2026-09-26", people: 1 }),
    );

    const payload = submitBookingMock.mock.calls[0]?.[0] as
      | { trekDate?: string; clientRef?: string }
      | undefined;
    expect(payload?.trekDate).toBe("2026-09-26");
    expect(payload?.clientRef).toBeTruthy();
  });
});

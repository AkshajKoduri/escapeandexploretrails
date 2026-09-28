// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import TripDetailsSection from "./TripDetailsSection";
import { createDefaultTripDetails, type TripDetails } from "@/lib/tripDetails";

function populatedDetails(): TripDetails {
  return {
    ...createDefaultTripDetails(),
    inclusions: [{ id: "guide", text: "Local guide" }],
    exclusions: [{ id: "travel", text: "Travel to the meeting point" }],
    packages: [{ id: "standard", name: "Standard", price: "₹4,500", priceAmount: 4500, priceBasis: "per_person", currency: "INR", details: "Shared stay" }],
    paymentPolicy: [{ id: "deposit", title: "Booking confirmation", terms: "Pay the confirmed deposit after approval" }],
    thingsToCarry: [{ id: "water", text: "Two litres of water" }],
    thingsToKeepInMind: [{ id: "guide", heading: "Trail conduct", instructions: [{ id: "follow", text: "Follow the guide’s instructions" }] }],
    cancellationNotes: "Refund timing is confirmed after review.",
  };
}

describe("TripDetailsSection", () => {
  it("renders saved sections and cancellation rows in their stored order", () => {
    const details = populatedDetails();
    details.cancellationPolicy = [
      { id: "second", window: "Second window", charge: "Second charge" },
      { id: "first", window: "First window", charge: "First charge" },
    ];

    render(<TripDetailsSection details={details} />);

    expect(screen.getByRole("heading", { name: "Inclusions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Exclusions" })).toBeInTheDocument();
    expect(screen.getByText("Local guide")).toBeInTheDocument();
    expect(screen.getByText("Travel to the meeting point")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Things to keep in mind" })).toBeInTheDocument();
    expect(screen.getByText("Follow the guide’s instructions")).toBeInTheDocument();
    expect(screen.getByText("Refund timing is confirmed after review.")).toBeInTheDocument();

    const table = screen.getByRole("table", {
      name: "Cancellation windows and the corresponding cancellation charges",
    });
    expect(within(table).getByRole("columnheader", { name: "Cancellation window" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Cancellation charge" })).toBeInTheDocument();
    const rowHeaders = within(table).getAllByRole("rowheader").map((cell) => cell.textContent);
    expect(rowHeaders).toEqual(["Second window", "First window"]);

    const paymentTable = screen.getByRole("table", { name: "Payment stages and the corresponding payment terms" });
    expect(within(paymentTable).getByRole("columnheader", { name: "Payment stage" })).toBeInTheDocument();
    expect(within(paymentTable).getByRole("rowheader", { name: "Booking confirmation" })).toBeInTheDocument();
    expect(within(paymentTable).getByText("Pay the confirmed deposit after approval")).toBeInTheDocument();

    const headings = screen.getAllByRole("heading").map((heading) => heading.textContent);
    expect(headings.indexOf("Things to keep in mind")).toBeGreaterThan(headings.indexOf("Cancellation and refund policy"));
  });

  it("uses ordered-list semantics for multiple keep-in-mind instructions", () => {
    const details = populatedDetails();
    details.thingsToKeepInMind[0].instructions.push({ id: "second", text: "Carry your own water" });
    const { container } = render(<TripDetailsSection details={details} />);
    expect(container.querySelector("ol")).toBeInTheDocument();
    expect(screen.getByText("Carry your own water")).toBeInTheDocument();
  });

  it("renders the approved fallback policy with semantic table structure", () => {
    render(<TripDetailsSection details={createDefaultTripDetails()} />);

    const table = screen.getByRole("table", {
      name: "Cancellation windows and the corresponding cancellation charges",
    });
    expect(within(table).getAllByRole("row")).toHaveLength(5);
    expect(within(table).getByText("Up to 21 days before")).toBeInTheDocument();
    expect(within(table).getByText("100% charged — no refund")).toBeInTheDocument();
  });

  it("does not render a section or policy table when every saved field is empty", () => {
    const empty: TripDetails = {
      inclusions: [],
      exclusions: [],
      packages: [],
      paymentPolicy: [],
      thingsToCarry: [],
      thingsToKeepInMind: [],
      cancellationPolicy: [],
      cancellationNotes: "",
    };

    const { container } = render(<TripDetailsSection details={empty} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders additional cancellation details without an empty table", () => {
    const details = {
      ...createDefaultTripDetails(),
      cancellationPolicy: [],
      cancellationNotes: "Contact the team for trek-specific refund timing.",
    };

    render(<TripDetailsSection details={details} />);

    expect(screen.getByRole("heading", { name: "Cancellation and refund policy" })).toBeInTheDocument();
    expect(screen.getByText("Contact the team for trek-specific refund timing.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

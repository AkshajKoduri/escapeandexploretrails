// @vitest-environment jsdom
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import TripDetailsEditor from "./TripDetailsEditor";
import { createDefaultTripDetails, type TripDetails } from "@/lib/tripDetails";

function ControlledEditor({ initial = createDefaultTripDetails() }: { initial?: TripDetails }) {
  const [details, setDetails] = useState(initial);
  return (
    <>
      <TripDetailsEditor value={details} onChange={setDetails} />
      <output data-testid="details-state">{JSON.stringify(details)}</output>
    </>
  );
}

describe("TripDetailsEditor", () => {
  it("shows the approved cancellation policy for a newly created trek", () => {
    render(<ControlledEditor />);

    expect(screen.getByLabelText("Row 1: cancellation window")).toHaveValue("Up to 21 days before");
    expect(screen.getByLabelText("Row 4: cancellation charge")).toHaveValue("100% charged — no refund");
  });

  it("adds, edits, reorders, and removes list items using labelled controls", () => {
    render(<ControlledEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Add inclusion" }));
    fireEvent.change(screen.getByLabelText("Inclusions item 1"), { target: { value: "Local guide" } });
    fireEvent.click(screen.getByRole("button", { name: "Add inclusion" }));
    fireEvent.change(screen.getByLabelText("Inclusions item 2"), { target: { value: "Breakfast" } });
    fireEvent.click(screen.getByRole("button", { name: "Move Inclusions item 2 up" }));

    let state = JSON.parse(screen.getByTestId("details-state").textContent ?? "{}") as TripDetails;
    expect(state.inclusions.map((item) => item.text)).toEqual(["Breakfast", "Local guide"]);

    fireEvent.click(screen.getByRole("button", { name: "Remove Inclusions item 1" }));
    state = JSON.parse(screen.getByTestId("details-state").textContent ?? "{}") as TripDetails;
    expect(state.inclusions.map((item) => item.text)).toEqual(["Local guide"]);
  });

  it("loads and updates saved custom policy rows without replacing them", () => {
    const initial = {
      ...createDefaultTripDetails(),
      cancellationPolicy: [
        { id: "custom", window: "10 days before", charge: "Custom charge" },
      ],
    };
    render(<ControlledEditor initial={initial} />);

    const charge = screen.getByLabelText("Row 1: cancellation charge");
    expect(charge).toHaveValue("Custom charge");
    fireEvent.change(charge, { target: { value: "Revised custom charge" } });

    const state = JSON.parse(screen.getByTestId("details-state").textContent ?? "{}") as TripDetails;
    expect(state.cancellationPolicy).toEqual([
      { id: "custom", window: "10 days before", charge: "Revised custom charge" },
    ]);
  });

  it("edits additional cancellation details and things to keep in mind", () => {
    render(<ControlledEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Add instruction" }));
    fireEvent.change(screen.getByLabelText("Things to keep in mind item 1"), {
      target: { value: "Stay with the group" },
    });
    fireEvent.change(screen.getByLabelText("Additional cancellation and refund details"), {
      target: { value: "Refund timing depends on the original payment method." },
    });

    const state = JSON.parse(screen.getByTestId("details-state").textContent ?? "{}") as TripDetails;
    expect(state.thingsToKeepInMind.map((item) => item.text)).toEqual(["Stay with the group"]);
    expect(state.cancellationNotes).toBe("Refund timing depends on the original payment method.");
  });
});

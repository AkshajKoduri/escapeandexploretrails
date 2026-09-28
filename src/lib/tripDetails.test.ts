import { describe, expect, it } from "vitest";
import {
  createDefaultTripDetails,
  normalizeTripDetails,
  serializeTripDetails,
  STANDARD_CANCELLATION_POLICY,
} from "./tripDetails";

describe("trip details mapping", () => {
  it("prepopulates the four approved cancellation rows for a new trek", () => {
    const details = createDefaultTripDetails();

    expect(details.cancellationPolicy).toEqual(STANDARD_CANCELLATION_POLICY);
    expect(details.cancellationPolicy.map(({ window, charge }) => ({ window, charge }))).toEqual([
      { window: "Up to 21 days before", charge: "Free cancellation allowed" },
      { window: "20–15 days before", charge: "25% of trip amount charged" },
      { window: "14–8 days before", charge: "50% of trip amount charged" },
      { window: "7–0 days before", charge: "100% charged — no refund" },
    ]);
  });

  it("uses the approved policy and legacy carry text for an existing trek without structured details", () => {
    const details = normalizeTripDetails({}, "Water bottle\n- Trekking shoes");

    expect(details.thingsToCarry.map((item) => item.text)).toEqual(["Water bottle", "Trekking shoes"]);
    expect(details.cancellationPolicy).toEqual(STANDARD_CANCELLATION_POLICY);
  });

  it("maps recognized legacy headings into their structured public sections", () => {
    const details = normalizeTripDetails({}, [
      "INCLUSIONS & EXCLUSIONS",
      "Inclusions",
      "1. Local guide",
      "Exclusions",
      "1. Personal expenses",
      "TREK PACKAGE",
      "₹ 5,499/- Non-AC sleeper class",
      "PAYMENT POLICY",
      "Pay the balance seven days before",
      "the trek.",
      "PACKING LIST",
      "1. Water bottle",
      "CANCELLATION & REFUND POLICY",
      "Up to 21 days before Free cancellation allowed",
      "Calculated from the trek start date.",
      "THINGS TO KEEP IN MIND",
      "Stay with the group.",
    ].join("\n"));

    expect(details.inclusions.map((item) => item.text)).toEqual(["Local guide"]);
    expect(details.exclusions.map((item) => item.text)).toEqual(["Personal expenses"]);
    expect(details.packages).toEqual([
      expect.objectContaining({ name: "Non-AC sleeper class", price: "₹ 5,499/-" }),
    ]);
    expect(details.paymentPolicy.map((item) => item.terms)).toEqual(["Pay the balance seven days before the trek."]);
    expect(details.thingsToCarry.map((item) => item.text)).toEqual(["Water bottle"]);
    expect(details.cancellationPolicy).toEqual([
      expect.objectContaining({ window: "Up to 21 days before", charge: "Free cancellation allowed" }),
    ]);
    expect(details.cancellationNotes).toBe("Calculated from the trek start date.");
    expect(details.thingsToKeepInMind.flatMap((section) => section.instructions.map((item) => item.text))).toEqual(["Stay with the group."]);
  });

  it("preserves custom policy row order through edit serialization and loading", () => {
    const saved = serializeTripDetails({
      ...createDefaultTripDetails(),
      cancellationPolicy: [
        { id: "late", window: "3–0 days before", charge: "No refund" },
        { id: "early", window: "30 days before", charge: "Free cancellation" },
      ],
    });

    const loaded = normalizeTripDetails(saved);
    expect(loaded.cancellationPolicy.map((row) => row.id)).toEqual(["late", "early"]);
    expect(loaded.cancellationPolicy.map((row) => row.window)).toEqual([
      "3–0 days before",
      "30 days before",
    ]);
  });

  it("respects an explicitly saved empty policy instead of restoring the fallback", () => {
    const details = normalizeTripDetails({ cancellationPolicy: [] });

    expect(details.cancellationPolicy).toEqual([]);
  });

  it("removes empty draft entries before saving", () => {
    const saved = serializeTripDetails({
      ...createDefaultTripDetails(),
      inclusions: [
        { id: "blank", text: "  " },
        { id: "guide", text: "  Local guide  " },
      ],
      packages: [{ id: "empty-package", name: "", price: "", priceAmount: null, priceBasis: "per_person", currency: "INR", details: "" }],
      thingsToKeepInMind: [{ id: "mind", heading: "  Trail conduct  ", instructions: [{ id: "follow", text: "  Follow the guide  " }] }],
      cancellationNotes: "  Refunds are processed after confirmation.  ",
    });

    expect(saved.inclusions).toEqual([{ id: "guide", text: "Local guide" }]);
    expect(saved.packages).toEqual([]);
    expect(saved.thingsToKeepInMind).toEqual([{ id: "mind", heading: "Trail conduct", instructions: [{ id: "follow", text: "Follow the guide" }] }]);
    expect(saved.cancellationNotes).toBe("Refunds are processed after confirmation.");
  });

  it("maps legacy payment and keep-in-mind entries without discarding their text", () => {
    const details = normalizeTripDetails({
      paymentPolicy: [{ id: "legacy-pay", text: "Pay after confirmation" }],
      thingsToKeepInMind: [
        { id: "legacy-heading", text: "TRAIN TICKETS:" },
        { id: "legacy-mind", text: "Stay with the group" },
      ],
    });

    expect(details.paymentPolicy).toEqual([{ id: "legacy-pay", title: "", terms: "Pay after confirmation" }]);
    expect(details.thingsToKeepInMind[0]).toEqual(expect.objectContaining({
      heading: "TRAIN TICKETS",
      instructions: [expect.objectContaining({ text: "Stay with the group" })],
    }));
  });
});

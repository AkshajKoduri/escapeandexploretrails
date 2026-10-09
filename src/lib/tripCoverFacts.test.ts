import { describe, expect, it } from "vitest";
import { getTripCoverFacts } from "@/lib/tripCoverFacts";

const facts = (altitude: string, elevation_gain: string) => [
  { key: "altitude", label: "Altitude", value: altitude },
  { key: "elevation_gain", label: "Elevation gain", value: elevation_gain },
];

describe("trip cover facts", () => {
  it("shows configured altitude and elevation gain for hikes and hides empty or N/A values", () => {
    expect(getTripCoverFacts(facts("2,000 m", "700 m"), "Hike")).toEqual([
      { label: "Altitude", value: "2,000 m" }, { label: "Elevation gain", value: "700 m" },
    ]);
    expect(getTripCoverFacts(facts("N/A", " "), "Monsoon Trek")).toEqual([]);
  });

  it("omits altitude for cycling events but retains configured elevation gain", () => {
    expect(getTripCoverFacts(facts("1,000 m", "250 m"), "Cycling Ride")).toEqual([
      { label: "Elevation gain", value: "250 m" },
    ]);
    expect(getTripCoverFacts(facts("1,000 m", "N/A"), "Bike Ride")).toEqual([]);
  });
});

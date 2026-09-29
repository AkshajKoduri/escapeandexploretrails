import { describe, expect, it } from "vitest";
import { normalizeAssemblyTime, normalizeHighlights, normalizeTripPhotos } from "./tripContent";

describe("optional trip content", () => {
  it.each([null, undefined, "", "  ", "NA", "na", " N/A ", "n/a"])("hides missing assembly time %s", (value) => {
    expect(normalizeAssemblyTime(value)).toBeNull();
  });
  it("retains actual times and the order of configured highlights", () => {
    expect(normalizeAssemblyTime(" 6:00 AM ")).toBe("6:00 AM");
    expect(normalizeHighlights([" Sunset ", "", "Waterfalls", null])).toEqual(["Sunset", "Waterfalls"]);
  });
  it("reads old trips without new fields and rejects invalid media URLs", () => {
    expect(normalizeHighlights(undefined)).toEqual([]);
    expect(normalizeTripPhotos(undefined)).toEqual([]);
    expect(normalizeTripPhotos([{ id: "a", url: "javascript:alert(1)" }, { id: "b", url: "https://example.com/trip.jpg", path: "trips/b.jpg", alt: " Hill " }])).toEqual([{ id: "b", url: "https://example.com/trip.jpg", path: "trips/b.jpg", alt: "Hill" }]);
  });
});

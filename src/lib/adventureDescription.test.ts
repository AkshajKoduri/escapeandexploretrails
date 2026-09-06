import { describe, expect, it } from "vitest";
import { formatAdventureDescription } from "./adventureDescription";

describe("formatAdventureDescription", () => {
  it("formats known headings and bullets without changing their text", () => {
    const result = formatAdventureDescription(
      "**Summary:** A forest trail.\n\n**Inclusions**\n- Guide\n- Breakfast",
    );

    expect(result).toEqual([
      { heading: "Summary", blocks: [{ type: "paragraph", text: "A forest trail." }] },
      { heading: "Inclusions", blocks: [{ type: "list", items: ["Guide", "Breakfast"] }] },
    ]);
  });

  it("preserves unknown content as prose and removes markdown markers", () => {
    const result = formatAdventureDescription("A **steady** climb\nwith a shaded finish.");
    expect(result).toEqual([
      {
        blocks: [
          { type: "paragraph", text: "A steady climb" },
          { type: "paragraph", text: "with a shaded finish." },
        ],
      },
    ]);
  });

  it("recognizes the section labels used by current trek content", () => {
    const result = formatAdventureDescription(
      "Detailed Itinerary\nDay 1 - Arrival\n06:00 AM - Start\n\nWhat's Not Included\nPersonal expenses\n\nTrek Package\nBooking Amount: ₹2,999",
    );

    expect(result.map((section) => section.heading)).toEqual([
      "Detailed itinerary",
      "What's not included",
      "Trek package",
    ]);
    expect(result[0].blocks[0]).toEqual({ type: "subheading", text: "Day 1 - Arrival" });
    expect(result[2].blocks[0]).toEqual({ type: "list", items: ["Booking Amount: ₹2,999"] });
  });

  it("removes a duplicated adventure-name line", () => {
    const result = formatAdventureDescription("Ahobilam Trek\n\nOverview:\nRocky terrain.", "Ahobilam Trek");
    expect(result).toEqual([
      { heading: "Overview", blocks: [{ type: "paragraph", text: "Rocky terrain." }] },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { departureStatus, normalizeDepartureStatuses, publicDepartureDates } from "./departureStatus";

describe("Admin-controlled departure display", () => {
  it("preserves independent statuses for each date and defaults missing dates", () => {
    const trip = { departureStatuses: normalizeDepartureStatuses({ "2026-11-01": "Full", "2026-11-08": "Waiting List", "2026-11-15": "Last Few" }) };
    expect(departureStatus(trip, "2026-11-01")).toBe("Full");
    expect(departureStatus(trip, "2026-11-08")).toBe("Waiting List");
    expect(departureStatus(trip, "2026-11-15")).toBe("Last Few");
    expect(departureStatus(trip, "2026-11-22")).toBe("Available");
  });
  it("ignores invalid labels and sorts all dates without duplicates", () => {
    expect(normalizeDepartureStatuses({ "2026-11-01": "5 seats left", invalid: "Full" })).toEqual({});
    expect(publicDepartureDates(["2026-11-08", "2026-11-01", "2026-11-08", ""])).toEqual(["2026-11-01", "2026-11-08"]);
  });
});

import { describe, expect, it } from "vitest";
import { getPriorityTripSeo } from "./priorityTripSeo";

describe("priority trip SEO profiles", () => {
  it("maps Badami to its beginner-friendly Hyderabad profile", () => {
    const profile = getPriorityTripSeo("Badami Rock Climbing & Exploration");
    expect(profile?.title).toContain("from Hyderabad");
    expect(profile?.faqs.map((faq) => faq.answer).join(" ")).toContain("beginner friendly");
  });

  it("maps Kudremukha to the dual-departure profile", () => {
    const profile = getPriorityTripSeo("Kudremukha & Nethravathi Peak Trek");
    expect(profile?.faqs.map((faq) => faq.answer).join(" ")).toContain("Bengaluru");
  });

  it("maps AMK to the difficult trek profile", () => {
    const profile = getPriorityTripSeo("AMK Trek");
    expect(profile?.faqs.map((faq) => faq.answer).join(" ")).toContain("difficult trek");
  });

  it("leaves unprioritized trips unchanged", () => {
    expect(getPriorityTripSeo("Ananthagiri Hills Hike")).toBeNull();
  });
});

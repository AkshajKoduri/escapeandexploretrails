import { describe, expect, it } from "vitest";
import {
  itineraryCanonicalUrl,
  itineraryPreviewImageUrl,
  renderItineraryPreviewHtml,
} from "./itineraryPreview";

const exampleTrip = {
  id: "8b650c28-3e35-4f6c-9290-7087cf1461ba",
  name: "Hike & Rappelling at Bhongir Fort",
  description: "Explore Bhongir Fort on a guided hike and rappelling adventure.",
  destination: "Bhongir Fort",
  image_url: "https://rpxbufmqncctrrdobzkr.supabase.co/storage/v1/object/public/trek-images/bhongir.jpg",
};

function meta(html: string, selector: string, attribute: string): string | null {
  const document = new DOMParser().parseFromString(html, "text/html");
  return document.querySelector(selector)?.getAttribute(attribute) ?? null;
}

describe("itinerary crawler preview metadata", () => {
  it("identifies adventure links as well as itinerary links", () => {
    const html = renderItineraryPreviewHtml(exampleTrip.id, exampleTrip, false, "adventures");
    expect(meta(html, 'meta[property="og:url"]', "content")).toBe(`https://e2trails.in/adventures/${exampleTrip.id}`);
    expect(meta(html, 'meta[property="og:title"]', "content")).toBe(exampleTrip.name);
  });
  it("renders trip-specific Open Graph, Twitter, and canonical metadata", () => {
    const html = renderItineraryPreviewHtml(exampleTrip.id, exampleTrip);
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.title).toBe("Hike & Rappelling at Bhongir Fort");
    expect(meta(html, 'meta[property="og:title"]', "content")).toBe(exampleTrip.name);
    expect(meta(html, 'meta[property="og:description"]', "content")).toBe(exampleTrip.description);
    expect(meta(html, 'meta[property="og:url"]', "content")).toBe(itineraryCanonicalUrl(exampleTrip.id));
    expect(meta(html, 'meta[property="og:image"]', "content")).toBe(exampleTrip.image_url);
    expect(meta(html, 'meta[name="twitter:card"]', "content")).toBe("summary_large_image");
    expect(meta(html, 'meta[name="twitter:title"]', "content")).toBe(exampleTrip.name);
    expect(meta(html, 'meta[name="twitter:image"]', "content")).toBe(exampleTrip.image_url);
    expect(html).not.toContain("itinerary_file_path");
    expect(html).not.toContain("/object/sign/");
  });

  it("renders the second published itinerary with its own trip identity", () => {
    const secondId = "a282b760-4a9c-444f-ac2c-41520039f692";
    const html = renderItineraryPreviewHtml(secondId, {
      id: secondId,
      name: "Ahobilam Nava Narasimha & Ugrastambam Trek",
      description: "Explore the Nava Narasimha temples and Ugrastambam trail.",
      image_url: "https://e2trails.in/og-image.jpg",
    });
    expect(meta(html, 'meta[property="og:title"]', "content"))
      .toBe("Ahobilam Nava Narasimha & Ugrastambam Trek");
    expect(meta(html, 'meta[property="og:url"]', "content"))
      .toBe(itineraryCanonicalUrl(secondId));
  });

  it("uses a stable brand image when a cover is missing or temporary", () => {
    expect(itineraryPreviewImageUrl(null)).toBe("https://e2trails.in/og-image.jpg");
    expect(itineraryPreviewImageUrl("https://storage.example/object/sign/cover.jpg?token=temporary"))
      .toBe("https://e2trails.in/og-image.jpg");
    const html = renderItineraryPreviewHtml(exampleTrip.id, { ...exampleTrip, image_url: null });
    expect(meta(html, 'meta[property="og:image"]', "content")).toBe("https://e2trails.in/og-image.jpg");
  });

  it("does not expose trip details for a missing or unpublished trip", () => {
    const html = renderItineraryPreviewHtml(exampleTrip.id, null, true);
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.title).toBe("E2 Trails Itinerary");
    expect(meta(html, 'meta[name="robots"]', "content")).toBe("noindex, nofollow");
    expect(html).not.toContain(exampleTrip.name);
    expect(meta(html, 'meta[property="og:image"]', "content")).toBe("https://e2trails.in/og-image.jpg");
  });

  it("escapes metadata values while preserving readable special characters", () => {
    const html = renderItineraryPreviewHtml(exampleTrip.id, {
      ...exampleTrip,
      name: 'Hike "Bhongir" <Fort>',
      description: "Ride, hike & explore",
    });
    expect(meta(html, 'meta[property="og:title"]', "content")).toBe('Hike "Bhongir" <Fort>');
    expect(meta(html, 'meta[property="og:description"]', "content")).toBe("Ride, hike & explore");
  });
});

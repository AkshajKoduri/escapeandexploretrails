export type ItineraryPreviewTrip = {
  id: string;
  name: string;
  description?: string | null;
  destination?: string | null;
  location?: string | null;
  image_url?: string | null;
};

const SITE_ORIGIN = "https://e2trails.in";
const DEFAULT_IMAGE = `${SITE_ORIGIN}/og-image.jpg`;

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

export function itineraryCanonicalUrl(id: string): string {
  return `${SITE_ORIGIN}/itinerary/${encodeURIComponent(id)}`;
}

export function itineraryPreviewImageUrl(value?: string | null): string {
  if (!value) return DEFAULT_IMAGE;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return DEFAULT_IMAGE;
    // Cover art should be stable and publicly accessible, never a temporary
    // signed object URL that will expire before a social preview is refreshed.
    if (/\/object\/sign\//i.test(url.pathname) || url.searchParams.has("token") || url.searchParams.has("expires")) {
      return DEFAULT_IMAGE;
    }
    return url.toString();
  } catch {
    return DEFAULT_IMAGE;
  }
}

export function itineraryPreviewDescription(trip?: ItineraryPreviewTrip | null): string {
  if (!trip) return "Explore unforgettable outdoor experiences across India with E2 Trails.";
  const raw = trip.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const place = trip.destination?.trim() || trip.location?.trim();
  const fallback = place
    ? `Discover ${trip.name} in ${place} with E2 Trails, a Hyderabad-based adventure travel company.`
    : `Discover ${trip.name} with E2 Trails, a Hyderabad-based adventure travel company.`;
  const description = raw || fallback;
  return description.length > 300 ? `${description.slice(0, 297).trimEnd()}...` : description;
}

export function renderItineraryPreviewHtml(
  trekId: string,
  trip?: ItineraryPreviewTrip | null,
  notFound = false,
): string {
  const url = itineraryCanonicalUrl(trekId);
  const title = trip?.name?.trim() || "E2 Trails Itinerary";
  const description = itineraryPreviewDescription(trip);
  const image = itineraryPreviewImageUrl(trip?.image_url);
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeUrl = escapeHtml(url);
  const safeImage = escapeHtml(image);
  const noindex = notFound ? '<meta name="robots" content="noindex, nofollow">' : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  ${noindex}
  <link rel="canonical" href="${safeUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="E2 Trails">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:alt" content="${safeTitle} adventure with E2 Trails">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">
</head>
<body>
  <main>
    <h1>${safeTitle}</h1>
    <p>${safeDescription}</p>
    <p><a href="${safeUrl}">Open this itinerary on E2 Trails</a></p>
  </main>
</body>
</html>`;
}

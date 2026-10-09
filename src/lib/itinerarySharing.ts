import { safeHttpUrl } from "@/lib/tripContent";

export type ItinerarySource = { id: string; name: string; itineraryFilePath?: string | null; itineraryUrl?: string | null };

export function hasItineraryPdf(source: ItinerarySource): boolean {
  return !!source.itineraryFilePath || !!safeHttpUrl(source.itineraryUrl);
}

export function itineraryShareUrl(id: string, origin = window.location.origin): string {
  return new URL(`/itinerary/${encodeURIComponent(id)}`, origin).href;
}

export function itineraryFilename(name: string): string {
  return `${name.normalize("NFKD").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 90) || "e2-trails"}-itinerary.pdf`;
}

export function whatsappItineraryShare(source: ItinerarySource, origin?: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${source.name} — itinerary\n${itineraryShareUrl(source.id, origin)}`)}`;
}

// The server validates publication and obtains fresh storage access per request.
export async function resolveItineraryUrl(source: ItinerarySource): Promise<string> {
  if (!hasItineraryPdf(source)) throw new Error("No itinerary PDF is available for this trip.");
  const external = safeHttpUrl(source.itineraryUrl);
  if (!source.itineraryFilePath && external && new URL(external).hostname !== "drive.google.com") return external;
  return `/api/itinerary-pdf?trekId=${encodeURIComponent(source.id)}&view=inline`;
}

export async function loadItineraryFile(source: ItinerarySource): Promise<File> {
  const attempts = source.itineraryFilePath ? 2 : 1;
  let lastErrorMessage = "";
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      // Mint a URL for each private-storage attempt so an expired URL is replaced.
      const resolved = await resolveItineraryUrl(source);
      const url = resolved.startsWith("/api/") ? resolved.replace("&view=inline", "") : resolved;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        const message = response.headers?.get("content-type")?.startsWith("text/plain") ? await response.text() : "The itinerary PDF could not be fetched.";
        throw new Error(message);
      }
      const data = await response.arrayBuffer();
      const expectedLength = Number(response.headers?.get("content-length"));
      if (!response.headers?.get("content-encoding") && expectedLength > 0 && data.byteLength !== expectedLength) {
        throw new Error("The itinerary download was incomplete. Please try again.");
      }
      const bytes = new Uint8Array(data);
      if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") {
        throw new Error("The downloaded file is not a PDF. Open the itinerary page to access the full document.");
      }
      return new File([data], itineraryFilename(source.name), { type: "application/pdf" });
    } catch (failure) {
      lastErrorMessage = failure && typeof failure === "object" && "message" in failure
        ? String(failure.message)
        : "The itinerary PDF could not be downloaded.";
    }
  }
  throw new Error(lastErrorMessage || "The itinerary PDF could not be downloaded. Please try again or open the itinerary page.");
}

export function downloadItineraryFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function shareItinerary(source: ItinerarySource, file?: File): Promise<"shared" | "cancelled" | "unsupported" | "failed"> {
  if (!navigator.share) return "unsupported";
  try {
    if (file && (!navigator.canShare || !navigator.canShare({ files: [file] }))) return "unsupported";
    await navigator.share(file ? { title: source.name, files: [file] } : { title: `${source.name} — itinerary`, url: itineraryShareUrl(source.id) });
    return "shared";
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "AbortError") return "cancelled";
    return "failed";
  }
}

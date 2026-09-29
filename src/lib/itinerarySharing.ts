import { supabase } from "@/integrations/supabase/client";
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

// Always obtain a new signed URL for an action. Only the stable page is shared.
export async function resolveItineraryUrl(source: ItinerarySource): Promise<string> {
  if (source.itineraryFilePath) {
    const { data, error } = await supabase.functions.invoke("itinerary-signed-url", { body: { trekId: source.id } });
    const url = safeHttpUrl(data?.url);
    if (error || !url) throw new Error("The itinerary PDF is unavailable. Please try again.");
    return url;
  }
  const url = safeHttpUrl(source.itineraryUrl);
  if (!url) throw new Error("No itinerary PDF is available for this trip.");
  return url;
}

export async function loadItineraryFile(source: ItinerarySource): Promise<File> {
  const url = await resolveItineraryUrl(source);
  const response = await fetch(url);
  if (!response.ok) throw new Error("The itinerary could not be downloaded. Open the PDF to download it from its provider.");
  const data = await response.arrayBuffer();
  const bytes = new Uint8Array(data);
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("This provider opens the itinerary on its own page. Open the PDF and use the provider’s download option.");
  }
  return new File([data], itineraryFilename(source.name), { type: "application/pdf" });
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

export async function shareItinerary(source: ItinerarySource, file?: File): Promise<"shared" | "cancelled" | "unsupported"> {
  if (!navigator.share) return "unsupported";
  try {
    if (file && (!navigator.canShare || !navigator.canShare({ files: [file] }))) return "unsupported";
    await navigator.share(file ? { title: source.name, files: [file] } : { title: `${source.name} — itinerary`, url: itineraryShareUrl(source.id) });
    return "shared";
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "AbortError") return "cancelled";
    return "unsupported";
  }
}

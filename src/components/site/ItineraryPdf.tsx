import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { resolveItineraryUrl, type ItinerarySource } from "@/lib/itinerarySharing";

export default function ItineraryPdf({ source }: { source: ItinerarySource }) {
  const { id, name, itineraryFilePath, itineraryUrl } = source;
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(false);
    resolveItineraryUrl({ id, name, itineraryFilePath, itineraryUrl }).then((href) => { if (!cancelled) setUrl(href); }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [id, name, itineraryFilePath, itineraryUrl, retry]);

  if (error) return <div role="alert" className="rounded-xl border border-border p-6"><p>The itinerary PDF couldn’t load.</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="btn-outline mt-4">Try again</button></div>;
  if (!url) return <p role="status" className="py-8 text-muted-foreground">Loading PDF…</p>;
  return <div className="space-y-3">
    <a href={url} target="_blank" rel="noopener noreferrer" className="btn-outline"><ExternalLink className="h-4 w-4" aria-hidden="true" />Open PDF in a new tab</a>
    <p className="text-sm text-muted-foreground">If the preview is unavailable, open the PDF in a new tab. External providers may show their own viewer and download controls.</p>
    <div className="overflow-hidden rounded-xl border border-border bg-muted">
      <object data={url} type="application/pdf" aria-label={`${source.name} itinerary PDF`} className="h-[70dvh] min-h-[300px] w-full">
        <p className="p-6 text-sm">Your browser or this provider cannot display a preview. <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Open the itinerary PDF</a>.</p>
      </object>
    </div>
    <button type="button" className="text-sm font-semibold underline" onClick={() => setRetry((value) => value + 1)}>Refresh PDF access</button>
  </div>;
}

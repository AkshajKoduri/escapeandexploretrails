import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Share2, Download, Copy, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { downloadItineraryFile, hasItineraryPdf, itineraryShareUrl, loadItineraryFile, shareItinerary, type ItinerarySource } from "@/lib/itinerarySharing";

export default function ItineraryCoverShare({ source }: { source: ItinerarySource }) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File>();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { id, name, itineraryFilePath, itineraryUrl } = source;
  const hasPdf = hasItineraryPdf(source);
  const viewer = `/itinerary/${encodeURIComponent(id)}?view=pdf`;

  useEffect(() => {
    if (!hasPdf || !window.matchMedia("(pointer: coarse)").matches || !navigator.share) return;
    let cancelled = false;
    // Prepare ahead of the tap so native sharing retains user activation.
    void loadItineraryFile({ id, name, itineraryFilePath, itineraryUrl }).then(pdf => {
      if (!cancelled) setFile(pdf);
    }).catch(() => { /* Share the stable link if the PDF is not ready. */ });
    return () => { cancelled = true; };
  }, [id, name, itineraryFilePath, itineraryUrl, hasPdf]);

  if (!hasPdf) return null;

  const share = async () => {
    if (!window.matchMedia("(pointer: coarse)").matches) { navigate(viewer); return; }
    setBusy(true);
    setError("");
    let supportedFile: File | undefined;
    try { if (file && navigator.canShare?.({ files: [file] })) supportedFile = file; } catch { /* Use a link. */ }
    const result = await shareItinerary(source, supportedFile);
    setBusy(false);
    if (result === "unsupported") {
      setMessage("Sharing is unavailable. You can copy the link, open or download the PDF.");
      setOpen(true);
    }
  };
  const download = async () => {
    setBusy(true); setError("");
    try { const pdf = file ?? await loadItineraryFile(source); setFile(pdf); downloadItineraryFile(pdf); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not download the PDF. Please try again."); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(itineraryShareUrl(id)); setMessage("Itinerary link copied."); }
    catch { setMessage("Select and copy the link below."); }
  };

  return <>
    <button type="button" aria-label="Share itinerary" title="Share itinerary" disabled={busy} aria-busy={busy} onClick={() => void share()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-charcoal/75 text-white hover:bg-charcoal disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
      <Share2 className="h-5 w-5" aria-hidden="true" />
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Share itinerary</DialogTitle><DialogDescription>{source.name}</DialogDescription></DialogHeader>
        <p role="status" className="text-sm text-muted-foreground">{message}</p>
        <Link to={viewer} className="btn-outline"><FileText className="h-4 w-4" aria-hidden="true" />Open PDF</Link>
        <button type="button" className="btn-outline" disabled={busy} onClick={() => void download()}><Download className="h-4 w-4" aria-hidden="true" />{busy ? "Preparing PDF…" : "Download PDF"}</button>
        <button type="button" className="btn-outline" onClick={() => void copy()}><Copy className="h-4 w-4" aria-hidden="true" />Copy link</button>
        <label className="text-sm">Itinerary link<input className="field-input mt-2" readOnly value={itineraryShareUrl(id)} onFocus={event => event.target.select()} /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  </>;
}

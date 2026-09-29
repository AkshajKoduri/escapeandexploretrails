import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Download, FileText, Share2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { downloadItineraryFile, hasItineraryPdf, itineraryShareUrl, loadItineraryFile, shareItinerary, whatsappItineraryShare, type ItinerarySource } from "@/lib/itinerarySharing";

export default function ItineraryActions({ source, onCover = false, showView = true }: { source: ItinerarySource; onCover?: boolean; showView?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const hasPdf = hasItineraryPdf(source);
  const button = cn(onCover ? "btn-ghost-light" : "btn-outline", "min-h-[44px] text-sm");
  const stableUrl = itineraryShareUrl(source.id);

  const prepare = async (download: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const pdf = file ?? await loadItineraryFile(source);
      setFile(pdf);
      if (download) downloadItineraryFile(pdf);
      else setMessage("PDF ready. Tap Share PDF to choose an available app.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Couldn’t download the PDF. Open the itinerary to try its provider’s download option.");
    } finally { setBusy(false); }
  };

  const nativeShare = async (pdf?: File) => {
    const result = await shareItinerary(source, pdf);
    if (result === "unsupported") setMessage("Sharing isn’t available for this content on your device. Copy the link or download the PDF instead.");
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(stableUrl); toast.success("Itinerary link copied"); }
    catch { setMessage("Select and copy the itinerary link below."); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {hasPdf && showView && <Link to={`/itinerary/${source.id}?view=pdf`} className={button}><FileText className="h-4 w-4" aria-hidden="true" />View itinerary PDF</Link>}
        {hasPdf && <button type="button" className={button} disabled={busy} onClick={() => void prepare(true)}><Download className="h-4 w-4" aria-hidden="true" />{busy ? "Preparing PDF…" : "Download itinerary PDF"}</button>}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><button type="button" className={button}><Share2 className="h-4 w-4" aria-hidden="true" />Share itinerary</button></DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>Share itinerary</DialogTitle><DialogDescription>Send {source.name} to your travel companions.</DialogDescription></DialogHeader>
            <div className="flex flex-col gap-3">
              <a className="btn-primary" href={whatsappItineraryShare(source)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" aria-hidden="true" />Share link on WhatsApp</a>
              <button type="button" className="btn-outline" onClick={() => void nativeShare()}><Share2 className="h-4 w-4" aria-hidden="true" />Choose an app / Instagram</button>
              <p className="text-sm text-muted-foreground">Choose Instagram if your device offers it. Otherwise, copy the itinerary link and paste it into an Instagram message. Available apps and supported files vary by device.</p>
              {hasPdf && <>
                <button type="button" className="btn-outline" disabled={busy} onClick={() => file ? void nativeShare(file) : void prepare(false)}>{file ? "Share PDF" : busy ? "Preparing PDF…" : "Prepare PDF to share"}</button>
                <button type="button" className="btn-outline" disabled={busy} onClick={() => void prepare(true)}><Download className="h-4 w-4" aria-hidden="true" />Download PDF</button>
              </>}
              <button type="button" className="btn-outline" onClick={() => void copy()}><Copy className="h-4 w-4" aria-hidden="true" />Copy link</button>
              <label className="text-sm font-semibold">Itinerary link<input readOnly value={stableUrl} onFocus={(event) => event.target.select()} className="field-input mt-2 text-sm" /></label>
              {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
              {error && <p role="alert" className="text-sm text-destructive">{error} <Link className="underline" to={`/itinerary/${source.id}?view=pdf`}>Open itinerary</Link></p>}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {error && !open && <p role="alert" className={cn("text-sm", onCover ? "text-white" : "text-destructive")}>{error} <Link className="underline" to={`/itinerary/${source.id}?view=pdf`}>Open itinerary</Link></p>}
    </div>
  );
}

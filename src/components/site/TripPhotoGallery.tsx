import { useState } from "react";
import { ChevronLeft, ChevronRight, Images, Mountain } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { TripPhoto } from "@/lib/tripContent";

export default function TripPhotoGallery({ photos, name }: { photos: TripPhoto[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  if (!photos.length) return null;
  const current = photos[index] ?? photos[0];
  const move = (delta: number) => { setIndex((value) => (value + delta + photos.length) % photos.length); setFailed(null); };
  return <Dialog>
    <DialogTrigger asChild><button type="button" className="btn-ghost-light min-h-[44px]"><Images className="h-4 w-4" aria-hidden="true" />View photos ({photos.length})</button></DialogTrigger>
    <DialogContent className="w-[calc(100%-1rem)] max-w-5xl max-h-[95dvh] overflow-y-auto p-4 sm:p-6 [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:grid [&>button:last-child]:place-items-center" onKeyDown={(event) => { if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); } if (event.key === "ArrowRight") { event.preventDefault(); move(1); } }}>
      <DialogHeader className="pr-12"><DialogTitle>{name} photos</DialogTitle><DialogDescription>Explore the trip in pictures. Use the arrow buttons or your keyboard to browse.</DialogDescription></DialogHeader>
      <div className="grid min-h-[200px] place-items-center rounded-lg bg-muted">
        {failed === current.id ? <div className="p-10 text-center"><Mountain className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm text-muted-foreground">This photo is unavailable. Try the next photo.</p></div> : <img src={current.url} alt={current.alt || `${name} — photo ${index + 1}`} className="max-h-[62dvh] w-full object-contain" onError={() => setFailed(current.id)} />}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="btn-outline px-3 sm:px-5" disabled={photos.length < 2} onClick={() => move(-1)} aria-label="Previous photo"><ChevronLeft className="h-5 w-5" aria-hidden="true" /><span className="hidden sm:inline">Previous</span></button>
        <p role="status" className="text-sm font-semibold">Photo {index + 1} of {photos.length}</p>
        <button type="button" className="btn-outline px-3 sm:px-5" disabled={photos.length < 2} onClick={() => move(1)} aria-label="Next photo"><span className="hidden sm:inline">Next</span><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
      </div>
    </DialogContent>
  </Dialog>;
}

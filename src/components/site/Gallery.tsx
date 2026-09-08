import { useEffect, useRef, useState } from "react";
import { Instagram, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import g1 from "@/assets/gallery-1-960.webp";
import g1Small from "@/assets/gallery-1-480.webp";
import g2 from "@/assets/gallery-2-960.webp";
import g2Small from "@/assets/gallery-2-480.webp";
import g3 from "@/assets/gallery-3-960.webp";
import g3Small from "@/assets/gallery-3-480.webp";
import g4 from "@/assets/gallery-4-960.webp";
import g4Small from "@/assets/gallery-4-480.webp";
import g5 from "@/assets/gallery-5-960.webp";
import g5Small from "@/assets/gallery-5-480.webp";
import g6 from "@/assets/gallery-6-960.webp";
import g6Small from "@/assets/gallery-6-480.webp";
import g7 from "@/assets/gallery-7-960.webp";
import g7Small from "@/assets/gallery-7-480.webp";

type Category = "Hike" | "Cycling Ride" | "Monsoon Trek" | "Bike Ride" | "General";

type GalleryItem = {
  id: string;
  url: string;
  alt: string;
  category: Category;
  srcSet?: string;
  width?: number;
  height?: number;
};

type GalleryRow = {
  id: string;
  image_url: string | null;
  storage_path: string | null;
  category: string | null;
  display_order: number | null;
  alt_text: string | null;
};

type SignedUrlRow = { path: string; signedUrl: string | null };

const FALLBACK_ITEMS: GalleryItem[] = [
  { id: "static-1", url: g1, srcSet: `${g1Small} 480w, ${g1} 848w`, width: 848, height: 1024, alt: "Adventure trail moment with E2 Trails", category: "General" },
  { id: "static-2", url: g2, srcSet: `${g2Small} 480w, ${g2} 960w`, width: 960, height: 908, alt: "Adventure trail moment with E2 Trails", category: "General" },
  { id: "static-3", url: g3, srcSet: `${g3Small} 480w, ${g3} 960w`, width: 960, height: 802, alt: "Adventure trail moment with E2 Trails", category: "General" },
  { id: "static-4", url: g4, srcSet: `${g4Small} 480w, ${g4} 960w`, width: 960, height: 957, alt: "Adventure trail moment with E2 Trails", category: "General" },
  { id: "static-5", url: g5, srcSet: `${g5Small} 480w, ${g5} 960w`, width: 960, height: 609, alt: "Adventure trail moment with E2 Trails", category: "General" },
  { id: "static-6", url: g6, srcSet: `${g6Small} 480w, ${g6} 960w`, width: 960, height: 610, alt: "Adventure trail moment with E2 Trails", category: "General" },
  { id: "static-7", url: g7, srcSet: `${g7Small} 480w, ${g7} 960w`, width: 960, height: 565, alt: "Adventure trail moment with E2 Trails", category: "General" },
];

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>(FALLBACK_ITEMS);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogWasOpenRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("id, image_url, storage_path, category, display_order, alt_text")
        .order("display_order", { ascending: true });
      if (error || !data) return;

      const rows = data as unknown as GalleryRow[];
      const paths = rows.map((r) => r.storage_path).filter(Boolean) as string[];
      const urlMap: Record<string, string> = {};
      if (paths.length) {
        const { data: signed } = await supabase.storage
          .from("gallery-images")
          .createSignedUrls(paths, 60 * 60 * 6);
        (signed ?? []).forEach((s: SignedUrlRow) => {
          if (s.path && s.signedUrl) urlMap[s.path] = s.signedUrl;
        });
      }

      const mapped: GalleryItem[] = rows
        .map((r) => ({
          id: r.id,
          url: (r.storage_path && urlMap[r.storage_path]) || r.image_url || "",
          alt: r.alt_text || "Gallery image",
          category: r.category as Category,
        }))
        .filter((i) => i.url);

      if (mapped.length > 0) setItems(mapped);
    })();
  }, []);

  const visible = items.slice(0, 5);

  const open = activeIndex !== null;
  const active = activeIndex !== null ? visible[activeIndex] : null;
  const prev = () => setActiveIndex((i) => (i === null ? i : (i - 1 + visible.length) % visible.length));
  const next = () => setActiveIndex((i) => (i === null ? i : (i + 1) % visible.length));

  useEffect(() => {
    if (open) {
      dialogWasOpenRef.current = true;
      return;
    }
    if (!dialogWasOpenRef.current) return;
    dialogWasOpenRef.current = false;
    const frame = requestAnimationFrame(() => lastTriggerRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  /** Four images on mobile; one additional frame completes the desktop mosaic. */
  const cellClass = (i: number) => {
    if (i === 0) return "aspect-square md:col-span-2 md:row-span-2 md:aspect-auto";
    return "aspect-square md:aspect-auto";
  };

  return (
    <section id="gallery" className="bg-muted/30 py-14 md:py-20 lg:py-24">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="kicker">Life out there</p>
            <h2 className="editorial-title mt-3">
              Moments on
              <span className="font-script text-accent"> the trail</span>
            </h2>
            <p className="editorial-lead">Real frames from real outings, shared by the people who were there.</p>
          </div>
          <a
            href="https://instagram.com/e2trails.in"
            target="_blank"
            rel="noreferrer"
            className="btn-outline shrink-0"
          >
            <Instagram className="w-4 h-4" aria-hidden="true" />
            Follow @e2trails.in
          </a>
        </div>

        {visible.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">New trail photographs are coming soon.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 md:auto-rows-[200px] md:grid-cols-4 md:gap-4">
            {visible.map((img, i) => (
              <button
                type="button"
                key={img.id}
                onClick={(event) => {
                  lastTriggerRef.current = event.currentTarget;
                  setActiveIndex(i);
                }}
                aria-label={`View photo: ${img.alt}`}
                className={cn(
                  "reveal group relative overflow-hidden rounded-lg cursor-pointer bg-muted",
                  cellClass(i),
                  i === 4 && "hidden md:block",
                )}
                style={{ transitionDelay: `${(i % 6) * 50}ms` }}
              >
                <img
                  src={img.url}
                  srcSet={img.srcSet}
                  sizes="(min-width: 768px) 25vw, 50vw"
                  alt={img.alt}
                  loading="lazy"
                  decoding="async"
                  width={img.width}
                  height={img.height}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/40 transition-colors duration-500 flex items-center justify-center">
                  <ZoomIn
                    className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300"
                    aria-hidden="true"
                  />
                </div>
                {img.category !== "General" && (
                  <span className="absolute bottom-3 left-3 pill bg-black/55 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {img.category}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => !o && setActiveIndex(null)}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            lastTriggerRef.current?.focus();
          }}
          className="max-w-[95vw] md:max-w-5xl p-0 border-0 bg-black/95 overflow-hidden"
        >
          <DialogTitle className="sr-only">Trail photo viewer</DialogTitle>
          <DialogDescription className="sr-only">Browse enlarged photos from E2 Trails outings.</DialogDescription>
          {active && (
            <div className="relative flex items-center justify-center w-full h-[85vh]">
              <img
                src={active.url}
                srcSet={active.srcSet}
                sizes="95vw"
                width={active.width}
                height={active.height}
                alt={active.alt}
                decoding="async"
                className="max-w-full max-h-full object-contain"
              />
              <button
                type="button"
                onClick={prev}
                aria-label="Previous photo"
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-6 h-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-6 h-6" aria-hidden="true" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-xs">
                {(activeIndex ?? 0) + 1} / {visible.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

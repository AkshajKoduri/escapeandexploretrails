import { useEffect, useMemo, useState } from "react";
import { Instagram, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";
import g5 from "@/assets/gallery-5.jpg";
import g6 from "@/assets/gallery-6.jpg";
import g7 from "@/assets/gallery-7.jpg";

type Category = "Hike" | "Cycling Ride" | "Monsoon Trek" | "Bike Ride" | "General";
type FilterType = "All" | Category;

type GalleryItem = {
  id: string;
  url: string;
  alt: string;
  category: Category;
};

const FALLBACK_ITEMS: GalleryItem[] = [
  { id: "static-1", url: g1, alt: "Adventure trail moment", category: "General" },
  { id: "static-2", url: g2, alt: "Adventure trail moment", category: "General" },
  { id: "static-3", url: g3, alt: "Adventure trail moment", category: "General" },
  { id: "static-4", url: g4, alt: "Adventure trail moment", category: "General" },
  { id: "static-5", url: g5, alt: "Adventure trail moment", category: "General" },
  { id: "static-6", url: g6, alt: "Adventure trail moment", category: "General" },
  { id: "static-7", url: g7, alt: "Adventure trail moment", category: "General" },
];

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "All", label: "All" },
  { key: "Hike", label: "Hikes" },
  { key: "Cycling Ride", label: "Cycling Rides" },
  { key: "Bike Ride", label: "Bike Rides" },
  { key: "Monsoon Trek", label: "Monsoon Treks" },
];

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>(FALLBACK_ITEMS);
  const [filter, setFilter] = useState<FilterType>("All");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);


  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("id, image_url, storage_path, category, display_order, alt_text")
        .order("display_order", { ascending: true });
      if (error || !data) return;

      const paths = data.map((r: any) => r.storage_path).filter(Boolean) as string[];
      let urlMap: Record<string, string> = {};
      if (paths.length) {
        const { data: signed } = await supabase.storage
          .from("gallery-images")
          .createSignedUrls(paths, 60 * 60 * 6);
        (signed ?? []).forEach((s: any) => {
          if (s.path && s.signedUrl) urlMap[s.path] = s.signedUrl;
        });
      }

      const mapped: GalleryItem[] = data.map((r: any) => ({
        id: r.id,
        url: (r.storage_path && urlMap[r.storage_path]) || r.image_url || "",
        alt: r.alt_text || "Gallery image",
        category: r.category as Category,
      })).filter((i) => i.url);

      if (mapped.length > 0) setItems(mapped);

    })();
  }, []);

  const visible = useMemo(
    () => (filter === "All" ? items : items.filter((i) => i.category === filter)),
    [items, filter],
  );

  const open = activeIndex !== null;
  const active = activeIndex !== null ? visible[activeIndex] : null;
  const prev = () =>
    setActiveIndex((i) => (i === null ? i : (i - 1 + visible.length) % visible.length));
  const next = () =>
    setActiveIndex((i) => (i === null ? i : (i + 1) % visible.length));

  return (
    <section id="gallery" className="py-24 md:py-32 bg-background">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto reveal">
          <span className="font-script text-accent text-xl">— Memories</span>
          <h2 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 text-primary">
            Moments on the Trail
          </h2>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2 reveal">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setActiveIndex(null); }}
                className={`px-5 py-2 rounded-full text-sm font-semibold font-heading transition-colors border ${
                  active
                    ? "bg-accent text-accent-foreground border-accent shadow-card"
                    : "bg-background text-primary border-border hover:bg-accent/10 hover:border-accent"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <p className="mt-14 text-center text-muted-foreground">
            No photos in this category yet.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {visible.map((img, i) => (
              <button
                type="button"
                key={img.id}
                onClick={() => setActiveIndex(i)}
                aria-label={`View photo: ${img.alt}`}
                className="reveal relative overflow-hidden rounded-xl group cursor-pointer aspect-square"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/50 transition-colors duration-500 flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-charcoal-foreground opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300" />
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-12 text-center reveal">
          <a
            href="https://instagram.com/e2trails.in"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 px-7 py-3 rounded-full bg-gradient-orange text-accent-foreground font-semibold hover:scale-105 transition-transform shadow-glow"
          >
            <Instagram className="w-5 h-5" />
            Follow Us @e2trails.in
          </a>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(o) => !o && setActiveIndex(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-5xl p-0 border-0 bg-black/95 overflow-hidden">
          {active && (
            <div className="relative flex items-center justify-center w-full h-[85vh]">
              <img
                src={active.url}
                alt={active.alt}
                className="max-w-full max-h-full object-contain"
              />
              <button
                type="button"
                onClick={prev}
                aria-label="Previous photo"
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
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

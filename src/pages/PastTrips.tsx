import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mountain, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

type PastTrek = {
  id: string;
  name: string;
  trek_date: string;
  destination: string | null;
  description: string | null;
  image_url: string | null;
  album: { id: string; image_url: string }[];
};

export default function PastTrips() {
  const [trips, setTrips] = useState<PastTrek[]>([]);
  const [lightbox, setLightbox] = useState<{ images: string[]; i: number } | null>(null);

  useEffect(() => {
    document.title = "Past Trips — E2 Trails";
    (async () => {
      const { data: treks } = await supabase
        .from("upcoming_treks")
        .select("*")
        .eq("is_archived", true)
        .order("trek_date", { ascending: false });
      const ids = (treks ?? []).map((t: any) => t.id);
      const { data: imgs } = ids.length
        ? await supabase.from("trip_album_images").select("*").in("trek_id", ids)
        : { data: [] as any[] };
      const byTrek = new Map<string, any[]>();
      (imgs ?? []).forEach((i: any) => {
        const a = byTrek.get(i.trek_id) ?? [];
        a.push(i); byTrek.set(i.trek_id, a);
      });
      setTrips((treks ?? []).map((t: any) => ({
        id: t.id, name: t.name, trek_date: t.trek_date,
        destination: t.destination, description: t.description, image_url: t.image_url,
        album: byTrek.get(t.id) ?? [],
      })));
    })();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-secondary/10 via-background to-primary/10">
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-30">
        <div className="container flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="E2 Trails" className="w-9 h-9 rounded-full bg-white object-contain p-0.5" />
            <span className="font-heading font-extrabold text-lg text-primary">E2 TRAILS</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back home
          </Link>
        </div>
      </header>

      <section className="container py-12 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="font-script text-accent text-xl">— Memories from the trail</span>
          <h1 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 text-primary">Past Trips</h1>
          <p className="mt-4 text-muted-foreground">
            Relive the climbs, the campfires and the views. Browse photo albums from completed E2 Trails adventures.
          </p>
        </div>

        {trips.length === 0 ? (
          <p className="text-center text-muted-foreground">No past trips archived yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((t) => {
              const cover = t.album[0]?.image_url ?? t.image_url;
              const allImages = [
                ...(t.image_url ? [t.image_url] : []),
                ...t.album.map((a) => a.image_url),
              ];
              return (
                <article key={t.id} className="group rounded-2xl overflow-hidden bg-card shadow-card border border-border hover:shadow-trail transition">
                  <button
                    onClick={() => allImages.length > 0 && setLightbox({ images: allImages, i: 0 })}
                    className="block relative w-full h-56 bg-muted overflow-hidden"
                  >
                    {cover ? (
                      <img src={cover} alt={t.name} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-muted-foreground"><Mountain className="w-10 h-10" /></div>
                    )}
                    {t.album.length > 0 && (
                      <span className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-semibold backdrop-blur">
                        📷 {t.album.length} photos
                      </span>
                    )}
                  </button>
                  <div className="p-5 space-y-2">
                    <h3 className="font-heading font-bold text-lg text-primary">{t.name}</h3>
                    <div className="text-xs text-muted-foreground">
                      📅 {new Date(t.trek_date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
                      {t.destination ? ` • 📍 ${t.destination}` : ""}
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground line-clamp-3">{t.description}</p>}
                    <div className="pt-2 text-xs text-muted-foreground italic">⭐ Trekker ratings — coming soon</div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20" onClick={() => setLightbox(null)}>
            <X className="w-6 h-6" />
          </button>
          <img src={lightbox.images[lightbox.i]} alt="" className="max-w-full max-h-[80vh] rounded-lg" onClick={(e) => e.stopPropagation()} />
          {lightbox.images.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 overflow-x-auto px-4">
              {lightbox.images.map((src, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, i }); }}
                  className={`w-16 h-16 rounded-md overflow-hidden border-2 ${i === lightbox.i ? "border-accent" : "border-transparent opacity-60"}`}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

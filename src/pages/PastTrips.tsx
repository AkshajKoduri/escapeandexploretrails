import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mountain, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

type PastTrek = {
  id: string;
  name: string;
  trek_date: string;
  destination: string | null;
  description: string | null;
  image_url: string | null;
  album_url: string | null;
};

export default function PastTrips() {
  const [trips, setTrips] = useState<PastTrek[]>([]);

  useEffect(() => {
    document.title = "Past Trips — E2 Trails";
    (async () => {
      const { data: treks } = await supabase
        .from("upcoming_treks")
        .select("id,name,trek_date,destination,description,image_url,album_url")
        .eq("is_archived", true)
        .order("trek_date", { ascending: false });
      setTrips((treks ?? []) as PastTrek[]);
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
            {trips.map((t) => (
              <article key={t.id} className="group rounded-2xl overflow-hidden bg-card shadow-card border border-border hover:shadow-trail transition flex flex-col">
                <div className="relative w-full h-56 bg-muted overflow-hidden">
                  {t.image_url ? (
                    <img src={t.image_url} alt={t.name} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground"><Mountain className="w-10 h-10" /></div>
                  )}
                </div>
                <div className="p-5 space-y-2 flex-1 flex flex-col">
                  <h3 className="font-heading font-bold text-lg text-primary">{t.name}</h3>
                  <div className="text-xs text-muted-foreground">
                    📅 {new Date(t.trek_date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
                    {t.destination ? ` • 📍 ${t.destination}` : ""}
                  </div>
                  {t.description && <p className="text-sm text-muted-foreground line-clamp-3">{t.description}</p>}
                  <div className="pt-3 mt-auto">
                    {t.album_url ? (
                      <a
                        href={t.album_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-orange text-accent-foreground text-sm font-semibold shadow-glow hover:scale-[1.02] transition"
                      >
                        <ExternalLink className="w-4 h-4" /> View Photo Album
                      </a>
                    ) : (
                      <p className="text-xs text-center text-muted-foreground italic">📷 Album coming soon</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

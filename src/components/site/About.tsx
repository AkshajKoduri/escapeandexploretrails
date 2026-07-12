import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import about from "@/assets/about.jpg";
import founderAshok from "@/assets/founder-ashok.png";
import { supabase } from "@/integrations/supabase/client";

type Badge = { icon?: string; label: string };
type TeamMember = {
  id: string;
  full_name: string;
  role_title: string;
  bio: string;
  photo_url: string | null;
  badges: Badge[];
  display_order: number;
  is_founder: boolean;
};

export default function About() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("team_members")
        .select("*")
        .order("display_order", { ascending: true });
      if (cancelled) return;
      const rows = (data ?? []) as any as TeamMember[];
      // Ensure founder is always first
      rows.sort((a, b) => {
        if (a.is_founder && !b.is_founder) return -1;
        if (!a.is_founder && b.is_founder) return 1;
        return a.display_order - b.display_order;
      });
      setMembers(rows);

      const paths = rows.map((r) => r.photo_url).filter(Boolean) as string[];
      if (paths.length) {
        const { data: s } = await supabase.storage.from("team-photos").createSignedUrls(paths, 60 * 60);
        const map: Record<string, string> = {};
        (s ?? []).forEach((it: any) => { if (it.path && it.signedUrl) map[it.path] = it.signedUrl; });
        if (!cancelled) setSigned(map);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const current = members[index];
  const total = members.length;
  const prev = () => setIndex((i) => (total ? (i - 1 + total) % total : 0));
  const next = () => setIndex((i) => (total ? (i + 1) % total : 0));

  const photoSrc = useMemo(() => {
    if (!current) return founderAshok;
    if (current.photo_url && signed[current.photo_url]) return signed[current.photo_url];
    if (current.is_founder) return founderAshok;
    return "";
  }, [current, signed]);

  return (
    <section id="about" className="py-24 md:py-32 bg-background">
      <div className="container grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className="reveal-left relative">
          <div className="absolute -inset-4 bg-gradient-orange rounded-2xl opacity-20 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl shadow-trail">
            <img
              src={about}
              alt="Trekkers laughing on a forest trail"
              loading="lazy"
              width={1280}
              height={1280}
              className="w-full h-[500px] object-cover hover:scale-105 transition-transform duration-700"
              style={{ filter: "saturate(1.05) contrast(1.05)" }}
            />
          </div>
          <div className="absolute -bottom-6 -right-6 bg-accent text-accent-foreground px-6 py-4 rounded-xl font-heading font-bold shadow-card hidden md:block">
            Since Day One
          </div>
        </div>

        <div className="reveal-right">
          <span className="font-script text-accent text-xl">— Our story</span>
          <h2 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 leading-tight text-primary">
            From One Climb to a Community
          </h2>
          <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
            E2 Trails was born on a trail — not in a boardroom. On one of my first climbs, legs burning and lungs struggling, it wasn't the view that kept me going. It was the people beside me — strangers who cheered, encouraged and refused to let me quit. That moment made one thing clear: the right community can make you capable of things you never imagined.
          </p>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            So we built one. E2 Trails started in Hyderabad as a weekend escape for people who wanted more than a desk and a screen. Two years and hundreds of adventurers later, it has grown into something far bigger — a tribe of cyclists, hikers and explorers who show up every weekend not just for the trail, but for each other. Whether you're stepping onto your first trail or chasing your next summit — you belong here.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {["✅ Safety First", "🌱 Eco-Conscious", "🤝 Community Driven"].map((p) => (
              <span key={p} className="px-5 py-2.5 rounded-full bg-primary/10 text-primary font-semibold text-sm border border-primary/20">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ============ Team Carousel ============ */}
      {current && (
        <div className="container mt-20 md:mt-28">
          <div className="reveal max-w-5xl mx-auto relative">
            {total > 1 && (
              <>
                <button
                  onClick={prev}
                  aria-label="Previous team member"
                  className="absolute left-0 md:-left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 md:w-12 md:h-12 rounded-full bg-primary text-primary-foreground shadow-card grid place-items-center hover:bg-secondary transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={next}
                  aria-label="Next team member"
                  className="absolute right-0 md:-right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 md:w-12 md:h-12 rounded-full bg-primary text-primary-foreground shadow-card grid place-items-center hover:bg-secondary transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            <div
              key={current.id}
              className="bg-card border border-border rounded-2xl shadow-card p-6 md:p-10 grid md:grid-cols-[auto,1fr] gap-8 md:gap-10 items-center animate-in fade-in duration-500 mx-6 md:mx-10"
            >
              <div className="relative mx-auto md:mx-0">
                <div className="absolute -inset-3 bg-gradient-orange rounded-full opacity-25 blur-2xl" />
                <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden ring-4 ring-accent/30 shadow-trail bg-muted">
                  {photoSrc ? (
                    <img
                      src={photoSrc}
                      alt={`${current.full_name}, ${current.role_title} at E2 Trails`}
                      loading="lazy"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground text-sm">
                      {current.full_name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <span className="font-script text-accent text-xl">
                  — Meet our {current.is_founder ? "founder" : current.role_title.toLowerCase()}
                </span>
                <h3 className="font-heading font-extrabold text-2xl md:text-4xl mt-2 leading-tight text-primary">
                  {current.full_name} — {current.role_title}
                </h3>
                {current.bio.split(/\n\s*\n/).map((para, i) => (
                  <p key={i} className={`${i === 0 ? "mt-6" : "mt-4"} text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-line`}>
                    {para}
                  </p>
                ))}

                {current.badges?.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    {current.badges.slice(0, 3).map((b, i) => (
                      <span key={i} className="px-5 py-2.5 rounded-full bg-accent text-accent-foreground font-semibold text-sm border border-accent">
                        {b.icon ? `${b.icon} ` : ""}{b.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {total > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                {members.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => setIndex(i)}
                    aria-label={`Show ${m.full_name}`}
                    className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-primary" : "w-2 bg-primary/30"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

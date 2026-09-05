import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
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
  const [hasNudged, setHasNudged] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("team_members")
        .select("*")
        .order("display_order", { ascending: true });
      if (cancelled) return;
      const rows = (data ?? []) as any as TeamMember[];
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

  useEffect(() => {
    if (members.length <= 1 || hasNudged) return;
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && window.innerWidth < 768) {
            setHasNudged(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [members.length, hasNudged]);

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

  const renderTeamCard = (member: TeamMember) => {
    const src = member.photo_url && signed[member.photo_url]
      ? signed[member.photo_url]
      : member.is_founder
        ? founderAshok
        : "";
    return (
      <div className="bg-card border border-border rounded-xl shadow-card p-6 md:p-10 grid md:grid-cols-[auto,1fr] gap-8 md:gap-10 items-center">
        <div className="relative mx-auto md:mx-0">
          <div className="relative w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden ring-4 ring-accent/25 shadow-trail bg-muted">
            {src ? (
              <img
                src={src}
                alt={`${member.full_name}, ${member.role_title} at E2 Trails`}
                loading="lazy"
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full grid place-items-center font-display text-3xl text-muted-foreground">
                {member.full_name.charAt(0)}
              </div>
            )}
          </div>
        </div>
        <div>
          <p className="meta-label">{member.is_founder ? "Founder" : member.role_title}</p>
          <h3 className="font-display font-bold text-2xl md:text-3xl mt-2 text-primary">{member.full_name}</h3>
          {member.bio.split(/\n\s*\n/).map((para, i) => (
            <p key={i} className={`${i === 0 ? "mt-4" : "mt-3"} text-base text-muted-foreground leading-relaxed whitespace-pre-line`}>
              {para}
            </p>
          ))}
          {member.badges?.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2.5">
              {member.badges.slice(0, 3).map((b, i) => (
                <span key={i} className="pill bg-primary/10 text-primary border border-primary/15">
                  {b.icon ? `${b.icon} ` : ""}{b.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section id="story" className="py-24 md:py-32 bg-background">
      <div className="container grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className="reveal-left relative">
          <div className="relative overflow-hidden rounded-xl shadow-trail">
            <img
              src={about}
              alt="Trekkers laughing on a forest trail"
              loading="lazy"
              width={1280}
              height={1280}
              className="w-full h-[420px] md:h-[520px] object-cover hover:scale-[1.03] transition-transform duration-700"
            />
          </div>
          <div className="absolute -bottom-5 -left-5 bg-accent text-accent-foreground px-5 py-3 font-display font-bold shadow-card">
            Since Day One
          </div>
        </div>

        <div className="reveal-right">
          <p className="kicker">Our story</p>
          <h2 className="editorial-title mt-3">
            From one climb
            <br />
            <span className="font-script text-accent">to a community.</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
            E2 Trails was born on a trail — not in a boardroom. On one of my first climbs, legs burning
            and lungs struggling, it wasn't the view that kept me going. It was the people beside me —
            strangers who cheered, encouraged and refused to let me quit. That moment made one thing
            clear: the right community can make you capable of things you never imagined.
          </p>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            So we built one. E2 Trails started in Hyderabad as a weekend escape for people who wanted
            more than a desk and a screen. Two years and hundreds of adventurers later, it has grown
            into something far bigger — a tribe of cyclists, hikers and explorers who show up every
            weekend not just for the trail, but for each other. Whether you're stepping onto your first
            trail or chasing your next summit — you belong here.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {["Safety first", "Eco-conscious", "Community driven"].map((p) => (
              <span key={p} className="pill bg-primary/10 text-primary border border-primary/15">{p}</span>
            ))}
          </div>
          <a href="#contact" className="btn-primary mt-9">
            Meet E2 Trails
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* ============ Team ============ */}
      {current && (
        <div className="container mt-20 md:mt-28" ref={sectionRef}>
          <div className="text-center mb-10 md:mb-14">
            <p className="kicker justify-center">The people behind E2 Trails</p>
            <h2 className="editorial-title mt-3">Our team</h2>
          </div>
          <div className="max-w-5xl mx-auto relative">
            {total > 1 && (
              <>
                <button
                  onClick={prev}
                  aria-label="Previous team member"
                  className="hidden md:grid absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-card border border-border text-primary shadow-card place-items-center hover:bg-muted transition"
                >
                  <ChevronLeft className="w-5 h-5" strokeWidth={2} />
                </button>
                <button
                  onClick={next}
                  aria-label="Next team member"
                  className="hidden md:grid absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-card border border-border text-primary shadow-card place-items-center hover:bg-muted transition"
                >
                  <ChevronRight className="w-5 h-5" strokeWidth={2} />
                </button>
              </>
            )}

            <div className="hidden md:block">{renderTeamCard(current)}</div>

            {total > 1 && (
              <div className="md:hidden overflow-visible">
                <div
                  className="flex gap-5 transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(calc(${-index} * (100% - 20px)))` }}
                >
                  {members.map((m, i) => (
                    <div key={m.id} className={`w-[calc(100%-40px)] flex-shrink-0 ${hasNudged && i === 0 ? "animate-[team-nudge_0.7s_ease-in-out]" : ""}`}>
                      {renderTeamCard(m)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {total === 1 && <div className="md:hidden">{renderTeamCard(current)}</div>}

            {total > 1 && (
              <>
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
                <p className="mt-3 md:hidden text-center text-sm text-muted-foreground font-medium">← Swipe to meet the team →</p>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes team-nudge {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-20px); }
          50% { transform: translateX(0); }
          75% { transform: translateX(-10px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
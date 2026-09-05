import { ShieldCheck, MapPinned, Users, HeartPulse, ClipboardList, Radio } from "lucide-react";

/**
 * Safety positioning. Every claim below reflects what E2 Trails actually
 * does (existing site content: certified guides, first-aid kits, emergency
 * protocols, small groups, clear trip information). No fabricated
 * certifications or statistics.
 */
const pillars = [
  {
    icon: ShieldCheck,
    title: "Safety-first planning",
    desc: "Routes are assessed before every outing, with clear risk awareness and contingency plans on each trail.",
  },
  {
    icon: MapPinned,
    title: "Route preparation",
    desc: "You get the itinerary, distance, duration, difficulty and assembly point before you sign up — no surprises on the day.",
  },
  {
    icon: Users,
    title: "Small, managed groups",
    desc: "Groups are kept intentionally small so leaders can look after everyone — first-timers included.",
  },
  {
    icon: HeartPulse,
    title: "Emergency preparedness",
    desc: "First-aid kits and emergency protocols travel with every outing, and leaders are equipped to handle the unexpected.",
  },
  {
    icon: ClipboardList,
    title: "Clear trip information",
    desc: "Meeting points, what to carry, difficulty and timing are shared in advance so you can prepare properly.",
  },
  {
    icon: Radio,
    title: "Trained leadership",
    desc: "Every adventure runs with experienced leaders who know the terrain and keep the group together.",
  },
];

export default function Safety() {
  return (
    <section id="safety" className="bg-charcoal text-charcoal-foreground py-20 md:py-28 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(40 30% 97% / 0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(40 30% 97% / 0.35) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
        aria-hidden="true"
      />
      <div className="container relative">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-20 items-start">
          <div className="sticky top-28">
            <p className="kicker kicker-light">Adventure without the guesswork</p>
            <h2 className="editorial-title editorial-title-light mt-4">
              Safety is
              <br />
              <span className="font-script text-gold">non-negotiable.</span>
            </h2>
            <p className="editorial-lead editorial-lead-light">
              The mountains and the roads don't care how experienced you are. That's why every E2 Trails
              outing is planned, prepared and led so you can focus on the trail — and know exactly what
              you're signing up for.
            </p>
            <p className="mt-6 text-sm text-charcoal-foreground/60 max-w-md leading-relaxed">
              Trip pages carry the real details — distance, difficulty, duration, meeting point and what to
              carry — so you arrive ready, not guessing.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-px bg-charcoal-foreground/12 border border-charcoal-foreground/12 rounded-xl overflow-hidden">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="bg-charcoal p-6 md:p-7 flex flex-col gap-3">
                  <Icon className="w-6 h-6 text-accent" strokeWidth={1.75} aria-hidden="true" />
                  <h3 className="font-display font-bold text-lg leading-snug">{p.title}</h3>
                  <p className="text-sm text-charcoal-foreground/70 leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
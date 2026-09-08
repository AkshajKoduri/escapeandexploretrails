import { MapPinned, ShieldCheck, Users } from "lucide-react";
import Stats from "@/components/site/Stats";
import founderAshok from "@/assets/founder-ashok.webp";

const assurances = [
  {
    icon: MapPinned,
    title: "Routes we know",
    description: "Clear difficulty and trip details before you sign up.",
  },
  {
    icon: ShieldCheck,
    title: "Prepared leadership",
    description: "Experienced leaders, first-aid kits and contingency plans.",
  },
  {
    icon: Users,
    title: "Small, managed groups",
    description: "More attention for first-timers and room to look out for one another.",
  },
];

/** A compact founder-led story and trust section. */
export default function About() {
  return (
    <section id="story" className="relative overflow-hidden bg-charcoal py-10 text-charcoal-foreground sm:py-12 md:py-20 lg:py-24">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(40 30% 97% / 0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(40 30% 97% / 0.35) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
        aria-hidden="true"
      />

      <div className="container relative">
        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] md:gap-10 lg:gap-16">
          <div className="reveal-left relative">
            <div className="relative h-[320px] overflow-hidden rounded-xl bg-primary shadow-trail sm:h-[380px] md:h-[500px] lg:h-[520px]">
              <img
                src={founderAshok}
                alt="Ashok, founder of E2 Trails"
                loading="lazy"
                decoding="async"
                width={292}
                height={812}
                className="h-full w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/5 to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <p className="meta-label text-gold">Founder &amp; Lead Trek Guide</p>
                <p className="mt-1 font-display text-2xl font-bold text-charcoal-foreground sm:text-3xl">Ashok</p>
              </div>
            </div>
          </div>

          <div className="reveal-right">
            <p className="kicker kicker-light">The founder story</p>
            <h2 className="editorial-title editorial-title-light mt-3">
              Born on a trail.
              <span className="block font-script text-gold">Built through encouragement.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-charcoal-foreground/82 md:text-lg">
              On one of Ashok&apos;s first climbs, strangers beside him cheered, encouraged and refused to let him quit. That moment became E2 Trails: a Hyderabad trail community shaped by honest trip details, prepared routes and leaders who keep the group together.
            </p>

            <ul id="safety" className="mt-5 grid gap-3 border-y border-charcoal-foreground/15 py-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-1 lg:grid-cols-3">
              {assurances.map((assurance) => {
                const Icon = assurance.icon;
                return (
                  <li key={assurance.title} className="flex gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent-light" strokeWidth={1.75} aria-hidden="true" />
                    <div>
                      <h3 className="font-display text-base font-bold">{assurance.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-charcoal-foreground/68">{assurance.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <Stats />
      </div>
    </section>
  );
}

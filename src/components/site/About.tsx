import { Link } from "react-router-dom";
import { ArrowRight, MapPinned, ShieldCheck, Users } from "lucide-react";
import Stats from "@/components/site/Stats";
import about640 from "@/assets/about-640.webp";
import about960 from "@/assets/about-960.webp";

const assurances = [
  {
    icon: MapPinned,
    title: "Routes we know",
    description: "Handpicked trails, clear difficulty and the practical details shared before you sign up.",
  },
  {
    icon: ShieldCheck,
    title: "Prepared leadership",
    description: "Experienced leaders, first-aid kits and a plan for the unexpected on every outing.",
  },
  {
    icon: Users,
    title: "Small, managed groups",
    description: "Enough attention for first-timers and enough room for real friendships to form.",
  },
];

/** One story-led trust section, replacing four repetitive homepage bands. */
export default function About() {
  return (
    <section id="story" className="relative overflow-hidden bg-charcoal py-16 text-charcoal-foreground md:py-24 lg:py-28">
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
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="reveal-left relative">
            <div className="relative h-[340px] overflow-hidden rounded-xl bg-primary shadow-trail sm:h-[430px] lg:h-[540px]">
              <img
                src={about960}
                srcSet={`${about640} 640w, ${about960} 960w`}
                sizes="(min-width: 1024px) 42vw, 100vw"
                alt="Trekkers laughing together on a forest trail"
                loading="lazy"
                decoding="async"
                width={960}
                height={947}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/55 via-transparent to-transparent" aria-hidden="true" />
              <p className="absolute bottom-5 left-5 font-script text-xl text-gold">Since day one</p>
            </div>
          </div>

          <div className="reveal-right">
            <p className="kicker kicker-light">Our story · Your safety</p>
            <h2 className="editorial-title editorial-title-light mt-3">
              Built on encouragement.
              <span className="font-script text-gold"> Led with care.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-charcoal-foreground/80 md:text-lg">
              E2 Trails began on a climb where strangers refused to let one another quit. That same spirit now shapes every outing from Hyderabad: honest trip information, prepared routes and leaders who keep the group together.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-charcoal-foreground/62 md:text-base">
              Whether it is your first trail or your next summit, you arrive knowing the distance, difficulty, meeting point and what to carry.
            </p>
            <Link to="/adventures" className="btn-ghost-light mt-7">
              See how trips are planned
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div id="safety" className="mt-12 grid border-y border-charcoal-foreground/15 sm:grid-cols-3 lg:mt-16">
          {assurances.map((assurance) => {
            const Icon = assurance.icon;
            return (
              <article key={assurance.title} className="flex gap-4 border-b border-charcoal-foreground/15 py-6 last:border-b-0 sm:block sm:border-b-0 sm:border-l sm:px-6 sm:first:border-l-0 sm:first:pl-0 sm:last:pr-0">
                <Icon className="mt-0.5 h-6 w-6 shrink-0 text-accent-light" strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <h3 className="font-display text-lg font-bold">{assurance.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-charcoal-foreground/70">{assurance.description}</p>
                </div>
              </article>
            );
          })}
        </div>

        <Stats />
      </div>
    </section>
  );
}

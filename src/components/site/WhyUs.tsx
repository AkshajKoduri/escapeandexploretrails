import { ShieldCheck, Map, Users, ArrowRight } from "lucide-react";

const pillars = [
  {
    icon: ShieldCheck,
    num: "01",
    title: "Safety first",
    desc: "Certified guides, first-aid kits, and clear emergency protocols on every outing. Adventure is only good when everyone comes home.",
  },
  {
    icon: Map,
    num: "02",
    title: "Local knowledge",
    desc: "From Nallamala forests to Deccan forts — routes handpicked from trails we know personally, not picked off a map.",
  },
  {
    icon: Users,
    num: "03",
    title: "Real community",
    desc: "Small groups built for real friendships, shared effort, and lasting memories. You're community, not a customer.",
  },
];

export default function WhyUs() {
  return (
    <section id="why-e2" className="py-20 md:py-28 bg-muted/40">
      <div className="container max-w-6xl">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <p className="kicker">Why E2 Trails</p>
            <h2 className="editorial-title mt-3">
              Not just another
              <br />
              <span className="font-script text-accent">trip operator.</span>
            </h2>
            <p className="editorial-lead">
              Anyone can put a date on a trail. We build adventures around the people on them —
              thoughtfully curated routes, honest trip information, and guides who treat every
              first-timer like a future regular.
            </p>
            {/* Same-page native anchor: About now sits directly above WhyUs on
                the homepage, so a router <Link to="/#story"> would reload/remount
                instead of scrolling. */}
            <a href="#story" className="btn-outline mt-8">
              Meet the team
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>

          <div className="lg:col-span-7 divide-y divide-border border-y border-border">
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.num}
                  className="reveal py-8 md:py-10 grid sm:grid-cols-[auto_1fr] gap-6 items-start"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-display text-4xl font-bold text-border select-none" aria-hidden="true">
                      {p.num}
                    </span>
                    <span className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                      <Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl md:text-2xl text-primary">{p.title}</h3>
                    <p className="mt-2 text-muted-foreground leading-relaxed max-w-xl">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
import { MapPinned, ShieldCheck, Users } from "lucide-react";

const pillars = [
  {
    icon: ShieldCheck,
    title: "Safety first",
    description: "Prepared leaders, first-aid kits and clear contingency plans.",
  },
  {
    icon: MapPinned,
    title: "Local knowledge",
    description: "Routes we know, with honest difficulty and trip details.",
  },
  {
    icon: Users,
    title: "Real community",
    description: "Small groups that welcome first-timers and look out for one another.",
  },
];

export default function WhyUs() {
  return (
    <div id="why-e2" className="mt-5 border-y border-charcoal-foreground/15 py-4 sm:py-5" aria-labelledby="why-e2-heading">
      <h3 id="why-e2-heading" className="kicker kicker-light">
        Why E2 Trails
      </h3>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-1 lg:grid-cols-3">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <li key={pillar.title} className="flex gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent-light" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <h4 className="font-display text-base font-bold text-charcoal-foreground">{pillar.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-charcoal-foreground/72">{pillar.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

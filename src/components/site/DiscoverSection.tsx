import { Link } from "react-router-dom";
import { ArrowRight, Bike, Footprints, Mountain, Route } from "lucide-react";

const paths = [
  {
    label: "Hiking",
    note: "Half-day and sunrise trails",
    to: "/adventures?activity=hike",
    icon: Footprints,
  },
  {
    label: "Cycling",
    note: "City escapes on two wheels",
    to: "/adventures?activity=cycling",
    icon: Bike,
  },
  {
    label: "Trekking",
    note: "Weekend climbs farther out",
    to: "/adventures?activity=trek",
    icon: Mountain,
  },
  {
    label: "Bike rides",
    note: "Road-led group journeys",
    to: "/adventures?activity=bike",
    icon: Route,
  },
];

export default function DiscoverSection() {
  return (
    <section id="find-your-adventure" className="border-b border-border bg-card/60 py-14 md:py-20">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="kicker">Explore your way</p>
            <h2 className="editorial-title mt-3">
              Start with the kind of
              <span className="font-script text-accent"> day you want.</span>
            </h2>
          </div>
          <Link to="/adventures" className="btn-outline hidden shrink-0 md:inline-flex">
            Browse everything
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-9 grid grid-cols-2 border-y border-border md:grid-cols-4">
          {paths.map((path, index) => {
            const Icon = path.icon;
            return (
              <Link
                key={path.label}
                to={path.to}
                className={`group min-w-0 border-border px-4 py-6 transition-colors hover:bg-primary/[0.04] focus-visible:bg-primary/[0.04] sm:px-6 ${
                  index % 2 === 0 ? "border-r" : ""
                } ${index < 2 ? "border-b md:border-b-0" : ""} ${index > 0 ? "md:border-l" : ""} md:border-r-0`}
              >
                <Icon className="h-6 w-6 text-accent" strokeWidth={1.75} aria-hidden="true" />
                <h3 className="mt-5 font-display text-lg font-bold text-primary sm:text-xl">{path.label}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{path.note}</p>
                <span className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Explore
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>

        <Link to="/adventures" className="btn-accent mt-7 w-full md:hidden">
          Browse all adventures
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

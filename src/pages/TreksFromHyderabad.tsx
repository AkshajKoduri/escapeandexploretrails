import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin, ShieldCheck, Users } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import AdventureCard from "@/components/site/AdventureCard";
import { useSeo } from "@/hooks/useSeo";
import { fetchAdventures, type Adventure } from "@/lib/treks";
import { getPriorityTripSeo } from "@/lib/priorityTripSeo";

const TRUST_POINTS = [
  { icon: CalendarDays, title: "Real upcoming dates", copy: "See current departures and availability before you book." },
  { icon: ShieldCheck, title: "Clear trip details", copy: "Check difficulty, duration, meeting points and what to expect." },
  { icon: Users, title: "A welcoming community", copy: "Find an outdoor plan that works whether you are new or experienced." },
];

export default function TreksFromHyderabad() {
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useSeo({
    title: "Treks from Hyderabad | Weekend & Adventure Treks | E2 Trails",
    description: "Discover guided weekend treks, local hikes and outdoor adventures from Hyderabad with E2 Trails. See current dates, trip details and availability.",
    path: "/treks-from-hyderabad",
  });

  useEffect(() => {
    let cancelled = false;
    fetchAdventures()
      .then((items) => { if (!cancelled) setAdventures(items); })
      .catch(() => { if (!cancelled) setLoadFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const featured = useMemo(() => {
    const priorityTrips = adventures.filter((adventure) => getPriorityTripSeo(adventure.name));
    const otherTreks = adventures.filter(
      (adventure) => adventure.eventType === "Monsoon Trek" && !getPriorityTripSeo(adventure.name),
    );
    return [...priorityTrips, ...otherTreks].slice(0, 3);
  }, [adventures]);

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <section id="main-content" tabIndex={-1} className="bg-charcoal pt-32 pb-16 text-charcoal-foreground outline-none md:pt-40 md:pb-24">
        <div className="container max-w-5xl">
          <p className="kicker text-charcoal-foreground before:bg-accent">E2 Trails · Hyderabad</p>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold leading-[1.06] text-balance md:text-6xl">
            Treks and outdoor adventures from Hyderabad
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-charcoal-foreground/80 md:text-lg">
            Step out of the city for guided weekend treks, local hikes, cycling experiences and nature-led escapes. Choose a trip with the right pace, then see the dates and details before you book.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/adventures?activity=trek" className="btn-accent">
              Explore upcoming treks <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/hyderabad-trails" className="btn-ghost-light">Explore trails near Hyderabad</Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card">
        <div className="container grid gap-px bg-border md:grid-cols-3">
          {TRUST_POINTS.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="bg-card px-6 py-7 md:px-8">
              <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
              <h2 className="mt-4 font-display text-lg font-bold text-primary">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <div className="max-w-3xl">
          <p className="kicker">Find your next trail</p>
          <h2 className="editorial-title mt-3">From a day outdoors to a proper weekend away</h2>
          <p className="editorial-lead">Browse trips by the kind of escape you want. Every live adventure shows its current details, so you can decide with confidence.</p>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {[
            { title: "Weekend treks", copy: "Make the most of a weekend with guided treks and outdoor getaways from Hyderabad.", to: "/adventures?activity=trek", label: "See weekend treks" },
            { title: "Trails near Hyderabad", copy: "Choose a hike, ride or local exploration when you want fresh air without a long journey.", to: "/hyderabad-trails", label: "See local trails" },
            { title: "All adventures", copy: "Compare every published E2 Trails trip by activity, duration, difficulty and availability.", to: "/adventures", label: "Browse all adventures" },
          ].map((item) => (
            <Link key={item.title} to={item.to} className="group rounded-xl border border-border bg-card p-6 shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
              <MapPin className="h-5 w-5 text-accent" aria-hidden="true" />
              <h3 className="mt-8 font-display text-2xl font-bold text-primary">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.copy}</p>
              <span className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent group-hover:underline">{item.label} <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/40 py-16 md:py-24">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="kicker">Upcoming from Hyderabad</p>
              <h2 className="editorial-title mt-3">Priority and upcoming trek departures</h2>
            </div>
            <Link to="/adventures" className="btn-outline">View all adventures <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          {loadFailed ? (
            <p className="mt-8 rounded-xl border border-border bg-card p-6 text-muted-foreground">Current departures could not load. Please browse the full adventures page or try again shortly.</p>
          ) : featured.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{featured.map((adventure) => <AdventureCard key={adventure.id} adventure={adventure} />)}</div>
          ) : (
            <p className="mt-8 rounded-xl border border-border bg-card p-6 text-muted-foreground">New trek dates will appear here as they are published. You can still browse all current adventures.</p>
          )}
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <div className="grid gap-10 rounded-2xl bg-primary px-6 py-10 text-primary-foreground md:grid-cols-[1.1fr_.9fr] md:px-12 md:py-14">
          <div>
            <p className="kicker text-primary-foreground/70 before:bg-accent-light">Planning your first trek?</p>
            <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">Choose the trail that feels right for you.</h2>
          </div>
          <div className="self-end">
            <p className="leading-relaxed text-primary-foreground/80">Start with the trip page: it lays out the difficulty, duration, location, departure dates and booking options in one place.</p>
            <Link to="/adventures" className="btn-accent mt-6">Find an adventure <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

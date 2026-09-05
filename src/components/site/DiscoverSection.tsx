import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Activity = "hike" | "cycling" | "trek" | "bike";
type Duration = "half" | "one" | "multi";
type Difficulty = "Easy" | "Moderate" | "Hard";

const ACTIVITIES: { key: Activity; label: string }[] = [
  { key: "hike", label: "Hiking" },
  { key: "cycling", label: "Cycling" },
  { key: "trek", label: "Trekking" },
  { key: "bike", label: "Bike Rides" },
];

const DURATIONS: { key: Duration; label: string }[] = [
  { key: "half", label: "Half day" },
  { key: "one", label: "1 day" },
  { key: "multi", label: "2–3 days" },
];

const DIFFICULTIES: Difficulty[] = ["Easy", "Moderate", "Hard"];

export default function DiscoverSection() {
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  const go = () => {
    const params = new URLSearchParams();
    if (activity) params.set("activity", activity);
    if (duration) params.set("duration", duration);
    if (difficulty) params.set("difficulty", difficulty);
    navigate(`/adventures?${params.toString()}`);
  };

  const ready = activity || duration || difficulty;

  return (
    <section id="find-your-adventure" className="border-y border-border bg-card/60 py-16 md:py-20">
      <div className="container">
        <div className="max-w-2xl">
          <p className="kicker">Find your adventure</p>
          <h2 className="editorial-title mt-3">
            What kind of day out
            <span className="font-script text-accent"> are you after?</span>
          </h2>
          <p className="editorial-lead">
            Pick what sounds good — we'll show you the adventures that match, with real dates, prices and availability.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-6">
            <div>
              <p className="meta-label mb-3">Activity</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by activity">
                {ACTIVITIES.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    aria-pressed={activity === a.key}
                    onClick={() => setActivity(activity === a.key ? null : a.key)}
                    className={cn("filter-pill", activity === a.key ? "filter-pill-active" : "filter-pill-idle")}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="meta-label mb-3">Duration</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by duration">
                {DURATIONS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    aria-pressed={duration === d.key}
                    onClick={() => setDuration(duration === d.key ? null : d.key)}
                    className={cn("filter-pill", duration === d.key ? "filter-pill-active" : "filter-pill-idle")}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="meta-label mb-3">Difficulty</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by difficulty">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={difficulty === d}
                    onClick={() => setDifficulty(difficulty === d ? null : d)}
                    className={cn("filter-pill", difficulty === d ? "filter-pill-active" : "filter-pill-idle")}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:pb-1">
            <button
              type="button"
              onClick={go}
              disabled={!ready}
              className={cn(
                "btn-accent w-full lg:w-auto",
                !ready && "opacity-50",
              )}
            >
              Show me adventures
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            {!ready && (
              <p className="mt-2 text-xs text-muted-foreground text-center lg:text-left">
                Pick any option above — or browse everything.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
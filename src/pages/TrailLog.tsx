import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import TrailLogCard, { type TrailLogPost } from "@/components/site/TrailLogCard";
import { fetchTrailLogPosts } from "@/lib/trailLog";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks/useReveal";

type FilterKey = "All" | "Trail Guide" | "Trek Journal" | "Tips & Advice" | "Event Recap";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "All", label: "All" },
  { key: "Trail Guide", label: "Trail Guides" },
  { key: "Trek Journal", label: "Trek Journals" },
  { key: "Tips & Advice", label: "Tips & Advice" },
  { key: "Event Recap", label: "Event Recaps" },
];

export default function TrailLog() {
  useReveal();
  const [posts, setPosts] = useState<TrailLogPost[] | null>(null);
  const [filter, setFilter] = useState<FilterKey>("All");

  useEffect(() => {
    document.title = "The Trail Journal — E2 Trails";
    const desc =
      "Adventures, guides & stories from E2 Trails — trail guides, trek journals, tips and event recaps from our community.";
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", desc);
  }, []);

  useEffect(() => {
    fetchTrailLogPosts().then(setPosts);
  }, []);

  const visible = useMemo(() => {
    if (!posts) return [];
    if (filter === "All") return posts;
    return posts.filter((p) => p.category === filter);
  }, [posts, filter]);

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      <section className="pt-32 md:pt-40 pb-20 md:pb-28">
        <div className="container">
          <div className="max-w-2xl">
            <p className="kicker">Adventures, guides &amp; stories</p>
            <h1 className="editorial-title mt-3">
              The Trail
              <span className="font-script text-accent"> Journal</span>
            </h1>
            <p className="editorial-lead">
              Stories, guides and moments from the trail — written by the people who were there.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  aria-pressed={active}
                  className={cn("filter-pill", active ? "filter-pill-active" : "filter-pill-idle")}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {posts === null ? (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="mt-20 text-center reveal">
              <BookOpen className="w-12 h-12 text-accent/60 mx-auto mb-5" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-muted-foreground max-w-md mx-auto text-lg">
                Stories from the trail are coming soon. Check back after our next adventure!
              </p>
            </div>
          ) : visible.length === 0 ? (
            <p className="mt-14 text-center text-muted-foreground">No posts in this category yet.</p>
          ) : (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((p) => (
                <TrailLogCard key={p.id} post={p} featured={p === visible[0] && filter === "All"} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import BackButton from "@/components/site/BackButton";
import TrailLogCard, { type TrailLogPost } from "@/components/site/TrailLogCard";
import { fetchTrailLogPosts } from "@/lib/trailLog";
import { BookOpen } from "lucide-react";
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
    document.title = "The Trail Log — E2 Trails";
    const desc = "Adventures, guides & stories from E2 Trails — trail guides, trek journals, tips and event recaps from our community.";
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
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
      <BackButton to="/" label="Back to Home" />

      <section className="pt-8 md:pt-12 pb-24 md:pb-32">
        <div className="container">

          <div className="text-center max-w-2xl mx-auto reveal">
            <span className="font-script text-accent text-xl">— Adventures, guides & stories</span>
            <h1 className="font-heading font-extrabold text-4xl md:text-6xl mt-2 text-primary">
              The Trail Log
            </h1>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-2 reveal">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold font-heading transition-colors border ${
                    active
                      ? "bg-accent text-accent-foreground border-accent shadow-card"
                      : "bg-background text-primary border-border hover:bg-accent/10 hover:border-accent"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {posts === null ? (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="mt-20 text-center reveal">
              <BookOpen className="w-14 h-14 text-accent/60 mx-auto mb-5" strokeWidth={1.5} />
              <p className="text-muted-foreground max-w-md mx-auto text-lg">
                Stories from the trail are coming soon. Check back after our next adventure!
              </p>
            </div>
          ) : visible.length === 0 ? (
            <p className="mt-14 text-center text-muted-foreground">
              No posts in this category yet.
            </p>
          ) : (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((p) => (
                <TrailLogCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

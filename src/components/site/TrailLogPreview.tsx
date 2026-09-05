import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import TrailLogCard, { type TrailLogPost } from "@/components/site/TrailLogCard";
import { fetchTrailLogPosts } from "@/lib/trailLog";

export default function TrailLogPreview() {
  const [posts, setPosts] = useState<TrailLogPost[] | null>(null);

  useEffect(() => {
    fetchTrailLogPosts(4).then(setPosts);
  }, []);

  // No stories yet? Don't occupy a third of the homepage with an empty shell.
  // The journal's own page (/trail-log) renders a proper empty state instead.
  if (posts !== null && posts.length === 0) return null;

  return (
    <section id="trail-journal" className="py-24 md:py-32 bg-background">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="kicker">The trail journal</p>
            <h2 className="editorial-title mt-3">
              Stories, guides &
              <span className="font-script text-accent"> moments from the trail</span>
            </h2>
            <p className="editorial-lead">
              Trip stories, trail guides and notes from the community — written by the people who were there.
            </p>
          </div>
          <Link to="/trail-log" className="btn-outline shrink-0">
            Read all stories
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        {posts === null ? (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-16 text-center py-8 reveal">
            <BookOpen className="w-10 h-10 text-accent/60 mx-auto mb-4" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-muted-foreground max-w-md mx-auto">
              Stories from the trail are coming soon. Check back after our next adventure!
            </p>
          </div>
        ) : (
          <div className="mt-12 grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* Featured story */}
            <div className="lg:row-span-2">
              <TrailLogCard post={posts[0]} featured />
            </div>
            <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
              {posts.slice(1, 4).map((p) => (
                <TrailLogCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
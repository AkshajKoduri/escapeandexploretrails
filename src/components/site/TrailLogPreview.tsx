import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TrailLogCard, { type TrailLogPost } from "@/components/site/TrailLogCard";
import { fetchTrailLogPosts } from "@/lib/trailLog";
import { BookOpen } from "lucide-react";

export default function TrailLogPreview() {
  const [posts, setPosts] = useState<TrailLogPost[] | null>(null);

  useEffect(() => {
    fetchTrailLogPosts(3).then(setPosts);
  }, []);

  return (
    <section id="trail-log-preview" className="py-24 md:py-32 bg-background">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto reveal">
          <span className="font-script text-accent text-xl">— From the community</span>
          <h2 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 text-primary">
            The Trail Log
          </h2>
        </div>

        {posts === null ? (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-14 text-center reveal">
            <BookOpen className="w-12 h-12 text-accent/60 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-muted-foreground max-w-md mx-auto">
              Stories from the trail are coming soon. Check back after our next adventure!
            </p>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 reveal">
            {posts.map((p) => (
              <TrailLogCard key={p.id} post={p} />
            ))}
          </div>
        )}

        <div className="mt-12 text-center reveal">
          <Link
            to="/trail-log"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-gradient-orange text-accent-foreground font-semibold hover:scale-105 transition-transform shadow-glow"
          >
            View All Stories
          </Link>
        </div>
      </div>
    </section>
  );
}

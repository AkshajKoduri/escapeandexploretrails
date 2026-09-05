import { useEffect, useRef } from "react";
import { FileText, Instagram, ExternalLink, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrailLogPost = {
  id: string;
  title: string;
  category: string;
  description: string;
  pdf_signed_url: string | null;
  instagram_url: string | null;
  created_at: string;
};

function loadInstagramEmbedScript() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.instgrm?.Embeds?.process) {
    w.instgrm.Embeds.process();
    return;
  }
  if (document.querySelector('script[src*="instagram.com/embed.js"]')) return;
  const s = document.createElement("script");
  s.src = "https://www.instagram.com/embed.js";
  s.async = true;
  document.body.appendChild(s);
}

export default function TrailLogCard({ post, featured = false }: { post: TrailLogPost; featured?: boolean }) {
  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (post.instagram_url) {
      loadInstagramEmbedScript();
      const t = setTimeout(() => {
        const w = window as any;
        w.instgrm?.Embeds?.process?.();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [post.instagram_url]);

  const date = new Date(post.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <article
      className={cn(
        "group rounded-xl border border-border bg-card shadow-card overflow-hidden flex flex-col card-hover h-full",
        featured && "lg:min-h-full",
      )}
    >
      {post.instagram_url ? (
        <div ref={embedRef} className={cn("bg-muted flex items-center justify-center p-2", featured ? "min-h-[360px]" : "min-h-[220px]")}>
          <blockquote
            className="instagram-media w-full"
            data-instgrm-permalink={post.instagram_url}
            data-instgrm-version="14"
            style={{ background: "#FFF", border: 0, margin: 0, maxWidth: "540px", minWidth: "280px", width: "100%" }}
          >
            <a href={post.instagram_url} target="_blank" rel="noreferrer" className="text-sm text-accent underline">
              View on Instagram
            </a>
          </blockquote>
        </div>
      ) : (
        <div
          className={cn(
            "bg-gradient-to-br from-accent/15 to-primary/10 flex items-center justify-center",
            featured ? "aspect-[16/10]" : "aspect-[16/10]",
          )}
        >
          <FileText className="w-14 h-14 text-accent" strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="pill bg-accent/15 text-accent">{post.category}</span>
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
        <h3 className={cn("font-display font-bold text-primary leading-snug", featured ? "text-2xl" : "text-lg")}>
          {post.title}
        </h3>
        <p className={cn("text-sm text-muted-foreground leading-relaxed flex-1", featured && "text-base line-clamp-4")}>
          {post.description}
        </p>
        {post.pdf_signed_url ? (
          <a
            href={post.pdf_signed_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-accent hover:underline"
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            Read the story
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        ) : post.instagram_url ? (
          <a
            href={post.instagram_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-accent hover:underline"
          >
            <Instagram className="w-4 h-4" aria-hidden="true" />
            Open on Instagram
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
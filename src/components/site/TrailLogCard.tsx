import { useEffect, useRef } from "react";
import { FileText, Instagram, ExternalLink } from "lucide-react";

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

export default function TrailLogCard({ post }: { post: TrailLogPost }) {
  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (post.instagram_url) {
      loadInstagramEmbedScript();
      // Re-process after a tick in case the script is already loaded
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
    <article className="rounded-2xl border border-primary/10 bg-card shadow-card overflow-hidden flex flex-col">
      {post.instagram_url ? (
        <div ref={embedRef} className="bg-muted min-h-[420px] flex items-center justify-center p-2">
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
      ) : post.pdf_signed_url ? (
        <div className="bg-gradient-to-br from-accent/15 to-primary/10 aspect-[4/3] flex items-center justify-center">
          <FileText className="w-16 h-16 text-accent" strokeWidth={1.5} />
        </div>
      ) : null}

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-semibold font-heading">
            {post.category}
          </span>
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
        <h3 className="font-heading font-bold text-lg text-primary leading-snug">
          {post.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
          {post.description}
        </p>
        {post.pdf_signed_url ? (
          <a
            href={post.pdf_signed_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-2 self-start px-4 py-2 rounded-full bg-gradient-orange text-accent-foreground text-sm font-semibold hover:scale-105 transition-transform shadow-glow"
          >
            <FileText className="w-4 h-4" /> View PDF
          </a>
        ) : post.instagram_url ? (
          <a
            href={post.instagram_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-2 self-start text-sm font-semibold text-accent hover:underline"
          >
            <Instagram className="w-4 h-4" /> Open on Instagram <ExternalLink className="w-3 h-3" />
          </a>
        ) : null}
      </div>
    </article>
  );
}

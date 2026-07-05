import { supabase } from "@/integrations/supabase/client";
import type { TrailLogPost } from "@/components/site/TrailLogCard";

type Row = {
  id: string;
  title: string;
  category: string;
  description: string;
  pdf_storage_path: string | null;
  instagram_url: string | null;
  created_at: string;
};

export async function fetchTrailLogPosts(limit?: number): Promise<TrailLogPost[]> {
  let q = supabase
    .from("trail_log")
    .select("id, title, category, description, pdf_storage_path, instagram_url, created_at")
    .order("created_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error || !data) return [];

  const rows = data as Row[];
  const paths = rows.map((r) => r.pdf_storage_path).filter(Boolean) as string[];
  const urlMap: Record<string, string> = {};
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from("trail-log-pdfs")
      .createSignedUrls(paths, 60 * 60 * 6);
    (signed ?? []).forEach((s: any) => {
      if (s.path && s.signedUrl) urlMap[s.path] = s.signedUrl;
    });
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    description: r.description,
    created_at: r.created_at,
    instagram_url: r.instagram_url,
    pdf_signed_url: r.pdf_storage_path ? urlMap[r.pdf_storage_path] ?? null : null,
  }));
}

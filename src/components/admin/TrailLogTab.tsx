import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { adminApi, adminUpload } from "@/lib/adminApi";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type TrailLogRow = {
  id: string;
  title: string;
  category: "Trail Guide" | "Trek Journal" | "Tips & Advice" | "Event Recap";
  description: string;
  pdf_url: string | null;
  pdf_storage_path: string | null;
  instagram_url: string | null;
  created_at: string;
};

const TRAIL_LOG_CATEGORIES: TrailLogRow["category"][] = [
  "Trail Guide",
  "Trek Journal",
  "Tips & Advice",
  "Event Recap",
];

export default function TrailLogTab() {
  const [items, setItems] = useState<TrailLogRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TrailLogRow["category"]>("Trail Guide");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState<"pdf" | "instagram">("pdf");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [deleting, setDeleting] = useState<TrailLogRow | null>(null);

  const load = async () => {
    try {
      const res = await adminApi<{ data: TrailLogRow[] }>("listTrailLog");
      setItems(res?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load trail log");
    }
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setTitle(""); setCategory("Trail Guide"); setDescription("");
    setSourceType("pdf"); setPdfFile(null); setInstagramUrl("");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      return toast.error("Title and description are required");
    }
    if (sourceType === "pdf" && !pdfFile) return toast.error("Please choose a PDF file");
    if (sourceType === "instagram" && !instagramUrl.trim()) return toast.error("Please paste an Instagram URL");

    setBusy(true);
    try {
      let pdf_storage_path: string | null = null;
      if (sourceType === "pdf" && pdfFile) {
        if (pdfFile.type !== "application/pdf") throw new Error("File must be a PDF");
        const path = `posts/${crypto.randomUUID()}.pdf`;
        await adminUpload("trail-log-pdfs", path, pdfFile);
        pdf_storage_path = path;
      }
      await adminApi("insertTrailLog", {
        row: {
          title: title.trim(),
          category,
          description: description.trim(),
          pdf_storage_path,
          instagram_url: sourceType === "instagram" ? instagramUrl.trim() : null,
        },
      });
      toast.success("Post added");
      reset();
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add post");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    const row = deleting;
    setDeleting(null);
    try {
      await adminApi("deleteTrailLog", { id: row.id });
      toast.success("Deleted");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Delete failed");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="kicker">The trail journal</p>
        <h1 className="font-display font-bold text-3xl text-primary mt-1">Trail Log</h1>
      </div>

      <form onSubmit={onSubmit} className="surface rounded-xl p-5 md:p-6 space-y-4">
        <h2 className="font-display font-bold text-lg text-primary">Add a new post</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Title</label>
            <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select className="field-input" value={category} onChange={(e) => setCategory(e.target.value as TrailLogRow["category"])}>
              {TRAIL_LOG_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
        </div>

        <div>
          <label className="field-label">Short description</label>
          <textarea className="field-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>

        <div className="flex gap-4 flex-wrap">
          <label className="inline-flex items-center gap-2 text-sm font-medium">
            <input type="radio" checked={sourceType === "pdf"} onChange={() => setSourceType("pdf")} /> Upload PDF
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-medium">
            <input type="radio" checked={sourceType === "instagram"} onChange={() => setSourceType("instagram")} /> Instagram URL
          </label>
        </div>

        {sourceType === "pdf" ? (
          <div>
            <label className="field-label">PDF file</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              className="block text-sm"
            />
            {pdfFile && <span className="text-xs text-muted-foreground mt-1 block">{pdfFile.name}</span>}
          </div>
        ) : (
          <div>
            <label className="field-label">Instagram post URL</label>
            <input
              className="field-input"
              type="url"
              placeholder="https://www.instagram.com/p/..."
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
            />
          </div>
        )}

        <button type="submit" disabled={busy} className="btn-primary btn-sm disabled:opacity-60">
          <Plus className="w-4 h-4" aria-hidden="true" /> {busy ? "Saving…" : "Add post"}
        </button>
      </form>

      <div>
        <h2 className="font-display font-bold text-lg text-primary mb-3">All posts ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((row) => (
              <div key={row.id} className="flex items-start gap-3 surface rounded-xl p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="pill bg-accent/15 text-accent">{row.category}</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(row.created_at).toLocaleDateString("en-IN")}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {row.pdf_storage_path ? "PDF" : row.instagram_url ? "Instagram" : "—"}
                    </span>
                  </div>
                  <div className="font-display font-semibold text-sm text-primary mt-1.5 truncate">{row.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{row.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleting(row)}
                  className="p-2 rounded text-destructive hover:bg-destructive/10 shrink-0"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Delete this post?"
        description={deleting ? `"${deleting.title}" will be permanently removed from the journal.` : ""}
        confirmLabel="Delete post"
        onConfirm={onDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
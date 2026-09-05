import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { adminApi, adminRemove, adminUpload } from "@/lib/adminApi";
import { supabase } from "@/integrations/supabase/client";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type GalleryImage = {
  id: string;
  image_url: string;
  storage_path: string | null;
  category: "Hike" | "Cycling Ride" | "Monsoon Trek" | "Bike Ride" | "General";
  display_order: number;
  alt_text: string | null;
};

const GALLERY_CATEGORIES: GalleryImage["category"][] = ["Hike", "Cycling Ride", "Bike Ride", "Monsoon Trek", "General"];

export default function GalleryTab() {
  const [items, setItems] = useState<GalleryImage[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<GalleryImage | null>(null);

  const load = async () => {
    try {
      const res = await adminApi<{ data: GalleryImage[] }>("listGalleryImages");
      const rows = res?.data ?? [];
      setItems(rows);
      const paths = rows.map((r) => r.storage_path).filter(Boolean) as string[];
      if (paths.length) {
        const { data } = await supabase.storage.from("gallery-images").createSignedUrls(paths, 60 * 60);
        const map: Record<string, string> = {};
        (data ?? []).forEach((s: any) => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl; });
        setUrls(map);
      } else {
        setUrls({});
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load gallery");
    }
  };

  useEffect(() => { load(); }, []);

  const onUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `gallery/${crypto.randomUUID()}.${ext}`;
      await adminUpload("gallery-images", path, file);
      const nextOrder = items.length ? Math.max(...items.map((i) => i.display_order)) + 1 : 1;
      await adminApi("insertGalleryImage", {
        row: { image_url: "", storage_path: path, category: "General", display_order: nextOrder, alt_text: file.name },
      });
      toast.success("Image uploaded");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    const img = deleting;
    setDeleting(null);
    try {
      if (img.storage_path) {
        try { await adminRemove("gallery-images", img.storage_path); } catch { /* ignore */ }
      }
      await adminApi("deleteGalleryImage", { id: img.id });
      toast.success("Deleted");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Delete failed");
    }
  };

  const onCategory = async (img: GalleryImage, category: GalleryImage["category"]) => {
    try {
      await adminApi("updateGalleryImage", { id: img.id, patch: { category } });
      setItems((prev) => prev.map((p) => (p.id === img.id ? { ...p, category } : p)));
    } catch (err: any) {
      toast.error(err?.message ?? "Update failed");
    }
  };

  const swap = async (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= items.length || j >= items.length) return;
    const a = items[i], b = items[j];
    try {
      await adminApi("reorderGalleryImages", {
        updates: [{ id: a.id, display_order: b.display_order }, { id: b.id, display_order: a.display_order }],
      });
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Reorder failed");
    }
  };

  const sorted = [...items].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Life out there</p>
          <h1 className="font-display font-bold text-3xl text-primary mt-1">Gallery ({items.length})</h1>
        </div>
        <label className="btn-accent btn-sm cursor-pointer">
          <Plus className="w-4 h-4" aria-hidden="true" /> {busy ? "Uploading…" : "Upload image"}
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground surface rounded-xl p-6">No gallery images yet. Upload one to get started.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.map((img, idx) => (
            <div key={img.id} className="surface rounded-xl overflow-hidden flex flex-col">
              <div className="aspect-square bg-muted">
                {urls[img.storage_path ?? ""] ? (
                  <img src={urls[img.storage_path ?? ""]} alt={img.alt_text ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-muted-foreground text-xs">Loading…</div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => swap(idx, idx - 1)}
                    disabled={idx === 0}
                    className="px-2 py-1 rounded text-xs border border-border hover:bg-muted disabled:opacity-40"
                    title="Move up"
                  >↑</button>
                  <button
                    type="button"
                    onClick={() => swap(idx, idx + 1)}
                    disabled={idx === sorted.length - 1}
                    className="px-2 py-1 rounded text-xs border border-border hover:bg-muted disabled:opacity-40"
                    title="Move down"
                  >↓</button>
                  <span className="text-xs text-muted-foreground ml-1">#{img.display_order}</span>
                  <button
                    type="button"
                    onClick={() => setDeleting(img)}
                    className="ml-auto p-1.5 rounded text-destructive hover:bg-destructive/10"
                    title="Delete"
                  ><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <select
                  className="w-full px-2 py-1.5 rounded-md border border-input bg-background text-xs"
                  value={img.category}
                  onChange={(e) => onCategory(img, e.target.value as GalleryImage["category"])}
                  aria-label="Category"
                >
                  {GALLERY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete this image?"
        description="The image will be removed from the site gallery. This cannot be undone."
        confirmLabel="Delete image"
        onConfirm={onDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
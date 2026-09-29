import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { adminApi, adminRemove, adminUpload } from "@/lib/adminApi";
import { IMAGE_ACCEPT, imageStoragePath, validateImageUpload } from "@/lib/imageUpload";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type GalleryImage = {
  id: string; image_url: string; storage_path: string | null;
  category: "Hike" | "Cycling Ride" | "Monsoon Trek" | "Bike Ride" | "General";
  display_order: number; alt_text: string | null;
};
const categories: GalleryImage["category"][] = ["Hike", "Cycling Ride", "Bike Ride", "Monsoon Trek", "General"];
const message = (error: unknown) => error instanceof Error ? error.message : "The gallery could not be updated. Please try again.";
const iconButton = "inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-40";

export default function GalleryTab() {
  const [items, setItems] = useState<GalleryImage[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<GalleryImage | null>(null);
  const busy = Boolean(progress);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi<{ data: GalleryImage[] }>("listGalleryImages");
      const rows = [...(data ?? [])].sort((a, b) => a.display_order - b.display_order);
      const paths = rows.flatMap((row) => row.storage_path ? [row.storage_path] : []);
      const signed = paths.length ? await adminApi<{ urls: Record<string, string> }>("signImagePaths", { bucket: "gallery-images", paths }) : { urls: {} };
      setItems(rows); setUrls(signed.urls); setError(null);
    } catch (cause) { setError(message(cause)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const upload = async (file: File, replacing?: GalleryImage) => {
    const invalid = validateImageUpload(file);
    if (invalid) { setError(invalid); return; }
    setProgress(replacing ? "Uploading replacement…" : "Uploading image…"); setError(null);
    let path: string | null = null;
    try {
      path = imageStoragePath("gallery", file);
      await adminUpload("gallery-images", path, file);
      setProgress("Saving image…");
      if (replacing) {
        await adminApi("updateGalleryImage", { id: replacing.id, patch: { storage_path: path, image_url: "" } });
      } else {
        await adminApi("insertGalleryImage", { row: { storage_path: path, image_url: "", category: "General", alt_text: "", display_order: items.length ? Math.max(...items.map((item) => item.display_order)) + 1 : 1 } });
      }
      // Only remove the old file after the replacement is saved.
      path = null;
      if (replacing?.storage_path) await adminRemove("gallery-images", replacing.storage_path).catch(() => undefined);
      toast.success(replacing ? "Gallery image replaced" : "Gallery image uploaded");
      await load();
    } catch (cause) {
      if (path) await adminRemove("gallery-images", path).catch(() => undefined);
      setError(message(cause));
    } finally { setProgress(""); }
  };
  const save = async (item: GalleryImage) => {
    setProgress("Saving details…"); setError(null);
    try {
      await adminApi("updateGalleryImage", { id: item.id, patch: { alt_text: item.alt_text?.trim() ?? "", category: item.category } });
      toast.success("Gallery details saved");
    } catch (cause) { setError(message(cause)); }
    finally { setProgress(""); }
  };
  const remove = async () => {
    if (!deleting) return;
    const item = deleting; setDeleting(null); setProgress("Removing image…"); setError(null);
    try {
      await adminApi("deleteGalleryImage", { id: item.id });
      if (item.storage_path) await adminRemove("gallery-images", item.storage_path).catch(() => undefined);
      await load(); toast.success("Gallery image removed");
    } catch (cause) { setError(message(cause)); }
    finally { setProgress(""); }
  };
  const move = async (index: number, delta: number) => {
    const next = [...items];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setProgress("Saving order…"); setError(null);
    try {
      await adminApi("reorderGalleryImages", { updates: next.map((item, display_order) => ({ id: item.id, display_order })) });
      setItems(next.map((item, display_order) => ({ ...item, display_order })));
    } catch (cause) { setError(message(cause)); }
    finally { setProgress(""); }
  };
  const edit = (id: string, patch: Partial<GalleryImage>) => setItems((rows) => rows.map((item) => item.id === id ? { ...item, ...patch } : item));

  return <div className="space-y-5" aria-busy={busy}>
    <div><p className="kicker">Life out there</p><h1 className="font-display text-3xl font-bold text-primary">Moments on the trail</h1><p className="mt-2 text-sm text-muted-foreground">Manage the homepage gallery. Visitors can browse every saved photo.</p></div>
    <div className="surface rounded-xl p-5">
      <label htmlFor="gallery-upload" className="field-label">Upload image</label>
      <input id="gallery-upload" type="file" accept={IMAGE_ACCEPT} disabled={busy || loading} className="field-input" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
      <p className="mt-2 text-xs text-muted-foreground">JPG, PNG, WebP, GIF, or AVIF. Maximum 10 MB per image.</p>
    </div>
    {progress && <p role="status" className="text-sm">{progress}</p>}
    {error && <div role="alert" className="text-sm text-destructive">{error}<button className="ml-3 underline" type="button" disabled={busy} onClick={() => void load()}>Reload gallery</button></div>}
    {loading ? <p role="status">Loading gallery…</p> : !items.length ? <p className="surface rounded-xl p-6 text-muted-foreground">No gallery images yet. Upload one to get started.</p> :
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((item, index) => {
        const url = urls[item.storage_path ?? ""] || item.image_url;
        return <article key={item.id} className="surface overflow-hidden rounded-xl">
          <div className="aspect-[4/3] bg-muted">{url ? <img src={url} alt={item.alt_text || `Gallery photo ${index + 1}`} className="h-full w-full object-cover" loading="lazy" /> : <p className="p-5 text-sm">Preview unavailable</p>}</div>
          <fieldset disabled={busy} className="space-y-3 p-4">
            <div className="flex gap-2">
              <button type="button" className={iconButton} disabled={busy || index === 0} aria-label={`Move photo ${index + 1} up`} onClick={() => void move(index, -1)}><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
              <button type="button" className={iconButton} disabled={busy || index === items.length - 1} aria-label={`Move photo ${index + 1} down`} onClick={() => void move(index, 1)}><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
              <button type="button" className={`${iconButton} ml-auto text-destructive`} aria-label={`Remove photo ${index + 1}`} onClick={() => setDeleting(item)}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <label className="block text-sm font-semibold">Photo {index + 1} description (alt text)<input className="field-input mt-1" value={item.alt_text ?? ""} maxLength={500} onChange={(event) => edit(item.id, { alt_text: event.target.value })} /></label>
            <label className="block text-sm font-semibold">Category<select className="field-input mt-1" value={item.category} onChange={(event) => edit(item.id, { category: event.target.value as GalleryImage["category"] })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <button type="button" className="btn-outline w-full" onClick={() => void save(item)}>Save details</button>
            <label className="block text-sm font-semibold">Replace photo {index + 1}<input type="file" accept={IMAGE_ACCEPT} className="mt-2 block w-full text-sm" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file, item); }} /></label>
          </fieldset>
        </article>;
      })}</div>}
    <ConfirmDialog open={!!deleting} title="Remove this gallery image?" description="The image will be removed from Moments on the trail." confirmLabel="Remove image" onConfirm={remove} onClose={() => setDeleting(null)} />
  </div>;
}

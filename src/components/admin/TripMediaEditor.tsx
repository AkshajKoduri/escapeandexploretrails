import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminUpload } from "@/lib/adminApi";
import { validateTripImage, type TripPhoto } from "@/lib/tripContent";

function reordered<T>(items: T[], index: number, delta: number): T[] {
  const next = [...items];
  [next[index], next[index + delta]] = [next[index + delta], next[index]];
  return next;
}

const iconButton = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-40";

export function TripHighlightsEditor({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  return <fieldset className="md:col-span-2 space-y-3 rounded-xl border border-border p-4">
    <legend className="px-1 text-sm font-semibold text-primary">Highlights</legend>
    <p className="text-sm text-muted-foreground">Add the experiences that make this trip special. Blank highlights are ignored.</p>
    {value.map((item, index) => <div key={index} className="space-y-2 rounded-lg border border-border p-3">
      <label className="text-sm font-semibold">Highlight {index + 1}<textarea className="field-input mt-2" rows={2} value={item} maxLength={1000} onChange={(event) => onChange(value.map((text, i) => i === index ? event.target.value : text))} /></label>
      <div className="flex gap-2">
        <button type="button" className={iconButton} disabled={index === 0} onClick={() => onChange(reordered(value, index, -1))} aria-label={`Move highlight ${index + 1} up`}><ArrowUp className="h-4 w-4" /></button>
        <button type="button" className={iconButton} disabled={index === value.length - 1} onClick={() => onChange(reordered(value, index, 1))} aria-label={`Move highlight ${index + 1} down`}><ArrowDown className="h-4 w-4" /></button>
        <button type="button" className={iconButton} onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label={`Remove highlight ${index + 1}`}><Trash2 className="h-4 w-4 text-destructive" /></button>
      </div>
    </div>)}
    <button type="button" className="btn-outline btn-sm" disabled={value.length >= 50} onClick={() => onChange([...value, ""])}><Plus className="h-4 w-4" aria-hidden="true" />Add highlight</button>
  </fieldset>;
}

export function TripPhotosEditor({ value, onChange, onBusy }: { value: TripPhoto[]; onChange: (value: TripPhoto[]) => void; onBusy: (busy: boolean) => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const upload = async (files: File[]) => {
    if (!files.length) return;
    if (files.length + value.length > 30) { toast.error("A trip can contain up to 30 gallery photos."); return; }
    for (const file of files) { const problem = validateTripImage(file); if (problem) { toast.error(`${file.name}: ${problem}`); return; } }
    setUploading(true);
    onBusy(true);
    const next = [...value];
    try {
      for (const [index, file] of files.entries()) {
        setProgress(`Uploading photo ${index + 1} of ${files.length}…`);
        const extension = file.type.split("/")[1].replace("jpeg", "jpg");
        const id = crypto.randomUUID();
        const uploaded = await adminUpload("trek-images", `trips/gallery/${id}.${extension}`, file);
        if (!uploaded.publicUrl) throw new Error("The image upload did not return a usable photo URL.");
        next.push({ id, path: uploaded.path, url: uploaded.publicUrl, alt: "" });
      }
      toast.success("Photos uploaded. Save the trip to publish your gallery.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Photo upload failed. Try again."); }
    finally { onChange(next); setUploading(false); onBusy(false); setProgress(""); }
  };
  return <fieldset disabled={uploading} className="md:col-span-2 space-y-4 rounded-xl border border-border p-4">
    <legend className="px-1 text-sm font-semibold text-primary">Trip photo gallery</legend>
    <p className="text-sm text-muted-foreground">Additional trip photos appear in “View photos” beside the cover. The cover image stays separate. Save the trip after changing photos, descriptions or order.</p>
    <label className="block text-sm font-semibold">Upload photos<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="mt-2 block w-full text-sm" onChange={(event) => { void upload(Array.from(event.target.files ?? [])); event.target.value = ""; }} /></label>
    <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or AVIF. Maximum 10MB per image, up to 30 images.</p>
    {progress && <p role="status" className="text-sm">{progress}</p>}
    {value.map((photo, index) => <div key={photo.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[96px_1fr]">
      <img src={photo.url} alt={photo.alt || `Trip photo ${index + 1}`} className="h-24 w-24 rounded-md object-cover" />
      <div className="min-w-0 space-y-2">
        <label className="text-sm font-semibold">Photo {index + 1} description (alt text)<input className="field-input mt-1" value={photo.alt} maxLength={500} onChange={(event) => onChange(value.map((item, i) => i === index ? { ...item, alt: event.target.value } : item))} /></label>
        <div className="flex gap-2">
          <button type="button" className={iconButton} disabled={index === 0} onClick={() => onChange(reordered(value, index, -1))} aria-label={`Move photo ${index + 1} up`}><ArrowUp className="h-4 w-4" /></button>
          <button type="button" className={iconButton} disabled={index === value.length - 1} onClick={() => onChange(reordered(value, index, 1))} aria-label={`Move photo ${index + 1} down`}><ArrowDown className="h-4 w-4" /></button>
          <button type="button" className={iconButton} onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label={`Remove photo ${index + 1}`}><Trash2 className="h-4 w-4 text-destructive" /></button>
        </div>
      </div>
    </div>)}
  </fieldset>;
}

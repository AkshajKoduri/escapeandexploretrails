import { useEffect, useState, type FormEvent } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi, adminRemove, adminUpload } from "@/lib/adminApi";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_HERO_ALT, type HomepageSettings } from "@/lib/homepage";
import { IMAGE_ACCEPT, imageStoragePath, validateImageUpload } from "@/lib/imageUpload";
import fallbackHero from "@/assets/hero-1440.webp";

export default function HomepageTab() {
  const [saved, setSaved] = useState<HomepageSettings | null>(null);
  const [alt, setAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState("");
  const busy = Boolean(progress);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminApi<{ data: HomepageSettings | null }>("getHomepageSettings")
      .then(({ data }) => {
        if (cancelled) return;
        setSaved(data);
        setAlt(data?.hero_alt_text ?? "");
      })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : "Could not load homepage settings"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const currentUrl = saved?.hero_image_path
    ? supabase.storage.from("trek-images").getPublicUrl(saved.hero_image_path).data.publicUrl : null;
  const image = remove ? fallbackHero : preview || currentUrl || fallbackHero;
  const custom = !remove && Boolean(file || saved?.hero_image_path);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setProgress(file ? "Uploading image…" : "Saving settings…");
    let uploadedPath: string | null = null;
    try {
      let path = remove ? null : saved?.hero_image_path ?? null;
      if (file && !remove) {
        const validation = validateImageUpload(file);
        if (validation) throw new Error(validation);
        uploadedPath = imageStoragePath("homepage", file);
        await adminUpload("trek-images", uploadedPath, file);
        path = uploadedPath;
      }
      setProgress("Saving settings…");
      const patch = { hero_image_path: path, hero_alt_text: path ? alt.trim() : "" };
      await adminApi("updateHomepageSettings", { patch });
      // Keep the previous file until the record safely points to its replacement.
      const previousPath = saved?.hero_image_path;
      setSaved({ id: "homepage", ...patch });
      setFile(null);
      setRemove(false);
      setAlt(patch.hero_alt_text);
      uploadedPath = null;
      if (previousPath && previousPath !== path) {
        await adminRemove("trek-images", previousPath).catch(() => undefined);
      }
      toast.success("Homepage welcome image saved");
    } catch (err: unknown) {
      // A failed metadata save never removes the previous, working image.
      if (uploadedPath) await adminRemove("trek-images", uploadedPath).catch(() => undefined);
      const message = err instanceof Error ? err.message : "Could not save homepage settings";
      setError(message);
      toast.error(message);
    } finally {
      setProgress("");
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div><p className="kicker">First impressions</p><h1 className="mt-1 font-display text-3xl font-bold text-primary">Homepage</h1></div>
      {loading ? <p role="status">Loading homepage settings…</p> : !saved && error ? (
        <div className="surface rounded-xl p-6"><p role="alert">{error}</p><button type="button" className="btn-outline mt-4" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div>
      ) : (
        <form onSubmit={submit} className="surface space-y-5 rounded-xl p-5 sm:p-6" aria-busy={busy}>
          <div><h2 className="font-display text-xl font-semibold text-primary">Welcome / hero image</h2><p className="mt-2 text-sm text-muted-foreground">The large image behind the homepage welcome message. Choose a wide landscape photo; its edges may be cropped on mobile.</p></div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-charcoal">
            <img src={image} alt={custom ? alt || "Welcome image preview" : DEFAULT_HERO_ALT} className="h-full w-full object-cover object-[58%_center] sm:object-center" />
            <div className="absolute inset-0 bg-gradient-hero" aria-hidden="true" />
            <p className="absolute bottom-5 left-5 right-5 font-display text-2xl font-bold text-charcoal-foreground sm:text-4xl">Where every trail<br /><span className="font-script text-gold">tells a story.</span></p>
          </div>
          <p className="text-sm text-muted-foreground">{custom ? (file ? "New image selected. Save to publish it." : "Your saved welcome image is displayed above.") : "The original E2 Trails welcome image will be displayed."}</p>
          <div>
            <label htmlFor="homepage-hero-file" className="field-label inline-flex items-center gap-2"><ImagePlus className="h-4 w-4" aria-hidden="true" />{custom ? "Replace image" : "Upload image"}</label>
            <input id="homepage-hero-file" type="file" accept={IMAGE_ACCEPT} disabled={busy} className="field-input" onChange={(event) => {
              const selected = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!selected) return;
              const validation = validateImageUpload(selected);
              if (validation) { setError(validation); return; }
              setError(null); setFile(selected); setRemove(false);
            }} />
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP, GIF, or AVIF. Maximum 10 MB.</p>
          </div>
          <div>
            <label htmlFor="homepage-hero-alt" className="field-label">Image description (alt text)</label>
            <input id="homepage-hero-alt" className="field-input" value={custom ? alt : DEFAULT_HERO_ALT} disabled={busy || !custom} maxLength={500} onChange={(event) => setAlt(event.target.value)} placeholder="Describe the landscape in this photo" />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{busy ? progress : "Save welcome image"}</button>
            {custom && <button type="button" disabled={busy} className="btn-outline" onClick={() => { setRemove(true); setFile(null); }}>Use original image</button>}
            {remove && <button type="button" disabled={busy} className="btn-outline" onClick={() => setRemove(false)}>Undo removal</button>}
          </div>
          <p role="status" className="text-sm text-muted-foreground">{busy ? progress : remove ? "The custom image will be removed when you save." : "Saved changes appear on the public homepage after refreshing."}</p>
        </form>
      )}
    </div>
  );
}

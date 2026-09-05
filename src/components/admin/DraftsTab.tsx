import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Mountain } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { Trek } from "@/lib/admin";
import { trekDateLabel } from "@/lib/admin";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export default function DraftsTab({ treks, reload }: { treks: Trek[]; reload: () => void }) {
  const [deleting, setDeleting] = useState<Trek | null>(null);

  const publish = async (id: string) => {
    try {
      await adminApi("updateTrek", { id, patch: { is_draft: false } });
      toast.success("Trip published to the site");
      reload();
    } catch (err: any) { toast.error(err.message); }
  };

  const moveToPast = async (id: string) => {
    try {
      await adminApi("updateTrek", { id, patch: { is_archived: true, is_draft: false } });
      toast.success("Moved to past trips");
      reload();
    } catch (err: any) { toast.error(err.message); }
  };

  const deleteDraft = async () => {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    try {
      await adminApi("deleteTrek", { id });
      toast.success("Draft deleted");
      reload();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="kicker">Unpublished trips</p>
        <h1 className="font-display font-bold text-3xl text-primary mt-1">Drafts ({treks.length})</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Drafts are hidden from the public site and booking flow. Publish them to make them live, or
          move them to past trips.
        </p>
      </div>

      {treks.length === 0 ? (
        <p className="text-sm text-muted-foreground surface rounded-xl p-6">No drafts right now.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {treks.map((t) => (
            <div key={t.id} className="surface rounded-xl overflow-hidden flex">
              {t.image_url ? (
                <img src={t.image_url} alt={t.name} className="w-28 h-28 object-cover" />
              ) : (
                <div className="w-28 h-28 bg-muted grid place-items-center text-muted-foreground"><Mountain className="w-8 h-8" /></div>
              )}
              <div className="p-4 flex-1 min-w-0 flex flex-col gap-2">
                <div>
                  <div className="font-semibold text-foreground truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{trekDateLabel(t)}</div>
                  <span className="inline-block mt-1.5 pill bg-amber-500/15 text-amber-700">Draft</span>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <button onClick={() => publish(t.id)} className="btn-primary btn-sm">Publish</button>
                  <button onClick={() => moveToPast(t.id)} className="btn-outline btn-sm">Move to past trips</button>
                  <button onClick={() => setDeleting(t)} className="btn-danger btn-sm" aria-label="Delete draft">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete this draft?"
        description={deleting ? `"${deleting.name}" will be permanently deleted. This cannot be undone.` : ""}
        confirmLabel="Delete draft"
        onConfirm={deleteDraft}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
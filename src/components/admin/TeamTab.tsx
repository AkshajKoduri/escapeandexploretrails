import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { adminApi, adminRemove, adminUpload } from "@/lib/adminApi";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type Badge = { icon?: string; label: string };
type TeamMember = {
  id: string;
  full_name: string;
  role_title: string;
  bio: string;
  photo_url: string | null;
  badges: Badge[];
  display_order: number;
  is_founder: boolean;
};

export default function TeamTab() {
  const [items, setItems] = useState<TeamMember[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<TeamMember | null>(null);

  const load = async () => {
    try {
      const res = await adminApi<{ data: TeamMember[] }>("listTeamMembers");
      const rows = res?.data ?? [];
      setItems(rows);
      const paths = rows.map((r) => r.photo_url).filter(Boolean) as string[];
      if (paths.length) {
        const { data } = await supabase.storage.from("team-photos").createSignedUrls(paths, 60 * 60);
        const map: Record<string, string> = {};
        (data ?? []).forEach((s: any) => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl; });
        setSigned(map);
      } else {
        setSigned({});
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load team");
    }
  };

  useEffect(() => { load(); }, []);

  const onDelete = async () => {
    if (!deleting) return;
    const m = deleting;
    setDeleting(null);
    if (m.is_founder) return toast.error("Founder cannot be deleted");
    try {
      await adminApi("deleteTeamMember", { id: m.id });
      toast.success("Deleted");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Delete failed");
    }
  };

  const swap = async (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= items.length || j >= items.length) return;
    const a = items[i], b = items[j];
    if (a.is_founder || b.is_founder) return toast.error("Founder is locked to position 1");
    try {
      await adminApi("reorderTeamMembers", {
        updates: [{ id: a.id, display_order: b.display_order }, { id: b.id, display_order: a.display_order }],
      });
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Reorder failed");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">The people behind E2 Trails</p>
          <h1 className="font-display font-bold text-3xl text-primary mt-1">Team ({items.length})</h1>
        </div>
        <button onClick={() => setCreating(true)} className="btn-accent btn-sm">
          <Plus className="w-4 h-4" aria-hidden="true" /> Add team member
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground surface rounded-xl p-6">No team members yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((m, idx) => (
            <div key={m.id} className="surface rounded-xl overflow-hidden">
              <div className="aspect-square bg-muted">
                {m.photo_url && signed[m.photo_url] ? (
                  <img src={signed[m.photo_url]} alt={m.full_name} className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-muted-foreground text-xs">
                    {m.is_founder ? "Founder photo (from app assets)" : "No photo"}
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display font-semibold text-primary text-sm">
                      {m.full_name} {m.is_founder && <span className="text-xs text-accent">★ Founder</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{m.role_title}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">#{m.display_order}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => swap(idx, idx - 1)}
                    disabled={idx === 0 || m.is_founder || items[idx - 1]?.is_founder}
                    className="px-2 py-1 rounded text-xs border border-border hover:bg-muted disabled:opacity-40"
                    title="Move up"
                  >↑</button>
                  <button
                    type="button"
                    onClick={() => swap(idx, idx + 1)}
                    disabled={idx === items.length - 1 || m.is_founder}
                    className="px-2 py-1 rounded text-xs border border-border hover:bg-muted disabled:opacity-40"
                    title="Move down"
                  >↓</button>
                  <button
                    type="button"
                    onClick={() => setEditing(m)}
                    className="ml-auto px-2 py-1 rounded text-xs border border-border hover:bg-muted inline-flex items-center gap-1"
                  ><Pencil className="w-3 h-3" /> Edit</button>
                  {!m.is_founder && (
                    <button
                      type="button"
                      onClick={() => setDeleting(m)}
                      className="p-1.5 rounded text-destructive hover:bg-destructive/10"
                      title="Delete"
                    ><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TeamMemberDialog
          member={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={async () => { setCreating(false); setEditing(null); await load(); }}
          nextOrder={items.length ? Math.max(...items.map((i) => i.display_order)) + 1 : 2}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Remove this team member?"
        description={deleting ? `${deleting.full_name} and their photo will be removed from the site.` : ""}
        confirmLabel="Remove member"
        onConfirm={onDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

/* ================================================================== */
/* Team member dialog                                                  */
/* ================================================================== */

function TeamMemberDialog({
  member,
  onClose,
  onSaved,
  nextOrder,
}: {
  member: TeamMember | null;
  onClose: () => void;
  onSaved: () => void;
  nextOrder: number;
}) {
  const isEdit = !!member;
  const [fullName, setFullName] = useState(member?.full_name ?? "");
  const [roleTitle, setRoleTitle] = useState(member?.role_title ?? "");
  const [bio, setBio] = useState(member?.bio ?? "");
  const [badges, setBadges] = useState<Badge[]>(
    (member?.badges && member.badges.length ? member.badges : [{ icon: "", label: "" }]).slice(0, 3),
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const setBadgeAt = (i: number, patch: Partial<Badge>) => {
    setBadges((b) => b.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  };
  const addBadge = () => setBadges((b) => (b.length < 3 ? [...b, { icon: "", label: "" }] : b));
  const removeBadge = (i: number) => setBadges((b) => b.filter((_, idx) => idx !== i));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !roleTitle.trim()) return toast.error("Name and role are required");
    setSaving(true);
    try {
      let photo_url = member?.photo_url ?? null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop() || "jpg";
        const path = `team/${crypto.randomUUID()}.${ext}`;
        await adminUpload("team-photos", path, photoFile);
        if (photo_url) { try { await adminRemove("team-photos", photo_url); } catch { /* ignore */ } }
        photo_url = path;
      }
      const cleanBadges = badges
        .map((b) => ({ icon: (b.icon || "").trim(), label: (b.label || "").trim() }))
        .filter((b) => b.label)
        .slice(0, 3);

      if (isEdit) {
        await adminApi("updateTeamMember", {
          id: member!.id,
          patch: { full_name: fullName.trim(), role_title: roleTitle.trim(), bio, photo_url, badges: cleanBadges },
        });
        toast.success("Updated");
      } else {
        await adminApi("insertTeamMember", {
          row: {
            full_name: fullName.trim(),
            role_title: roleTitle.trim(),
            bio,
            photo_url,
            badges: cleanBadges,
            display_order: nextOrder,
            is_founder: false,
          },
        });
        toast.success("Added");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-primary">
            {isEdit ? "Edit team member" : "Add team member"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="field-label">Full Name *</label>
              <input className="field-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="field-label">Role / Title *</label>
              <input className="field-input" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Trek Lead" required />
            </div>
          </div>
          <div>
            <label className="field-label">Bio (1–2 paragraphs, blank line between)</label>
            <textarea className="field-input min-h-32" value={bio} onChange={(e) => setBio(e.target.value)} rows={6} />
          </div>
          <div>
            <label className="field-label">Photo</label>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="block text-sm" />
            {member?.photo_url && !photoFile && (
              <p className="text-xs text-muted-foreground mt-1">Existing photo will be kept unless replaced.</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="field-label">Badges (up to 3)</label>
              {badges.length < 3 && (
                <button type="button" onClick={addBadge} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add badge
                </button>
              )}
            </div>
            <div className="space-y-2 mt-1">
              {badges.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="field-input w-20"
                    placeholder="🧭"
                    value={b.icon ?? ""}
                    onChange={(e) => setBadgeAt(i, { icon: e.target.value })}
                    maxLength={4}
                  />
                  <input
                    className="field-input flex-1"
                    placeholder="Lead Guide"
                    value={b.label}
                    onChange={(e) => setBadgeAt(i, { label: e.target.value })}
                  />
                  <button type="button" onClick={() => removeBadge(i)} className="p-1.5 rounded text-destructive hover:bg-destructive/10">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline btn-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary btn-sm disabled:opacity-60">
              {saving ? "Saving…" : (isEdit ? "Save changes" : "Add member")}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
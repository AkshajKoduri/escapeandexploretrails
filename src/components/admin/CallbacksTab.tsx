import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, PhoneCall } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { STATUS_CHIP } from "@/lib/admin";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type CallbackRequest = {
  id: string;
  trip_id: string | null;
  trip_name: string | null;
  full_name: string;
  email: string | null;
  mobile_number: string;
  preferred_time: string | null;
  status: string;
  created_at: string;
};

export default function CallbacksTab() {
  const [rows, setRows] = useState<CallbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<CallbackRequest | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi<{ data: CallbackRequest[] }>("listCallbackRequests");
      setRows(res?.data ?? []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markContacted = async (id: string) => {
    try {
      await adminApi("updateCallback", { id, patch: { status: "contacted" } });
      toast.success("Marked as contacted");
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const remove = async () => {
    if (!removing) return;
    const id = removing.id;
    setRemoving(null);
    try {
      await adminApi("deleteCallback", { id });
      toast.success("Deleted");
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="kicker">Lead follow-up</p>
        <h1 className="font-display font-bold text-3xl text-primary mt-1">Callbacks</h1>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground surface rounded-xl p-6">No callback requests yet.</p>
      ) : (
        <div className="surface rounded-xl overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[760px]">
            <thead>
              <tr className="text-left border-b border-border bg-muted/40">
                <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">When</th>
                <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trip</th>
                <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contact</th>
                <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Preferred time</th>
                <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 align-top">
                  <td className="p-3 whitespace-nowrap text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN")}</td>
                  <td className="p-3">{r.trip_name ?? "—"}</td>
                  <td className="p-3 font-medium">{r.full_name}</td>
                  <td className="p-3 whitespace-nowrap space-y-0.5">
                    <a href={`tel:${r.mobile_number}`} className="text-primary hover:underline block">{r.mobile_number}</a>
                    {r.email && <a href={`mailto:${r.email}`} className="text-muted-foreground hover:text-primary block text-xs">{r.email}</a>}
                  </td>
                  <td className="p-3 text-muted-foreground">{r.preferred_time ?? "—"}</td>
                  <td className="p-3">
                    <span className={cn("pill", STATUS_CHIP[r.status === "contacted" ? "CONTACTED" : "PENDING"])}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {r.status !== "contacted" && (
                        <button
                          onClick={() => markContacted(r.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-secondary transition"
                        >
                          <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" /> Mark contacted
                        </button>
                      )}
                      <button
                        onClick={() => setRemoving(r)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!removing}
        title="Delete this callback request?"
        description={removing ? `${removing.full_name}'s request will be permanently deleted.` : ""}
        confirmLabel="Delete"
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
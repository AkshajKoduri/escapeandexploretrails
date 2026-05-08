import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mountain, Download, ArrowLeft } from "lucide-react";

export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ bookings: 0, people: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Admin — E2 Trails";
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      const admin = !!data;
      setIsAdmin(admin);
      if (admin) {
        const [{ count: bCount }, { count: mCount }] = await Promise.all([
          supabase.from("bookings").select("*", { count: "exact", head: true }),
          supabase.from("booking_members").select("*", { count: "exact", head: true }),
        ]);
        setStats({ bookings: bCount ?? 0, people: (bCount ?? 0) + (mCount ?? 0) });
      }
    })();
  }, [user, loading, navigate]);

  const downloadExcel = async () => {
    setBusy(true);
    try {
      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (bErr) throw bErr;

      const { data: members, error: mErr } = await supabase
        .from("booking_members")
        .select("*");
      if (mErr) throw mErr;

      const membersByBooking = new Map<string, typeof members>();
      (members ?? []).forEach((m) => {
        const arr = membersByBooking.get(m.booking_id) ?? [];
        arr.push(m);
        membersByBooking.set(m.booking_id, arr);
      });

      // Sheet 1: every person (primary + group members) as one row
      const allPeople: any[] = [];
      (bookings ?? []).forEach((b) => {
        allPeople.push({
          "Booking ID": b.id,
          "Trek": b.trek_name,
          "Booking Date": new Date(b.created_at).toLocaleString(),
          "Status": b.status,
          "Role": "Primary",
          "Full Name": b.primary_name,
          "Age": b.primary_age,
          "Gender": b.primary_gender,
          "Phone": b.primary_phone,
          "Email": b.primary_email ?? "",
          "Aadhaar Number": b.primary_aadhaar,
          "Aadhaar Photo Path": b.primary_aadhaar_photo,
          "Group Booking": b.is_group ? "Yes" : "No",
        });
        (membersByBooking.get(b.id) ?? []).forEach((m) => {
          allPeople.push({
            "Booking ID": b.id,
            "Trek": b.trek_name,
            "Booking Date": new Date(b.created_at).toLocaleString(),
            "Status": b.status,
            "Role": "Group Member",
            "Full Name": m.full_name,
            "Age": "",
            "Gender": "",
            "Phone": "",
            "Email": "",
            "Aadhaar Number": m.aadhaar_number,
            "Aadhaar Photo Path": m.aadhaar_photo,
            "Group Booking": "Yes",
          });
        });
      });

      // Sheet 2: bookings summary
      const bookingsSheet = (bookings ?? []).map((b) => ({
        "Booking ID": b.id,
        "Trek": b.trek_name,
        "Date": new Date(b.created_at).toLocaleString(),
        "Status": b.status,
        "Primary Name": b.primary_name,
        "Primary Phone": b.primary_phone,
        "Primary Email": b.primary_email ?? "",
        "Group Booking": b.is_group ? "Yes" : "No",
        "Total People": 1 + (membersByBooking.get(b.id)?.length ?? 0),
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allPeople), "All Trekkers");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bookingsSheet), "Bookings Summary");

      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      XLSX.writeFile(wb, `e2trails-bookings-${ts}.xlsx`);
      toast.success("Excel file downloaded");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to download");
    } finally {
      setBusy(false);
    }
  };

  if (loading || isAdmin === null) {
    return <main className="min-h-screen grid place-items-center">Loading…</main>;
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/10 via-background to-primary/10 px-4">
        <div className="max-w-md text-center bg-card rounded-2xl shadow-trail border border-primary/10 p-8">
          <Mountain className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="font-heading font-bold text-2xl text-primary mb-2">Admin access only</h1>
          <p className="text-sm text-muted-foreground mb-6">
            You're signed in as <span className="font-medium">{user?.email}</span>, but this page is restricted to trek leads.
            Ask an admin to grant your account the <code className="px-1 rounded bg-muted">admin</code> role, then refresh.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 text-accent font-semibold hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-secondary/10 via-background to-primary/10 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <div className="bg-card rounded-2xl shadow-trail border border-primary/10 p-8 md:p-10">
          <div className="flex items-center gap-3 mb-2">
            <Mountain className="w-7 h-7 text-primary" />
            <h1 className="font-heading font-bold text-2xl text-primary">Trek Lead Dashboard</h1>
          </div>
          <p className="text-muted-foreground mb-8">Download every registered trekker's details for upcoming treks.</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="rounded-xl border border-primary/10 bg-background p-5">
              <div className="text-3xl font-bold text-primary">{stats.bookings}</div>
              <div className="text-sm text-muted-foreground">Total bookings</div>
            </div>
            <div className="rounded-xl border border-primary/10 bg-background p-5">
              <div className="text-3xl font-bold text-primary">{stats.people}</div>
              <div className="text-sm text-muted-foreground">Total trekkers</div>
            </div>
          </div>

          <button
            onClick={downloadExcel}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-gradient-orange text-accent-foreground font-semibold shadow-glow hover:scale-[1.01] transition disabled:opacity-60"
          >
            <Download className="w-5 h-5" />
            {busy ? "Preparing…" : "Download all bookings (.xlsx)"}
          </button>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Includes a row per trekker (primary + group members) with name, age, gender, phone, email, Aadhaar number and photo path.
          </p>
        </div>
      </div>
    </main>
  );
}

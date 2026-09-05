import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/lib/adminApi";
import type { Booking, SeatStats, Trek } from "@/lib/admin";
import type { AdminModule } from "@/lib/admin";
import AdminShell from "@/components/admin/AdminShell";
import DashboardTab from "@/components/admin/DashboardTab";
import TripsTab from "@/components/admin/TripsTab";
import BookingsTab from "@/components/admin/BookingsTab";
import CallbacksTab from "@/components/admin/CallbacksTab";
import DraftsTab from "@/components/admin/DraftsTab";
import GalleryTab from "@/components/admin/GalleryTab";
import TrailLogTab from "@/components/admin/TrailLogTab";
import TeamTab from "@/components/admin/TeamTab";

export default function Admin() {
  const [module, setModule] = useState<AdminModule>("dashboard");
  const [treks, setTreks] = useState<Trek[]>([]);
  const [stats, setStats] = useState<Map<string, SeatStats>>(new Map());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [callbacks, setCallbacks] = useState<{ id: string; status: string }[]>([]);

  const loadAll = useCallback(async () => {
    try {
      const [{ data: trekData }, { data: statsData }, bRes, mRes, cRes] = await Promise.all([
        supabase.from("upcoming_treks").select("*").order("trek_date", { ascending: true }),
        supabase.rpc("get_trek_seat_stats"),
        adminApi<{ data: Booking[] }>("listBookings"),
        adminApi<{ data: any[] }>("listBookingMembers"),
        adminApi<{ data: { id: string; status: string }[] }>("listCallbackRequests"),
      ]);
      if (trekData) setTreks(trekData as unknown as Trek[]);
      const sm = new Map<string, SeatStats>();
      (statsData ?? []).forEach((s: any) => sm.set(s.trek_id, s));
      setStats(sm);
      setBookings(bRes?.data ?? []);
      setMembers(mRes?.data ?? []);
      setCallbacks(cRes?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load admin data");
    }
  }, []);

  useEffect(() => {
    document.title = "Admin — E2 Trails";
    loadAll();
  }, [loadAll]);

  const activeTreks = useMemo(() => treks.filter((t) => !t.is_archived && !t.is_draft), [treks]);
  const draftTreks = useMemo(() => treks.filter((t) => t.is_draft && !t.is_archived), [treks]);
  const allTreks = useMemo(() => treks.filter((t) => !t.is_draft), [treks]);

  const navigateModule = (m: AdminModule) => {
    setModule(m);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AdminShell module={module} onNavigate={navigateModule}>
      {module === "dashboard" && (
        <DashboardTab
          treks={activeTreks}
          stats={stats}
          bookings={bookings}
          callbacks={callbacks}
          onNavigate={navigateModule}
        />
      )}
      {module === "trips" && (
        <TripsTab treks={allTreks} stats={stats} bookings={bookings} members={members} reload={loadAll} />
      )}
      {module === "bookings" && (
        <BookingsTab bookings={bookings} members={members} treks={allTreks} reload={loadAll} />
      )}
      {module === "callbacks" && <CallbacksTab />}
      {module === "trail-log" && <TrailLogTab />}
      {module === "gallery" && <GalleryTab />}
      {module === "team" && <TeamTab />}
      {module === "drafts" && <DraftsTab treks={draftTreks} reload={loadAll} />}
    </AdminShell>
  );
}
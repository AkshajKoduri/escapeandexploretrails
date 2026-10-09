import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import BookingsTab from "@/components/admin/BookingsTab";
import { adminApi } from "@/lib/adminApi";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
vi.mock("@/lib/adminApi", () => ({ adminApi: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const booking = { id: "group", status: "pending", primary_status: "pending", primary_name: "Organizer", primary_phone: "123", created_at: "2026-10-01", trek_name: "Example Trip", trek_date: "2026-11-01", is_group: true, seats_booked: 3, reserved_seats: 3, payment_status: "pending" };
const members = ["Ravi", "Maya"].map((name, i) => ({ id: `member-${i}`, booking_id: "group", full_name: name, status: "pending", no_show: false })) as Database["public"]["Tables"]["booking_members"]["Row"][];
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("group participant controls", () => {
  it("shows both decisions for each pending person and updates only the chosen member", async () => {
    vi.mocked(adminApi).mockResolvedValue({ ok: true });
    const reload = vi.fn();
    render(<BookingsTab bookings={[booking]} members={members} treks={[]} reload={reload} />);
    fireEvent.click(screen.getByRole("button", { name: "Manage participants" }));
    for (const name of ["Organizer", "Ravi", "Maya"]) {
      expect(screen.getByRole("button", { name: `Confirm participant ${name}` })).toBeVisible();
      expect(screen.getByRole("button", { name: `Cancel participant ${name}` })).toBeVisible();
    }
    fireEvent.click(screen.getByRole("button", { name: "Confirm participant Ravi" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Only this participant is affected");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm participant" }));
    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(adminApi).toHaveBeenCalledExactlyOnceWith("setParticipantStatus", { id: "group", memberId: "member-0", status: "confirmed" });
  });
  it("reports failure without reloading or claiming success", async () => {
    vi.mocked(adminApi).mockRejectedValue(new Error("Not enough seats"));
    const reload = vi.fn();
    render(<BookingsTab bookings={[booking]} members={members} treks={[]} reload={reload} />);
    fireEvent.click(screen.getByRole("button", { name: "Manage participants" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm participant Organizer" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Confirm participant" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Not enough seats"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});

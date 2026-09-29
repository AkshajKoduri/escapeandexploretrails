import type { Booking, Trek } from "@/lib/admin";
import type { Database } from "@/integrations/supabase/types";
import { resolveBookingDeparture } from "@/lib/bookingAdmin";
import { getBookingPayment, PAYMENT_STATUS_LABEL } from "@/lib/bookingPayments";

type BookingMember = Database["public"]["Tables"]["booking_members"]["Row"];

export function buildBookingExportRows(bookings: Booking[], members: BookingMember[], treks: Trek[]) {
  const membersByBooking = new Map<string, BookingMember[]>();
  const seenMembers = new Set<string>();
  for (const member of members) {
    if (seenMembers.has(member.id)) continue;
    seenMembers.add(member.id);
    const group = membersByBooking.get(member.booking_id) ?? [];
    group.push(member);
    membersByBooking.set(member.booking_id, group);
  }
  const uniqueBookings = [...new Map(bookings.map((booking) => [booking.id, booking])).values()];
  const memberRows = uniqueBookings.flatMap((booking) => {
    const shared = {
      "Booking ID": booking.id,
      Trip: booking.trek_name,
      Departure: resolveBookingDeparture(booking, treks) ?? "",
      "Package type": booking.selected_package_name ?? "",
      "Payment status": PAYMENT_STATUS_LABEL[getBookingPayment(booking).status],
    };
    return [{
      ...shared,
      Name: booking.primary_name,
      Age: booking.primary_age ?? "",
      Gender: booking.primary_gender ?? "",
      "Phone number": String(booking.primary_phone ?? ""),
    }, ...(membersByBooking.get(booking.id) ?? []).map((member) => ({
      ...shared,
      Name: member.full_name,
      Age: member.age ?? "",
      Gender: member.gender ?? "",
      "Phone number": String(member.phone ?? ""),
    }))];
  });
  // Exactly one financial row per booking, even when it has multiple participants.
  const bookingRows = uniqueBookings.map((booking) => {
    const payment = getBookingPayment(booking);
    return {
      "Booking ID": booking.id,
      Trip: booking.trek_name,
      Departure: resolveBookingDeparture(booking, treks) ?? "",
      "Package type": booking.selected_package_name ?? "",
      "Participants booked": booking.seats_booked ?? 1,
      "Payment status": PAYMENT_STATUS_LABEL[payment.status],
      "Total booking amount": payment.total ?? "",
      "Amount paid so far": payment.paid ?? "",
      "Remaining balance": payment.balance ?? "",
      Currency: booking.package_currency || "INR",
    };
  });
  return { memberRows, bookingRows };
}

export async function createBookingWorkbook(bookings: Booking[], members: BookingMember[], treks: Trek[]) {
  const XLSX = await import("xlsx");
  const { memberRows, bookingRows } = buildBookingExportRows(bookings, members, treks);
  if (!bookingRows.length) throw new Error("No bookings match the current filters.");
  const workbook = XLSX.utils.book_new();
  const memberHeader = ["Booking ID", "Trip", "Departure", "Name", "Age", "Gender", "Phone number", "Package type", "Payment status"];
  const memberSheet = XLSX.utils.json_to_sheet(memberRows, { header: memberHeader });
  memberSheet["!cols"] = memberHeader.map((heading) => ({ wch: heading === "Booking ID" ? 38 : heading === "Age" ? 8 : 24 }));
  // Explicit string cells retain country codes and leading zeroes and cannot become formulas.
  memberRows.forEach((row, index) => {
    memberSheet[XLSX.utils.encode_cell({ r: index + 1, c: 6 })] = { t: "s", v: row["Phone number"], z: "@" };
  });
  memberSheet["!autofilter"] = { ref: memberSheet["!ref"]! };
  XLSX.utils.book_append_sheet(workbook, memberSheet, "Members");
  const bookingSheet = XLSX.utils.json_to_sheet(bookingRows);
  bookingSheet["!cols"] = Object.keys(bookingRows[0]).map((heading) => ({ wch: heading === "Booking ID" ? 38 : 25 }));
  bookingRows.forEach((_, index) => {
    for (const column of [6, 7, 8]) {
      const cell = bookingSheet[XLSX.utils.encode_cell({ r: index + 1, c: column })];
      if (cell?.t === "n") cell.z = "#,##0.00";
    }
  });
  bookingSheet["!autofilter"] = { ref: bookingSheet["!ref"]! };
  XLSX.utils.book_append_sheet(workbook, bookingSheet, "Booking payments");
  return { XLSX, workbook };
}

export async function exportBookingMembers(bookings: Booking[], members: BookingMember[], treks: Trek[], options: { label: string }) {
  const { XLSX, workbook } = await createBookingWorkbook(bookings, members, treks);
  const label = options.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "bookings";
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `e2trails-${label}-members-${date}.xlsx`);
}

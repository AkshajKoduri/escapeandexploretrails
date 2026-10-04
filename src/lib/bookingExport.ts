import type { Booking, Trek } from "@/lib/admin";
import type { Database } from "@/integrations/supabase/types";
import { resolveBookingDeparture } from "@/lib/bookingAdmin";
import { getBookingPayment, PAYMENT_STATUS_LABEL } from "@/lib/bookingPayments";

type BookingMember = Database["public"]["Tables"]["booking_members"]["Row"];
export const MEMBER_HEADERS = ["S.No.", "Name", "Age", "Mobile Number", "Package Type", "Payment Status"];

export function buildBookingExportRows(bookings: Booking[], members: BookingMember[], _treks: Trek[] = [], filters: { query?: string; age?: string; gender?: string } = {}) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const uniqueMembers = [...new Map(members.map(member => [member.id, member])).values()];
  const uniqueBookings = [...new Map(bookings.map(booking => [booking.id, booking])).values()];
  const eligible = uniqueBookings.filter(booking => booking.status === "confirmed").map(booking => ({
    booking,
    people: [
      { name: booking.primary_name, age: booking.primary_age, phone: booking.primary_phone, email: booking.primary_email, gender: booking.primary_gender, noShow: booking.primary_no_show },
      ...uniqueMembers.filter(member => member.booking_id === booking.id).map(member => ({ name: member.full_name, age: member.age, phone: member.phone, email: member.email, gender: member.gender, noShow: member.no_show })),
    ].filter(person => !person.noShow
      && (!filters.age || filters.age === "all" || String(person.age ?? "unknown") === filters.age)
      && (!filters.gender || filters.gender === "all" || String(person.gender ?? "unknown") === filters.gender)
      && (!query || [person.name, person.phone, person.email].some(value => String(value ?? "").toLowerCase().includes(query))
        || [booking.trek_name, booking.selected_package_name].some(value => String(value ?? "").toLowerCase().includes(query)))),
  })).filter(group => group.people.length > 0);
  let serial = 0;
  const memberRows = eligible.flatMap(({ booking, people }) => people.map(person => ({
    "S.No.": ++serial,
    Name: person.name ?? "",
    Age: person.age ?? "",
    "Mobile Number": String(person.phone ?? ""),
    "Package Type": booking.selected_package_name ?? "",
    "Payment Status": PAYMENT_STATUS_LABEL[getBookingPayment(booking).status],
  })));
  return { memberRows, bookingCount: eligible.length };
}

export function bookingExportFilename(tripName: string, departure: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(departure)) throw new Error("Select one departure date before exporting.");
  const firstWord = tripName.trim().split(/\s+/)[0]?.replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 60) || "Trip";
  return `${firstWord}_${departure}.xlsx`;
}

export async function createBookingWorkbook(bookings: Booking[], members: BookingMember[], treks: Trek[], filters: { query?: string; age?: string; gender?: string } = {}) {
  const XLSX = await import("xlsx");
  const { memberRows } = buildBookingExportRows(bookings, members, treks, filters);
  if (!memberRows.length) throw new Error("No eligible confirmed participants match the current filters.");
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(memberRows, { header: MEMBER_HEADERS });
  sheet["!cols"] = [8, 28, 8, 22, 28, 20].map(wch => ({ wch }));
  memberRows.forEach((row, index) => {
    sheet[XLSX.utils.encode_cell({ r: index + 1, c: 3 })] = { t: "s", v: row["Mobile Number"], z: "@" };
  });
  sheet["!autofilter"] = { ref: sheet["!ref"]! };
  XLSX.utils.book_append_sheet(workbook, sheet, "Members");
  return { XLSX, workbook };
}

export async function exportBookingMembers(bookings: Booking[], members: BookingMember[], treks: Trek[], options: { tripId: string; departure: string; filters?: { query?: string; age?: string; gender?: string } }) {
  const trek = treks.find(trip => trip.id === options.tripId);
  if (!trek || options.departure === "all" || options.departure === "unknown") throw new Error("Select one trip and one departure date before exporting.");
  if (bookings.some(booking => booking.trek_id !== options.tripId || resolveBookingDeparture(booking, treks) !== options.departure)) throw new Error("The export selection changed. Review the filters again.");
  const { XLSX, workbook } = await createBookingWorkbook(bookings, members, treks, options.filters);
  XLSX.writeFile(workbook, bookingExportFilename(trek.name, options.departure));
}

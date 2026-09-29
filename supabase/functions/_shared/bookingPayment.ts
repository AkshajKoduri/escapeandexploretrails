type Row = Record<string, unknown>;

export function money(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 10_000_000) {
    throw new Error(`${label} must be a non-negative amount`);
  }
  const cents = Math.round(value * 100);
  if (Math.abs(value * 100 - cents) > 0.0001) throw new Error(`${label} must have at most two decimal places`);
  return cents / 100;
}

/** Changes to unrelated fields must not guess historical payment amounts. */
export function normalizePayment(current: Row | null, patch: Row): Row {
  const result = { ...patch };
  const paymentChange = "amount_paid" in patch || "booking_total" in patch || "payment_status" in patch;
  if (current && !paymentChange) return result;

  const totalValue = "booking_total" in patch ? patch.booking_total : current?.booking_total;
  const total = totalValue == null ? null : money(totalValue, "Booking total");
  if (current?.booking_total != null && "booking_total" in patch && total !== current.booking_total) {
    throw new Error("The recorded booking total cannot be changed when recording a payment");
  }
  let paidValue = "amount_paid" in patch ? patch.amount_paid : current?.amount_paid;
  // Compatible with old admin bundles that only set Pending or Paid.
  if ("payment_status" in patch && !("amount_paid" in patch)) {
    if (patch.payment_status === "pending") paidValue = 0;
    else if (patch.payment_status === "paid" && total != null) paidValue = total;
    else throw new Error("Record the cumulative amount paid to update payment status");
  }
  if (!current && paidValue == null) paidValue = 0;
  if (paidValue == null) throw new Error("Enter the amount paid so far to confirm this historical booking");
  const paid = money(paidValue, "Amount paid so far");
  if (total == null) {
    if (paid > 0 || current) throw new Error("Confirm the actual booking total before recording a payment");
    return { ...result, amount_paid: 0, payment_status: "pending" };
  }
  if (Math.round(paid * 100) > Math.round(total * 100)) throw new Error("Amount paid cannot exceed the booking total");
  result.amount_paid = paid;
  result.payment_status = paid === total ? "paid" : paid === 0 ? "pending" : "partial";
  if ("booking_total" in result) result.booking_total = total;
  return result;
}

/** Price snapshots come from configured packages, never client-supplied labels/prices. */
export function manualBookingSnapshot(row: Row, trek: Row): Row {
  const seats = row.seats_booked ?? 1;
  if (typeof seats !== "number" || !Number.isInteger(seats) || seats < 1 || seats > 100) {
    throw new Error("Enter a valid participant count");
  }
  const details = trek.trip_details as { packages?: Row[] } | null;
  const packages = Array.isArray(details?.packages) ? details.packages : [];
  const selected = row.selected_package_id ? packages.find((p) => p.id === row.selected_package_id) : packages.length === 1 ? packages[0] : null;
  if (row.selected_package_id && !selected) throw new Error("The selected package is unavailable");
  if (packages.length > 1 && !selected) throw new Error("Select a package");
  const unitValue = selected ? selected.priceAmount : trek.price;
  const unit = unitValue == null ? null : money(unitValue, "Package price");
  const basis = selected?.priceBasis === "per_booking" ? "per_booking" : "per_person";
  const total = unit == null ? (row.booking_total == null ? null : money(row.booking_total, "Booking total")) : money(unit * (basis === "per_booking" ? 1 : seats), "Booking total");
  return {
    ...row, trek_name: trek.name, seats_booked: seats,
    selected_package_id: selected?.id ?? null,
    selected_package_name: selected?.name ?? null,
    package_unit_amount: unit, package_price_basis: basis, package_currency: "INR",
    booking_total: total, booking_source: "manual",
  };
}

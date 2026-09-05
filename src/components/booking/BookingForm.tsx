import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Minus, Plus, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Adventure } from "@/lib/treks";
import { fmtDate, fmtDateShort, inr, submitBooking, WHATSAPP_NUMBER } from "@/lib/treks";

/* ------------------------------------------------------------------ */
/* One source of truth for the booking form                            */
/* ------------------------------------------------------------------ */

const bookingSchema = z.object({
  name: z.string().trim().min(2, "Enter the lead traveller's full name").max(80),
  age: z.coerce.number().int().min(10, "Minimum age is 10").max(99, "Enter an age under 100"),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"], {
    errorMap: () => ({ message: "Please choose an option" }),
  }),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9\s-]{10,15}$/, "Enter a valid phone number (10+ digits)"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
});

const MAX_SEATS_PER_BOOKING = 12;

export type BookingSuccessInfo = {
  date: string;
  people: number;
  bookingId?: string;
};

type BookingFormProps = {
  adventure: Adventure;
  /** Initial / externally requested date (e.g. "Book this date" click or ?date=). */
  initialDate?: string | null;
  initialPeople?: number;
  /** "panel" = compact embedded card (trek page); "page" = two-column layout with sticky summary. */
  variant?: "panel" | "page";
  /** Renders the built-in success card (default true). BookingPage passes false and renders its own. */
  showSuccess?: boolean;
  onSuccess?: (info: BookingSuccessInfo) => void;
  /** Extra actions rendered inside the built-in success card. */
  successActions?: React.ReactNode;
  heading?: React.ReactNode;
  /** Bump to reset the form to a fresh state (e.g. after "make another booking"). */
  resetSignal?: number;
};

export default function BookingForm({
  adventure,
  initialDate,
  initialPeople = 1,
  variant = "panel",
  showSuccess = true,
  onSuccess,
  successActions,
  heading,
  resetSignal = 0,
}: BookingFormProps) {
  const uid = useId().replace(/[:]/g, "");
  const price = adventure.startingPrice ?? (adventure.price > 0 ? adventure.price : null);
  const soldOut = adventure.isFull || adventure.seatsRemaining <= 0;
  const maxPeople = Math.max(
    1,
    Math.min(Math.max(adventure.seatsRemaining, 1), MAX_SEATS_PER_BOOKING),
  );

  const [date, setDate] = useState<string>(() => {
    if (initialDate && adventure.dates.includes(initialDate)) return initialDate;
    return adventure.dates[0] ?? "";
  });
  const [people, setPeople] = useState<number>(() =>
    Math.min(Math.max(1, initialPeople), Math.max(1, adventure.seatsRemaining)),
  );
  const [memberNames, setMemberNames] = useState<string[]>(() =>
    Array.from(
      { length: Math.max(0, Math.min(initialPeople, adventure.seatsRemaining) - 1) },
      () => "",
    ),
  );
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [bookingId, setBookingId] = useState<string | undefined>();
  // Idempotency key: retries after a timeout or lost response reuse the same
  // key so the server can never create a duplicate booking.
  const [clientRef, setClientRef] = useState(() => crypto.randomUUID());
  // Mobile sticky bar visibility (page variant only).
  const [stickyVisible, setStickyVisible] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  // Fresh state whenever the adventure changes (e.g. re-picked from the list).
  useEffect(() => {
    setDate(initialDate && adventure.dates.includes(initialDate) ? initialDate : adventure.dates[0] ?? "");
    setPeople(1);
    setMemberNames([]);
    setName("");
    setAge("");
    setGender("");
    setPhone("");
    setEmail("");
    setErrors({});
    setDone(false);
    setClientRef(crypto.randomUUID());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adventure.id]);

  // Keep member-name rows exactly in sync with the people count, so a
  // decrement can never leave stale rows behind.
  useEffect(() => {
    setMemberNames((prev) => {
      const target = Math.max(0, people - 1);
      if (prev.length === target) return prev;
      if (prev.length < target) return [...prev, ...Array.from({ length: target - prev.length }, () => "")];
      return prev.slice(0, target);
    });
  }, [people]);

  // React to a later "Book this date" click (date requested mid-page).
  useEffect(() => {
    if (initialDate && adventure.dates.includes(initialDate)) setDate(initialDate);
  }, [initialDate, adventure.id, adventure.dates]);

  // External "start over" signal (used by BookingPage's success actions).
  useEffect(() => {
    if (resetSignal === 0) return;
    setDone(false);
    setName("");
    setAge("");
    setGender("");
    setPhone("");
    setEmail("");
    setErrors({});
    setMemberNames([]);
    setPeople(1);
    setDate(adventure.dates[0] ?? "");
    setBookingId(undefined);
    setClientRef(crypto.randomUUID());
  }, [resetSignal, adventure.id, adventure.dates]);

  // Mobile sticky bar: appears once the user has scrolled past the top of the
  // form and disappears again near the page bottom (where the real button is).
  useEffect(() => {
    if (variant !== "page" || done) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 200;
        setStickyVisible(y > 320 && !nearBottom);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [variant, done, adventure.id]);

  const errId = (field: string) => (errors[field] ? `${uid}-${field}-error` : undefined);

  const focusFirstInvalid = (order: string[]) => {
    const first = order.find((f) => errors[f]);
    if (!first) return;
    const el = document.getElementById(`${uid}-${first}`) as HTMLElement | null;
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (soldOut || adventure.dates.length === 0) return;

    const next: Record<string, string> = {};
    if (!date) next.date = "Choose a date first";
    memberNames.forEach((m, i) => {
      if (!m.trim()) next[`member-${i}`] = "Enter this person's name";
    });

    const parsed = bookingSchema.safeParse({ name, age, gender, phone, email });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      requestAnimationFrame(() =>
        focusFirstInvalid(["date", "name", "age", "gender", "phone", "email", ...memberNames.map((_, i) => `member-${i}`)]),
      );
      return;
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      requestAnimationFrame(() =>
        focusFirstInvalid(["date", "name", "age", "gender", "phone", "email", ...memberNames.map((_, i) => `member-${i}`)]),
      );
      return;
    }

    setSubmitting(true);
    const result = await submitBooking({
      trek: adventure,
      trekDate: date,
      name: parsed.data.name,
      age: parsed.data.age,
      gender: parsed.data.gender,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      groupMembers: memberNames.map((m) => ({ name: m.trim() })),
      clientRef,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setBookingId(result.bookingId);
    setDone(true);
    toast.success("Booking received — our team will call you to confirm.");
    onSuccess?.({ date, people, bookingId: result.bookingId });
  };

  /* ------------------------------- Success ------------------------------ */
  if (showSuccess && done) {
    const ref = bookingId ? bookingId.replace(/-/g, "").slice(0, 8).toUpperCase() : undefined;
    return (
      <div
        id="book"
        className={cn(
          "rounded-xl border border-primary/15 bg-card shadow-trail p-7 md:p-8 scroll-mt-24",
          variant === "panel" && "lg:sticky lg:top-24",
        )}
      >
        <div className="inline-flex w-14 h-14 rounded-full bg-green-600/15 text-green-700 items-center justify-center mb-5">
          <CheckCircle2 className="w-7 h-7" strokeWidth={2} aria-hidden="true" />
        </div>
        <p className="kicker">Booking received</p>
        <h3 className="font-display font-bold text-2xl md:text-3xl text-primary mt-2">
          You're on the trail, {name.trim().split(" ")[0] || "friend"}!
        </h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Your booking for{" "}
          <span className="font-semibold text-foreground">{adventure.name}</span>
          {date ? ` on ${fmtDate(date)}` : ""} has been received and is{" "}
          <span className="font-semibold text-foreground">pending our confirmation</span>. Our team
          will call <span className="font-semibold text-foreground">{phone}</span> to confirm your
          seats — no payment is taken online.
        </p>

        <dl className="mt-6 rounded-lg bg-muted/60 p-4 text-sm space-y-2">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Trip</dt><dd className="font-semibold text-right">{adventure.name}</dd></div>
          {date && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Date</dt><dd className="font-semibold text-right">{fmtDate(date)}</dd></div>}
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Travellers</dt><dd className="font-semibold text-right">{people}</dd></div>
          {price != null && (
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Estimated total</dt><dd className="font-display font-bold text-right">{inr(price * people)}</dd></div>
          )}
          {ref && (
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Booking reference</dt><dd className="font-mono font-semibold text-right text-primary">{ref}</dd></div>
          )}
        </dl>

        <div className="mt-6">
          <p className="text-sm font-semibold text-primary">What happens next</p>
          <ol className="mt-3 space-y-2.5">
            {[
              ["Booking received", "Your seats are noted as pending — nothing is charged."],
              ["Our team calls you", "We confirm your booking and answer any questions."],
              ["Payment", "We share the payment details — no payment is taken online."],
              ["Trip details", "You receive the final instructions before you head out."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent text-[11px] font-bold"
                >
                  {i + 1}
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">{t}.</span> {d}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
              `Hi E2 Trails, I just booked the ${adventure.name}${date ? ` on ${fmtDate(date)}` : ""}${ref ? ` (ref ${ref})` : ""}. Looking forward to it!`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-primary hover:border-accent/50 hover:text-accent transition-colors min-h-[44px]"
          >
            <MessageCircle className="w-4 h-4 text-[#25D366]" aria-hidden="true" />
            Chat with us on WhatsApp
          </a>
          {successActions}
        </div>
      </div>
    );
  }

  /* ------------------------------ Form body ----------------------------- */
  const sections = (
    <>
      {/* Date */}
      <section>
        <h2 className="field-label text-base mb-3">Choose your date</h2>
        <p className="text-sm text-muted-foreground mb-3">
          {soldOut
            ? "This adventure is currently full."
            : adventure.dates.length === 0
              ? "No upcoming dates yet — check back soon."
              : `${adventure.seatsRemaining} seat${adventure.seatsRemaining > 1 ? "s" : ""} available across these dates (shared pool).`}
        </p>
        {adventure.dates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {adventure.dates.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={date === d}
                onClick={() => setDate(d)}
                className={cn("filter-pill", date === d ? "filter-pill-active" : "filter-pill-idle")}
              >
                {fmtDateShort(d)}
              </button>
            ))}
          </div>
        ) : null}
        {errors.date && (
          <p id={errId("date")} className="field-error" role="alert">
            {errors.date}
          </p>
        )}
      </section>

      {/* People */}
      <section>
        <h2 className="field-label text-base mb-3">Who's coming?</h2>
        <div className="rounded-lg bg-muted/50 border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Travellers</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {soldOut
                  ? "Full — no seats left."
                  : `${adventure.seatsRemaining} seat${adventure.seatsRemaining > 1 ? "s" : ""} available`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Fewer people"
                onClick={() => setPeople((p) => Math.max(1, p - 1))}
                disabled={people <= 1 || soldOut}
                className="w-9 h-9 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-40"
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="w-8 text-center font-display font-bold text-lg text-primary" aria-live="polite">
                {people}
              </span>
              <button
                type="button"
                aria-label="More people"
                onClick={() => setPeople((p) => Math.min(maxPeople, p + 1))}
                disabled={people >= maxPeople || soldOut}
                className="w-9 h-9 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-40"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          {people > 1 && (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Add the other {people - 1} traveller{people - 1 > 1 ? "s" : ""}.
              </p>
              {memberNames.map((m, i) => (
                <div key={i}>
                  <label htmlFor={`${uid}-member-${i}`} className="sr-only">
                    Traveller {i + 2} full name
                  </label>
                  <input
                    id={`${uid}-member-${i}`}
                    value={m}
                    onChange={(e) =>
                      setMemberNames((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))
                    }
                    placeholder={`Traveller ${i + 2} — full name`}
                    autoComplete="name"
                    maxLength={80}
                    className="field-input"
                    aria-invalid={!!errors[`member-${i}`]}
                    aria-describedby={errId(`member-${i}`)}
                  />
                  {errors[`member-${i}`] && (
                    <p id={errId(`member-${i}`)} className="field-error" role="alert">
                      {errors[`member-${i}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lead traveller details */}
      <section>
        <h2 className="field-label text-base mb-3">Your details</h2>
        <p className="text-xs text-muted-foreground -mt-1.5 mb-4">
          Age and gender help us plan the group and keep everyone safe on the trail.
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor={`${uid}-name`} className="field-label">
              Full name <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <input
              id={`${uid}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={80}
              className="field-input"
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errId("name")}
            />
            {errors.name && (
              <p id={errId("name")} className="field-error" role="alert">
                {errors.name}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${uid}-age`} className="field-label">
                Age <span aria-hidden="true" className="text-destructive">*</span>
              </label>
              <input
                id={`${uid}-age`}
                type="number"
                inputMode="numeric"
                min={10}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 28"
                className="field-input"
                aria-required="true"
                aria-invalid={!!errors.age}
                aria-describedby={errId("age")}
              />
              {errors.age && (
                <p id={errId("age")} className="field-error" role="alert">
                  {errors.age}
                </p>
              )}
            </div>
            <div>
              <label htmlFor={`${uid}-gender`} className="field-label">
                Gender <span aria-hidden="true" className="text-destructive">*</span>
              </label>
              <select
                id={`${uid}-gender`}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="field-input"
                aria-required="true"
                aria-invalid={!!errors.gender}
                aria-describedby={errId("gender")}
              >
                <option value="">Select…</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
                <option>Prefer not to say</option>
              </select>
              {errors.gender && (
                <p id={errId("gender")} className="field-error" role="alert">
                  {errors.gender}
                </p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor={`${uid}-phone`} className="field-label">
              Phone <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <input
              id={`${uid}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="WhatsApp number preferred"
              className="field-input"
              aria-required="true"
              aria-invalid={!!errors.phone}
              aria-describedby={errId("phone")}
            />
            {errors.phone && (
              <p id={errId("phone")} className="field-error" role="alert">
                {errors.phone}
              </p>
            )}
          </div>
          <div>
            <label htmlFor={`${uid}-email`} className="field-label">
              Email <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id={`${uid}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="field-input"
              aria-invalid={!!errors.email}
              aria-describedby={errId("email")}
            />
            {errors.email && (
              <p id={errId("email")} className="field-error" role="alert">
                {errors.email}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );

  const ctaButton = (
    <button
      type="submit"
      disabled={submitting || soldOut || adventure.dates.length === 0}
      className="btn-accent w-full disabled:opacity-50"
    >
      {submitting
        ? "Sending…"
        : soldOut
          ? "Sold out"
          : price != null
            ? `Confirm booking${people > 1 ? ` — ${inr(price * people)}` : ""}`
            : "Request booking"}
      {!submitting && !soldOut && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
    </button>
  );

  const trustNote = (
    <p className="text-xs text-muted-foreground text-center leading-relaxed">
      No payment is taken online. Our team reviews your booking and calls you to confirm.
    </p>
  );

  const submitButtonRow = (
    <>
      {ctaButton}
      {trustNote}
    </>
  );

  /* ------------------------- Page (two-column) ------------------------- */
  if (variant === "page") {
    return (
      <>
        <form
          onSubmit={submit}
          noValidate
          ref={formRef}
          className="grid lg:grid-cols-[1fr_360px] gap-10 lg:gap-12 items-start"
        >
          <div className="space-y-10 min-w-0">{sections}</div>
          <aside className="rounded-xl border border-primary/15 bg-card shadow-trail p-6 lg:sticky lg:top-20">
            <p className="kicker">Booking summary</p>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Trip</dt>
                <dd className="font-semibold text-right">{adventure.name}</dd>
              </div>
              {date && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-semibold text-right">{fmtDate(date)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Travellers</dt>
                <dd className="font-semibold text-right">{people}</dd>
              </div>
              {price != null ? (
                <div className="flex justify-between gap-3 border-t border-border pt-2.5 mt-2.5">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-display font-bold text-xl text-primary">{inr(price * people)}</dd>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-2.5 mt-2.5">
                  Price is confirmed by our team for this adventure.
                </p>
              )}
              {adventure.itineraryDays.length > 0 && (
                <Link
                  to={`/itinerary/${adventure.id}`}
                  className="block pt-1 text-xs font-semibold text-accent hover:underline"
                >
                  View itinerary →
                </Link>
              )}
            </dl>
            <div className="mt-6 space-y-3">{submitButtonRow}</div>
          </aside>
        </form>

        {/* Mobile sticky confirm bar (page variant) */}
        {stickyVisible && !soldOut && (
          <div className="bar-enter lg:hidden fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-card/95 backdrop-blur supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                  {date ? fmtDate(date) : adventure.dates[0] ? fmtDate(adventure.dates[0]) : "Choose a date"} · {people} traveller{people > 1 ? "s" : ""}
                </p>
                <p className="font-display font-bold text-lg text-primary leading-tight truncate">
                  {price != null ? inr(price * people) : "Price on call"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
                disabled={submitting || soldOut}
                className="btn-accent shrink-0 min-h-[44px] px-5"
              >
                {submitting ? "Sending…" : price != null ? `Confirm — ${inr(price * people)}` : "Request booking"}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ------------------------- Panel (embedded) -------------------------- */
  return (
    <div
      id="book"
      className="lg:sticky lg:top-24 rounded-xl border border-primary/15 bg-card shadow-trail p-7 md:p-8 scroll-mt-28"
    >
      {heading}
      {soldOut ? (
        <div className="mt-5 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
          <p className="font-semibold text-destructive">This adventure is full</p>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            All seats for the upcoming dates are taken. Check back for new dates, or explore other
            adventures in the meantime.
          </p>
          <Link to="/adventures" className="btn-outline btn-sm mt-4">
            Explore other adventures
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate ref={formRef} className="mt-6 space-y-7">
          {sections}
          <div className="rounded-lg border border-border bg-background p-4 space-y-1.5 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Travellers</span>
              <span className="font-semibold">{people}</span>
            </p>
            {date && (
              <p className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-semibold">{fmtDate(date)}</span>
              </p>
            )}
            {price != null ? (
              <p className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="text-muted-foreground">Total</span>
                <span className="font-display font-bold text-lg text-primary">{inr(price * people)}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground pt-1">Price confirmed by our team.</p>
            )}
          </div>
          {submitButtonRow}
        </form>
      )}
    </div>
  );
}

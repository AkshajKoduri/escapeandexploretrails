import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Send } from "lucide-react";

const treks = [
  "Ahobilam Trek",
  "Bhongir Fort Sunrise",
  "Ananthagiri Night Camp",
  "Koilkonda Fort Trail",
  "Ethipothala Falls Hike",
  "Medak Fort Weekend",
];

const bookingSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name too long"),
  age: z.coerce.number().int("Age must be a whole number").min(10, "Min age is 10").max(99, "Enter a valid age"),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"], {
    errorMap: () => ({ message: "Please select a gender" }),
  }),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9\s-]{10,15}$/, "Enter a valid phone number"),
  email: z
    .string()
    .trim()
    .max(255, "Email too long")
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  trek: z.string().min(1, "Please select a trek"),
});

type FormState = {
  name: string;
  age: string;
  gender: string;
  phone: string;
  email: string;
  trek: string;
};

const initial: FormState = { name: "", age: "", gender: "", phone: "", email: "", trek: "" };

export default function Booking() {
  const [form, setForm] = useState<FormState>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = bookingSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    setSubmitted(true);
    toast.success("Booking request received! We'll call you shortly.");
  };

  const reset = () => {
    setForm(initial);
    setSubmitted(false);
  };

  return (
    <section id="booking" className="py-24 md:py-32 bg-secondary/5 relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-orange opacity-20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary/30 blur-3xl" />

      <div className="container relative">
        <div className="text-center max-w-2xl mx-auto reveal">
          <span className="font-script text-accent text-xl">— Reserve your spot</span>
          <h2 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 text-primary">
            Book Your Adventure
          </h2>
          <p className="mt-4 text-muted-foreground">
            Fill in your details and our team will reach out within 24 hours to confirm your slot and share trek essentials.
          </p>
        </div>

        <div className="mt-14 max-w-2xl mx-auto reveal">
          {submitted ? (
            <div className="bg-card rounded-2xl shadow-trail p-10 md:p-14 text-center border border-primary/10">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-orange flex items-center justify-center mb-6 shadow-glow">
                <CheckCircle2 className="w-10 h-10 text-accent-foreground" strokeWidth={2.5} />
              </div>
              <h3 className="font-heading font-bold text-2xl md:text-3xl text-primary">
                You're on the trail! 🥾
              </h3>
              <p className="mt-4 text-muted-foreground">
                Thanks <span className="font-semibold text-primary">{form.name.split(" ")[0]}</span> — we've received your booking for{" "}
                <span className="font-semibold text-accent">{form.trek}</span>. Our team will call you on{" "}
                <span className="font-semibold">{form.phone}</span> shortly.
              </p>
              <button
                onClick={reset}
                className="mt-8 px-7 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-secondary transition-colors"
              >
                Book Another Trek
              </button>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="bg-card rounded-2xl shadow-trail p-6 md:p-10 border border-primary/10 space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={form.name}
                  onChange={update("name")}
                  placeholder="e.g. Aarav Reddy"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-accent transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Age *</label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={99}
                    value={form.age}
                    onChange={update("age")}
                    placeholder="e.g. 24"
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-accent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Gender *</label>
                  <select
                    required
                    value={form.gender}
                    onChange={update("gender")}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-accent transition"
                  >
                    <option value="">Select...</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Phone Number *</label>
                <input
                  type="tel"
                  required
                  maxLength={15}
                  value={form.phone}
                  onChange={update("phone")}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-accent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Email <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  maxLength={255}
                  value={form.email}
                  onChange={update("email")}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-accent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Select Trek *</label>
                <select
                  required
                  value={form.trek}
                  onChange={update("trek")}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-accent transition"
                >
                  <option value="">Choose your adventure...</option>
                  {treks.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-orange text-accent-foreground font-semibold tracking-wide shadow-glow hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Send className="w-5 h-5" />
                {submitting ? "Sending..." : "Confirm Booking"}
              </button>

              <p className="text-xs text-center text-muted-foreground pt-2">
                By submitting, you agree to be contacted by E2 Trails regarding your booking.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

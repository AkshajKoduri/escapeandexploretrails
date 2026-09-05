import { useEffect, useState } from "react";
import { Mail, Instagram, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { fetchAdventures } from "@/lib/treks";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100, "Name too long"),
  email: z.string().trim().email("That email doesn't look right").max(255),
  phone: z.string().trim().regex(/^[+]?[0-9\s()-]{7,20}$/, "Enter a valid phone number"),
  trek: z.string().trim().max(100).optional().or(z.literal("")),
  message: z.string().trim().max(1000, "Message too long").optional().or(z.literal("")),
});

type Errors = Partial<Record<"name" | "email" | "phone" | "message", string>>;

export default function Contact() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [trekNames, setTrekNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchAdventures().then((all) => {
      if (cancelled) return;
      setTrekNames(Array.from(new Set(all.map((a) => a.name))).slice(0, 12));
    });
    return () => { cancelled = true; };
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const parsed = contactSchema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      trek: fd.get("trek"),
      message: fd.get("message"),
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSending(true);
    const { name, email, phone, trek, message } = parsed.data;
    const { error } = await supabase.from("callback_requests" as any).insert({
      full_name: name,
      email: email || null,
      mobile_number: phone,
      trip_name: trek || null,
      preferred_time: message ? `Message: ${message}` : null,
    });
    setSending(false);
    if (error) {
      toast.error("Could not send your enquiry. Please try again or email hello@e2trails.in");
      return;
    }
    form.reset();
    setSent(true);
  };

  if (sent) {
    return (
      <section id="contact" className="py-24 md:py-32 bg-muted/40">
        <div className="container max-w-xl text-center">
          <div className="inline-flex w-16 h-16 rounded-full bg-green-600/15 text-green-700 items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8" strokeWidth={2} />
          </div>
          <h2 className="editorial-title">Enquiry sent!</h2>
          <p className="editorial-lead mx-auto">
            Thanks for reaching out — our team will get back to you within 24 hours. If it's urgent,
            message us on WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="https://wa.me/916303682022" target="_blank" rel="noopener noreferrer" className="btn-accent">
              WhatsApp us now
            </a>
            <button type="button" onClick={() => setSent(false)} className="btn-outline">
              Send another enquiry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="py-24 md:py-32 bg-muted/40">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto">
          <p className="kicker justify-center">Get in touch</p>
          <h2 className="editorial-title mt-3">Plan your next escape</h2>
          <p className="editorial-lead mx-auto">
            Questions about a trail, a date, or a custom group trip? Send us a note and we'll get back
            to you.
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-5 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* Contact info panel */}
          <div className="lg:col-span-2 relative rounded-xl overflow-hidden bg-gradient-forest text-charcoal-foreground p-8 md:p-10 flex flex-col justify-between min-h-[420px] shadow-trail">
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              {[...Array(12)].map((_, i) => (
                <path
                  key={i}
                  d={`M0 ${50 + i * 28} Q 100 ${20 + i * 28}, 200 ${60 + i * 28} T 400 ${40 + i * 28}`}
                  stroke="currentColor"
                  strokeWidth="1"
                  fill="none"
                />
              ))}
            </svg>
            <div className="relative">
              <h3 className="font-display font-bold text-2xl md:text-3xl">Hyderabad HQ</h3>
              <p className="mt-2 font-script text-gold text-lg">Where every story begins.</p>
            </div>

            <div className="relative space-y-4 text-sm md:text-base">
              <a href="mailto:hello@e2trails.in" className="flex items-center gap-3 hover:text-accent transition-colors">
                <Mail className="w-5 h-5 text-accent" aria-hidden="true" /> hello@e2trails.in
              </a>
              <a href="https://instagram.com/e2trails.in" target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-accent transition-colors">
                <Instagram className="w-5 h-5 text-accent" aria-hidden="true" /> @e2trails.in
              </a>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-accent" aria-hidden="true" /> Hyderabad, Telangana, India
              </div>
              <a href="tel:+916303682022" className="flex items-center gap-3 hover:text-accent transition-colors">
                <span className="w-5 text-accent font-bold text-center" aria-hidden="true">☎</span> +91 63036 82022
              </a>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} noValidate className="lg:col-span-3 bg-background rounded-xl p-7 md:p-10 shadow-card border border-border space-y-5">
            <div>
              <label htmlFor="contact-name" className="field-label">Full Name</label>
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                maxLength={100}
                className="field-input"
                placeholder="Aarav Reddy"
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="contact-email" className="field-label">Email</label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  maxLength={255}
                  className="field-input"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                />
                {errors.email && <p className="field-error" role="alert">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="contact-phone" className="field-label">Phone</label>
                <input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  required
                  maxLength={20}
                  className="field-input"
                  placeholder="+91 98765 43210"
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && <p className="field-error" role="alert">{errors.phone}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="contact-trek" className="field-label">Interested Adventure</label>
              <select id="contact-trek" name="trek" className="field-input">
                <option value="">Not sure yet — suggest something</option>
                {trekNames.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="contact-message" className="field-label">Message / Special Requirements</label>
              <textarea
                id="contact-message"
                name="message"
                rows={4}
                maxLength={1000}
                className="field-input resize-none"
                placeholder="Tell us about your group, dates, or anything we should know"
                aria-invalid={!!errors.message}
              />
              {errors.message && <p className="field-error" role="alert">{errors.message}</p>}
            </div>

            <button type="submit" disabled={sending} className="btn-primary w-full disabled:opacity-60">
              {sending ? "Sending..." : "Send enquiry"}
            </button>
            <p className="text-xs text-muted-foreground text-center">
              We usually reply within 24 hours. Prefer to talk? Call +91 63036 82022.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
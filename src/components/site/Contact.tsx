import { useState } from "react";
import { Mail, Instagram, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const [sending, setSending] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      (e.target as HTMLFormElement).reset();
      toast.success("Enquiry sent! We'll reach out within 24 hours.");
    }, 800);
  };

  return (
    <section id="contact" className="py-24 md:py-32 bg-muted/40">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto reveal">
          <span className="font-script text-accent text-xl">— Get in touch</span>
          <h2 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 text-primary">
            Ready to Hit the Trail?
          </h2>
        </div>

        <div className="mt-14 grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* Topographic illustration panel */}
          <div className="reveal-left relative rounded-2xl overflow-hidden bg-gradient-forest text-charcoal-foreground p-10 min-h-[480px] flex flex-col justify-between shadow-trail">
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              {[...Array(12)].map((_, i) => (
                <path
                  key={i}
                  d={`M0 ${50 + i * 28} Q 100 ${20 + i * 28}, 200 ${60 + i * 28} T 400 ${40 + i * 28}`}
                  stroke="currentColor"
                  strokeWidth="1"
                  fill="none"
                  className="text-charcoal-foreground"
                />
              ))}
            </svg>
            <div className="relative">
              <h3 className="font-heading font-bold text-2xl md:text-3xl">Hyderabad HQ</h3>
              <p className="mt-2 font-script text-gold text-lg">Where every story begins.</p>
            </div>

            <div className="relative space-y-4 text-sm md:text-base">
              <a href="mailto:hello@e2trails.in" className="flex items-center gap-3 hover:text-accent transition-colors">
                <Mail className="w-5 h-5 text-accent" /> hello@e2trails.in
              </a>
              <a href="https://instagram.com/e2trails.in" target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-accent transition-colors">
                <Instagram className="w-5 h-5 text-accent" /> @e2trails.in
              </a>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-accent" /> Hyderabad, Telangana, India
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="reveal-right bg-background rounded-2xl p-8 md:p-10 shadow-card border border-border space-y-5">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Full Name</label>
              <input required name="name" type="text" className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Email</label>
                <input required name="email" type="email" className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Phone</label>
                <input required name="phone" type="tel" className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Interested Trek</label>
              <select name="trek" className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent">
                <option>Ahobilam Trek</option>
                <option>Bhongir Fort Sunrise</option>
                <option>Ananthagiri Night Camp</option>
                <option>Koilkonda Fort Trail</option>
                <option>Ethipothala Falls Hike</option>
                <option>Medak Fort Weekend</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Message / Special Requirements</label>
              <textarea name="message" rows={4} className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full py-4 rounded-full bg-gradient-orange text-accent-foreground font-semibold tracking-wide shadow-glow hover:scale-[1.02] transition-transform disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send Enquiry"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

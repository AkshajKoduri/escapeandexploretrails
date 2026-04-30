import { Shield, Map, Users } from "lucide-react";

const reasons = [
  { icon: Shield, emoji: "🛡️", title: "Safety is Non-Negotiable", desc: "All treks are led by certified and experienced guides with first-aid kits and emergency protocols in place." },
  { icon: Map, emoji: "🗺️", title: "We Know South India's Trails", desc: "From the Nallamala forests to the Deccan Plateau's forts, our routes are handpicked for the best experience." },
  { icon: Users, emoji: "🤝", title: "You're Not a Customer — You're Community", desc: "Every trek is a small group experience designed to build real friendships and lasting memories." },
];

export default function WhyUs() {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container max-w-5xl">
        <div className="text-center max-w-2xl mx-auto mb-16 reveal">
          <span className="font-script text-accent text-xl">— Why us</span>
          <h2 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 text-primary">
            The E2 Trails Difference
          </h2>
        </div>

        <div className="space-y-10 md:space-y-16">
          {reasons.map((r, i) => {
            const Icon = r.icon;
            const left = i % 2 === 0;
            return (
              <div
                key={r.title}
                className={`flex flex-col md:flex-row items-center gap-8 md:gap-12 ${left ? "" : "md:flex-row-reverse"} ${left ? "reveal-left" : "reveal-right"}`}
              >
                <div className="flex-shrink-0 w-28 h-28 rounded-2xl bg-gradient-forest text-charcoal-foreground flex items-center justify-center shadow-trail relative">
                  <Icon className="w-12 h-12" strokeWidth={1.5} />
                  <span className="absolute -top-2 -right-2 text-3xl">{r.emoji}</span>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-heading font-bold text-2xl md:text-3xl text-primary">{r.title}</h3>
                  <p className="mt-3 text-muted-foreground text-base md:text-lg leading-relaxed">{r.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

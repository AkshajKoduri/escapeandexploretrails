import about from "@/assets/about.jpg";
import founderAshok from "@/assets/founder-ashok.png";

export default function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-background">
      <div className="container grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className="reveal-left relative">
          <div className="absolute -inset-4 bg-gradient-orange rounded-2xl opacity-20 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl shadow-trail">
            <img
              src={about}
              alt="Trekkers laughing on a forest trail"
              loading="lazy"
              width={1280}
              height={1280}
              className="w-full h-[500px] object-cover hover:scale-105 transition-transform duration-700"
              style={{ filter: "saturate(1.05) contrast(1.05)" }}
            />
          </div>
          <div className="absolute -bottom-6 -right-6 bg-accent text-accent-foreground px-6 py-4 rounded-xl font-heading font-bold shadow-card hidden md:block">
            Since Day One
          </div>
        </div>

        <div className="reveal-right">
          <span className="font-script text-accent text-xl">— Our story</span>
          <h2 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 leading-tight text-primary">
            From One Climb to a Community
          </h2>
          <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
            E2 Trails was born on a trail — not in a boardroom. On one of our first climbs, legs burning and lungs struggling, it wasn't the view that kept us going. It was the people beside us — strangers who cheered, encouraged and refused to let us quit. That moment made one thing clear: the right community can make you capable of things you never imagined.
          </p>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            So we built one. E2 Trails started in Hyderabad as a weekend escape for people who wanted more than a desk and a screen. Two years and hundreds of adventurers later, it has grown into something far bigger — a tribe of cyclists, hikers and explorers who show up every weekend not just for the trail, but for each other. Whether you're stepping onto your first trail or chasing your next summit — you belong here.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {["✅ Safety First", "🌱 Eco-Conscious", "🤝 Community Driven"].map((p) => (
              <span key={p} className="px-5 py-2.5 rounded-full bg-primary/10 text-primary font-semibold text-sm border border-primary/20">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="container mt-20 md:mt-28">
        <div className="reveal max-w-5xl mx-auto bg-card border border-border rounded-2xl shadow-card p-6 md:p-10 grid md:grid-cols-[auto,1fr] gap-8 md:gap-10 items-center">
          <div className="relative mx-auto md:mx-0">
            <div className="absolute -inset-3 bg-gradient-orange rounded-full opacity-25 blur-2xl" />
            <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden ring-4 ring-accent/30 shadow-trail">
              <img
                src={founderAshok}
                alt="Ashok, founder and lead trek guide of E2 Trails"
                loading="lazy"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>

          <div>
            <span className="font-script text-accent text-xl">— Meet our founder</span>
            <h3 className="font-heading font-extrabold text-2xl md:text-4xl mt-2 leading-tight text-primary">
              Ashok — Founder & Lead Trek Guide
            </h3>
            <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
              Ashok is the heart and soul of E2 Trails. An experienced trek leader, he has guided countless safe and secure expeditions across Telangana and Andhra Pradesh — earning the trust of trekkers from all walks of life.
            </p>
            <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
              He once built a successful career in the software industry, but his unwavering love for the outdoors pulled him toward the trails. Choosing passion over a desk job, Ashok resigned to dedicate himself fully to trekking and to mentoring young adventurers — sharing not just routes, but a way of life rooted in nature, safety, and camaraderie.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {["🧭 Lead Guide", "🛡️ Safety Certified", "💚 Mentor to Young Trekkers"].map((p) => (
                <span key={p} className="px-5 py-2.5 rounded-full bg-accent text-accent-foreground font-semibold text-sm border border-accent">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

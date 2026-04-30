import about from "@/assets/about.jpg";

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
            Taking the First Step Toward Bigger Adventures
          </h2>
          <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
            E2 Trails was born out of a love for the hills of Telangana and the desire to make outdoor adventure accessible to everyone in Hyderabad. From misty morning treks through Ananthagiri Hills to spiritual journeys up to Ahobilam, we curate safe, organized, and unforgettable trail experiences.
          </p>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            Whether you're picking up your first trekking pole or looking for your next summit challenge — you belong here.
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
    </section>
  );
}

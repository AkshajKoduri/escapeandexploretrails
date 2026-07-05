const experiences = [
  { icon: "🏕️", title: "Night Camping", desc: "Sleep under the stars with bonfire setups in India's forests." },
  { icon: "⛰️", title: "Summit Hikes", desc: "Conquer fort hills and rocky ridges across Deccan terrain." },
  { icon: "🌊", title: "Waterfall Trails", desc: "Trek through dense forests to hidden cascades." },
  { icon: "🚴", title: "City Cycling Rides", desc: "Explore Hyderabad's streets, heritage sites and hidden corners on two wheels — every weekend." },
  { icon: "🧗", title: "Rock Climbing & Rappelling", desc: "Face vertical challenges with trained guides." },
  { icon: "🌄", title: "Sunrise Treks", desc: "Pre-dawn starts to catch golden light from the summit." },
  { icon: "🌿", title: "Heritage Fort Treks", desc: "History meets adventure at ancient Telangana fortresses." },
];

export default function Experiences() {
  return (
    <section className="py-24 md:py-32 bg-muted/40">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto reveal">
          <span className="font-script text-accent text-xl">— What we do</span>
          <h2 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 text-primary">
            More Than Just a Trek
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {experiences.map((e, i) => (
            <div
              key={e.title}
              className="reveal group bg-background rounded-2xl p-8 border border-border shadow-card hover:shadow-trail hover:-translate-y-1 transition-all duration-500"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-orange flex items-center justify-center text-3xl shadow-glow group-hover:scale-110 transition-transform">
                {e.icon}
              </div>
              <h3 className="font-heading font-bold text-xl mt-5 text-primary">{e.title}</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">{e.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

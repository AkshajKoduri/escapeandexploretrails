const items = [
  "🏕️ Night Camping",
  "⛰️ Summit Treks",
  "🌊 Waterfall Hikes",
  "🧗 Rock Climbing",
  "🌄 Sunrise Treks",
  "🔥 Bonfire Nights",
  "🌿 Forest Trails",
];

export default function Marquee() {
  const loop = [...items, ...items];
  return (
    <div className="bg-gradient-orange py-4 overflow-hidden border-y-2 border-accent/30">
      <div className="marquee-track">
        {loop.map((t, i) => (
          <div key={i} className="flex items-center px-8 text-accent-foreground font-heading font-bold uppercase tracking-widest text-sm md:text-base whitespace-nowrap">
            <span>{t}</span>
            <span className="mx-8 opacity-60">•</span>
          </div>
        ))}
      </div>
    </div>
  );
}

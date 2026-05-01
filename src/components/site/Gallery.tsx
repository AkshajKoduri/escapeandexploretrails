import { Instagram, ZoomIn } from "lucide-react";
import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";
import g5 from "@/assets/gallery-5.jpg";
import g6 from "@/assets/gallery-6.jpg";
import g7 from "@/assets/gallery-7.jpg";

const images = [
  { src: g1, span: "row-span-2", alt: "Group inside waterfall cave" },
  { src: g2, span: "", alt: "Trek briefing at the trailhead" },
  { src: g3, span: "", alt: "Group at ancient rock paintings" },
  { src: g4, span: "row-span-2", alt: "Trekker in a rock crevice" },
  { src: g5, span: "", alt: "Misty cliff edge views" },
  { src: g6, span: "", alt: "Group on the fort ramparts" },
  { src: g7, span: "col-span-2", alt: "Holi celebration with the E2 Trails crew" },
];

export default function Gallery() {
  return (
    <section id="gallery" className="py-24 md:py-32 bg-background">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto reveal">
          <span className="font-script text-accent text-xl">— Memories</span>
          <h2 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 text-primary">
            Moments on the Trail
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 auto-rows-[180px] md:auto-rows-[220px] gap-3 md:gap-4">
          {images.map((img, i) => (
            <div
              key={i}
              className={`reveal relative overflow-hidden rounded-xl group cursor-pointer ${img.span}`}
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/50 transition-colors duration-500 flex items-center justify-center">
                <ZoomIn className="w-8 h-8 text-charcoal-foreground opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center reveal">
          <a
            href="https://instagram.com/e2trails.in"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 px-7 py-3 rounded-full bg-gradient-orange text-accent-foreground font-semibold hover:scale-105 transition-transform shadow-glow"
          >
            <Instagram className="w-5 h-5" />
            Follow Us @e2trails.in
          </a>
        </div>
      </div>
    </section>
  );
}

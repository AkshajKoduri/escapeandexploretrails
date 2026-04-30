import { useEffect, useRef, useState } from "react";
import { Quote, Star } from "lucide-react";

const reviews = [
  { text: "The Ahobilam trek with E2 Trails was spiritual and adventurous at the same time. The guides were incredibly knowledgeable and kept us safe throughout.", name: "Priya M.", trek: "Ahobilam Trek", initials: "PM" },
  { text: "First-time trekker here! E2 Trails made me feel so comfortable. The Bhongir Fort sunrise was absolutely breathtaking.", name: "Rahul K.", trek: "Bhongir Sunrise Trek", initials: "RK" },
  { text: "Amazing community, perfectly organized, and zero stress. Will book every weekend with them!", name: "Sneha R.", trek: "Ananthagiri Night Camp", initials: "SR" },
  { text: "Loved the small group vibe. Made new friends and saw waterfalls I never knew existed near Hyderabad.", name: "Arjun T.", trek: "Ethipothala Falls Hike", initials: "AT" },
  { text: "Professional, friendly, and the photography was a bonus! Easily my best weekend in months.", name: "Divya S.", trek: "Medak Fort Weekend", initials: "DS" },
];

export default function Testimonials() {
  const [idx, setIdx] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (!paused.current) setIdx((i) => (i + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      id="testimonials"
      className="py-24 md:py-32 bg-primary text-primary-foreground relative overflow-hidden"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div className="absolute inset-0 opacity-10 [background:radial-gradient(circle_at_70%_30%,hsl(var(--accent)),transparent_55%)]" />
      <div className="container relative">
        <div className="text-center max-w-2xl mx-auto reveal">
          <span className="font-script text-gold text-xl">— Reviews</span>
          <h2 className="font-heading font-extrabold text-3xl md:text-5xl mt-2">
            What Our Trekkers Say
          </h2>
        </div>

        <div className="mt-14 max-w-3xl mx-auto reveal">
          <div className="bg-charcoal/30 backdrop-blur-sm border border-charcoal-foreground/10 rounded-2xl p-8 md:p-12 relative">
            <Quote className="w-14 h-14 text-accent absolute -top-6 left-8" fill="currentColor" />
            <div className="min-h-[180px] flex flex-col justify-between">
              <p className="text-lg md:text-2xl font-script leading-relaxed">
                "{reviews[idx].text}"
              </p>
              <div className="mt-8 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-orange flex items-center justify-center font-heading font-bold text-accent-foreground">
                  {reviews[idx].initials}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg">{reviews[idx].name}</div>
                  <div className="text-sm text-charcoal-foreground/70">{reviews[idx].trek}</div>
                </div>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-gold" fill="currentColor" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-2">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Go to review ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === idx ? "w-10 bg-accent" : "w-2 bg-charcoal-foreground/30"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

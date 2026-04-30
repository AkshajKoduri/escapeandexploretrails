import { Footprints, MapPin, Mountain, Star } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

function Stat({ icon: Icon, end, suffix = "+", label, decimals = false }: { icon: any; end: number; suffix?: string; label: string; decimals?: boolean }) {
  const { ref, value } = useCountUp(end, 1800);
  const display = decimals ? (value / 10).toFixed(1) : value.toString();
  return (
    <div className="text-center reveal">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/15 text-accent mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <div className="font-heading font-black text-5xl md:text-6xl text-accent leading-none">
        <span ref={ref}>{display}</span>
        <span>{suffix}</span>
      </div>
      <p className="mt-3 text-charcoal-foreground/80 uppercase tracking-widest text-xs md:text-sm font-semibold">{label}</p>
    </div>
  );
}

export default function Stats() {
  return (
    <section className="bg-charcoal text-charcoal-foreground py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] [background:radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
      <div className="container relative grid grid-cols-2 lg:grid-cols-4 gap-10">
        <Stat icon={Footprints} end={500} label="Trekkers Guided" />
        <Stat icon={MapPin} end={30} label="Destinations Explored" />
        <Stat icon={Mountain} end={100} label="Treks Organized" />
        <Stat icon={Star} end={49} suffix="★" label="Average Rating" decimals />
      </div>
    </section>
  );
}

import { useEffect, useRef } from "react";

export default function CursorDot() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const el = ref.current;
    if (!el) return;
    let x = 0, y = 0, tx = 0, ty = 0;
    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    window.addEventListener("mousemove", onMove);
    let raf = 0;
    const tick = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      el.style.transform = `translate3d(${x - 10}px, ${y - 10}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="hidden md:block fixed top-0 left-0 w-5 h-5 rounded-full pointer-events-none z-[100] mix-blend-screen"
      style={{
        background: "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)",
        boxShadow: "0 0 20px hsl(var(--accent) / 0.6)",
      }}
    />
  );
}

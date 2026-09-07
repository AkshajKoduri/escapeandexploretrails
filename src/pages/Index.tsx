import { lazy, Suspense } from "react";
import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import Stats from "@/components/site/Stats";
import FeaturedAdventure from "@/components/site/FeaturedAdventure";
import { useReveal } from "@/hooks/useReveal";
import { useSeo } from "@/hooks/useSeo";

const HomeBelowFold = lazy(() => import("@/components/site/HomeBelowFold"));

const Index = () => {
  useReveal();
  useSeo({
    title: "E2 Trails — Guided Treks & Adventures from Hyderabad",
    description:
      "Join E2 Trails for safe, organized weekend treks, night camps & summit hikes across India. Built for every adventurer.",
    path: "/",
  });

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      {/* 1. Brand promise */}
      <Hero />
      {/* 2. The real product — next departure with date, price, availability. */}
      <FeaturedAdventure />
      {/* 3. Proof the business can stand behind (no invented numbers). */}
      <Stats />
      {/* Below-the-fold editorial sections load in their own chunk without
          delaying the hero or the next-departure content. */}
      <Suspense fallback={null}>
        <HomeBelowFold />
      </Suspense>
    </main>
  );
};

export default Index;

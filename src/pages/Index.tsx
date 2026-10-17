import { lazy, Suspense } from "react";
import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import FeaturedAdventure from "@/components/site/FeaturedAdventure";
import { useReveal } from "@/hooks/useReveal";
import { useSeo } from "@/hooks/useSeo";

const HomeBelowFold = lazy(() => import("@/components/site/HomeBelowFold"));

const Index = () => {
  useReveal();
  useSeo({
    title: "Treks & Adventure Trips from Hyderabad | E2 Trails",
    description:
      "Discover guided treks, local hikes, cycling experiences and weekend adventure trips from Hyderabad with E2 Trails.",
    path: "/",
  });

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      {/* 1. Brand promise */}
      <Hero />
      {/* 2. The real product — next departure with date, price, availability. */}
      <FeaturedAdventure />
      {/* Below-the-fold editorial sections load in their own chunk without
          delaying the hero or the next-departure content. */}
      <Suspense fallback={null}>
        <HomeBelowFold />
      </Suspense>
    </main>
  );
};

export default Index;

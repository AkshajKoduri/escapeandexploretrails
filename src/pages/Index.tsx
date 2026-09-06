import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import Stats from "@/components/site/Stats";
import Treks from "@/components/site/Treks";
import DiscoverSection from "@/components/site/DiscoverSection";
import FeaturedAdventure from "@/components/site/FeaturedAdventure";
import WhyUs from "@/components/site/WhyUs";
import Safety from "@/components/site/Safety";
import TrailLogPreview from "@/components/site/TrailLogPreview";
import Gallery from "@/components/site/Gallery";
import About from "@/components/site/About";
import FinalCTA from "@/components/site/FinalCTA";
import Contact from "@/components/site/Contact";
import Footer from "@/components/site/Footer";
import { useReveal } from "@/hooks/useReveal";
import { useSeo } from "@/hooks/useSeo";

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
      {/* 4. The people — founder story early builds trust for a trust purchase. */}
      <About />
      {/* 5. Why E2 Trails, concretely. */}
      <WhyUs />
      {/* 6. Browse by interest (drives the catalog when more trips exist). */}
      <DiscoverSection />
      {/* 7. Catalog grid — hidden on home until 2+ adventures exist to avoid
             duplicating the featured departure. */}
      <Treks mode="all" preview />
      {/* 8. The safety promise — shown after desire, before the ask. */}
      <Safety />
      {/* 9. Real memories (hidden entirely when the journal is empty). */}
      <Gallery />
      <TrailLogPreview />
      {/* 10. The specific ask. */}
      <FinalCTA />
      <Contact />
      <Footer />
    </main>
  );
};

export default Index;
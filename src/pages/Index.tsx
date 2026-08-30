import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import About from "@/components/site/About";
import Stats from "@/components/site/Stats";
import Treks from "@/components/site/Treks";
import Gallery from "@/components/site/Gallery";
import TrailLogPreview from "@/components/site/TrailLogPreview";

import WhyUs from "@/components/site/WhyUs";
import Contact from "@/components/site/Contact";
import Footer from "@/components/site/Footer";
import CursorDot from "@/components/site/CursorDot";
import { useReveal } from "@/hooks/useReveal";
import { useSeo } from "@/hooks/useSeo";

const Index = () => {
  useReveal();

  useSeo({
    title: "E2 Trails — Guided Treks & Adventures from Hyderabad",
    description: "Join E2 Trails for safe, organized weekend treks, night camps & summit hikes across India. Built for every adventurer.",
    path: "/",
  });

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <CursorDot />
      <Navbar />
      <Hero />
      <About />
      <Stats />
      <Treks mode="outstation" preview />
      <Treks mode="hyderabad" preview />
      <TrailLogPreview />
      <Gallery />
      <WhyUs />
      <Contact />
      <Footer />
    </main>
  );
};

export default Index;

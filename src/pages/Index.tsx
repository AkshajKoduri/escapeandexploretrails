import { useEffect } from "react";
import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import About from "@/components/site/About";
import Stats from "@/components/site/Stats";
import Treks from "@/components/site/Treks";
import Experiences from "@/components/site/Experiences";
import Community from "@/components/site/Community";
import Gallery from "@/components/site/Gallery";
import TrailLogPreview from "@/components/site/TrailLogPreview";

import WhyUs from "@/components/site/WhyUs";
import Contact from "@/components/site/Contact";
import Footer from "@/components/site/Footer";
import CursorDot from "@/components/site/CursorDot";
import { useReveal } from "@/hooks/useReveal";

const Index = () => {
  useReveal();

  useEffect(() => {
    document.title = "E2 Trails — Guided Treks & Adventures from Hyderabad";
    const desc = "Join E2 Trails for safe, organized weekend treks, night camps & summit hikes across India. Built for every adventurer.";
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
    m.setAttribute("content", desc);

    let canon = document.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement("link"); canon.setAttribute("rel", "canonical"); document.head.appendChild(canon); }
    canon.setAttribute("href", window.location.origin + "/");
  }, []);

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
      <Experiences />
      <Community />
      <Gallery />
      
      <WhyUs />
      <Contact />
      <Footer />
    </main>
  );
};

export default Index;

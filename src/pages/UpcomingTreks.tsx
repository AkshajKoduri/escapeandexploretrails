import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import Treks from "@/components/site/Treks";
import BackButton from "@/components/site/BackButton";
import { useReveal } from "@/hooks/useReveal";
import { useSeo } from "@/hooks/useSeo";

export default function UpcomingTreksPage() {
  useReveal();
  useSeo({
    title: "Upcoming Treks — Monsoon, Himalayan & Winter Treks | E2 Trails",
    description: "Browse upcoming outstation treks with E2 Trails — monsoon and waterfall treks, Himalayan expeditions and winter trails, with dates, itineraries and pricing.",
    path: "/upcoming-treks",
  });
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <BackButton to="/" label="Back to Home" />
      <div className="pt-6">
        <Treks mode="outstation" asH1 />
      </div>
      <Footer />
    </main>
  );
}


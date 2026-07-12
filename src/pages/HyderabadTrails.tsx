import { useEffect } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import Treks from "@/components/site/Treks";
import BackButton from "@/components/site/BackButton";
import { useReveal } from "@/hooks/useReveal";

export default function HyderabadTrailsPage() {
  useReveal();
  useEffect(() => {
    document.title = "Hyderabad Trails — E2 Trails";
  }, []);
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <BackButton to="/" label="Back to Home" />
      <div className="pt-6">
        <Treks mode="hyderabad" />
      </div>
      <Footer />
    </main>
  );
}


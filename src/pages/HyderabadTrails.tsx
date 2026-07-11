import { useEffect } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import Treks from "@/components/site/Treks";
import { useReveal } from "@/hooks/useReveal";

export default function HyderabadTrailsPage() {
  useReveal();
  useEffect(() => {
    document.title = "Hyderabad Trails — E2 Trails";
  }, []);
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24">
        <Treks mode="hyderabad" />
      </div>
      <Footer />
    </main>
  );
}

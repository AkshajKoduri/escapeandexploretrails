import { useEffect } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import Treks from "@/components/site/Treks";
import BackButton from "@/components/site/BackButton";
import { useReveal } from "@/hooks/useReveal";

export default function UpcomingTreksPage() {
  useReveal();
  useEffect(() => {
    document.title = "Upcoming Treks — E2 Trails";
  }, []);
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <BackButton to="/" label="Back to Home" />
      <div className="pt-6">
        <Treks mode="outstation" />
      </div>
      <Footer />
    </main>
  );
}


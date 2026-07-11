import { useEffect } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import Treks from "@/components/site/Treks";
import { useReveal } from "@/hooks/useReveal";

export default function UpcomingTreksPage() {
  useReveal();
  useEffect(() => {
    document.title = "Upcoming Treks — E2 Trails";
  }, []);
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24">
        <Treks mode="outstation" />
      </div>
      <Footer />
    </main>
  );
}

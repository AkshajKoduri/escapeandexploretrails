import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import Treks from "@/components/site/Treks";
import BackButton from "@/components/site/BackButton";
import { useReveal } from "@/hooks/useReveal";
import { useSeo } from "@/hooks/useSeo";

export default function HyderabadTrailsPage() {
  useReveal();
  useSeo({
    title: "Hyderabad Trails — Weekend Hikes, Cycling & Bike Rides | E2 Trails",
    description: "Join weekend hikes, cycling rides and bike rides around Hyderabad with E2 Trails. See upcoming dates, meeting points and details for every trail.",
    path: "/hyderabad-trails",
  });
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


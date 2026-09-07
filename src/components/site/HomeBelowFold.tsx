import About from "@/components/site/About";
import Contact from "@/components/site/Contact";
import DiscoverSection from "@/components/site/DiscoverSection";
import FinalCTA from "@/components/site/FinalCTA";
import Footer from "@/components/site/Footer";
import Gallery from "@/components/site/Gallery";
import Safety from "@/components/site/Safety";
import TrailLogPreview from "@/components/site/TrailLogPreview";
import Treks from "@/components/site/Treks";
import WhyUs from "@/components/site/WhyUs";

export default function HomeBelowFold() {
  return (
    <>
      <About />
      <WhyUs />
      <DiscoverSection />
      <Treks mode="all" preview />
      <Safety />
      <Gallery />
      <TrailLogPreview />
      <FinalCTA />
      <Contact />
      <Footer />
    </>
  );
}

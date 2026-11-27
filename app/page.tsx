
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import AwardsSection from "@/components/home/AwardsSection";
import FamilySection from "@/components/home/FamilySection";
import LegacySection from "@/components/home/LegacySection";

export default function Home() {
  return (
      <div className="gala-room">
        <Navbar />

        <main>
          <Hero />
          <AwardsSection />
          <FamilySection />
          <LegacySection />
        </main>

        <Footer />
      </div>
  );
}

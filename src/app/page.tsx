import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { MeetTheTeam } from "@/components/landing/MeetTheTeam";
import { Features } from "@/components/landing/Features";
import { TrustSection } from "@/components/landing/TrustSection";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <section id="team">
        <MeetTheTeam />
      </section>
      <section id="safety">
        <TrustSection />
      </section>
      <CTA />
      <Footer />
    </main>
  );
}

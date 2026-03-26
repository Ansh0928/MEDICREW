import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { MeetTheTeam } from "@/components/landing/MeetTheTeam";
import { Features } from "@/components/landing/Features";
import { TrustSection } from "@/components/landing/TrustSection";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import ScrollMorphHero from "@/components/ui/scroll-morph-hero";

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: "#060614" }}>
      <Header />
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />

      {/* Scroll morph — "The future built with AI" */}
      <section className="border-t border-white/[0.04]" style={{ height: "600px" }}>
        <ScrollMorphHero />
      </section>

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

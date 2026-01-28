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
    <main className="min-h-screen">
      <Header />
      <div className="pt-16">
        <Hero />
        <Problem />
        <section id="how-it-works">
          <HowItWorks />
        </section>
        <section id="team">
          <MeetTheTeam />
        </section>
        <Features />
        <section id="safety">
          <TrustSection />
        </section>
        <CTA />
        <Footer />
      </div>
    </main>
  );
}

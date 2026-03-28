import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { MeetTheTeam } from "@/components/landing/MeetTheTeam";
import { Features } from "@/components/landing/Features";
import { TrustSection } from "@/components/landing/TrustSection";
import { ProofSection } from "@/components/landing/ProofSection";
import { CTA } from "@/components/landing/CTA";
import { FAQSection } from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  isLandingVariant,
  LANDING_VARIANT_COOKIE,
  resolveLandingVariant,
} from "@/lib/marketing/landing-variants";

export const metadata: Metadata = {
  title: "AI Health Navigation for Australia",
  description:
    "Get AI specialist guidance, emergency-first escalation, and clear care next steps tailored for Australian pathways.",
};

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawQueryVariant = Array.isArray(params?.lpv) ? params?.lpv[0] : params?.lpv;
  const cookieStore = await cookies();
  const landingVariantFromCookie = resolveLandingVariant(cookieStore.get(LANDING_VARIANT_COOKIE)?.value);
  const landingVariant = isLandingVariant(rawQueryVariant)
    ? rawQueryVariant
    : landingVariantFromCookie;

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <Hero variant={landingVariant} />
      <Problem />
      <HowItWorks />
      <Features />
      <section id="team">
        <MeetTheTeam />
      </section>
      <TrustSection />
      <ProofSection />
      <CTA variant={landingVariant} />
      <FAQSection />
      <Footer />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing | MediCrew",
  description: "MediCrew pricing — free for patients, Pro for power users, Partner for clinics.",
};

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "/ month",
    tagline: "For patients getting started",
    cta: { label: "Start free", href: "/consult" },
    ctaVariant: "outline" as const,
    features: [
      "3 AI consultations per month",
      "Consultation summary PDF",
      "Emergency-first escalation",
      "Symptom journal (30 days)",
      "AU data residency",
    ],
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/ month",
    tagline: "For patients with ongoing care needs",
    cta: { label: "Join Pro waitlist", href: "/consult" },
    ctaVariant: "primary" as const,
    features: [
      "Unlimited AI consultations",
      "GP referral letter generation",
      "Priority swarm processing",
      "Full symptom journal history",
      "Care plan continuity across sessions",
      "Shareable consultation PDFs",
    ],
    highlight: true,
    badge: "Most popular",
  },
  {
    name: "Partner",
    price: "Custom",
    period: "",
    tagline: "For clinics and allied health providers",
    cta: { label: "Contact partner team", href: "/partners" },
    ctaVariant: "outline" as const,
    features: [
      "Multi-patient dashboard",
      "Doctor portal access",
      "Swarm output analytics",
      "Branded patient-facing portal",
      "Dedicated onboarding support",
      "AHPRA audit trail export",
    ],
    highlight: false,
  },
];

const faqs = [
  {
    q: "Is patient data stored in Australia?",
    a: "Yes. All data is stored in Sydney (ap-southeast-2 region). We comply with the Privacy Act 1988 and APP 8.",
  },
  {
    q: "Is MediCrew a replacement for a GP?",
    a: "No. MediCrew navigates — your GP diagnoses. All outputs carry AHPRA-required disclaimers. In emergencies, we direct you to call 000 first.",
  },
  {
    q: "When is Pro available?",
    a: "We're in beta. Pro tiers are coming in Q3 2026. Join the waitlist by signing up for free.",
  },
  {
    q: "Can a clinic trial the platform?",
    a: "Yes. Our Partner Pilot Program includes onboarding support and a controlled rollout. Contact us via the partners page.",
  },
];

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-6 pt-32 pb-12 text-center">
          <p className="font-mono text-xs tracking-widest uppercase text-slate-500 mb-4">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-tight">
            Care navigation that scales with you
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Free to start. Pro when you need more. Partner when your clinic is ready.
          </p>
        </section>

        {/* Tiers */}
        <section className="mx-auto max-w-5xl px-6 pb-20">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border p-7 flex flex-col relative ${
                  tier.highlight
                    ? "border-sky-500 shadow-lg shadow-sky-100 bg-sky-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {tier.badge}
                  </span>
                )}
                <div className="mb-6">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-1">
                    {tier.name}
                  </h2>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-900">{tier.price}</span>
                    {tier.period && (
                      <span className="text-slate-500 text-sm">{tier.period}</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-slate-500">{tier.tagline}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.highlight ? "text-sky-600" : "text-green-600"}`} />
                      <span className="text-sm text-slate-700">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.cta.href}
                  className={`w-full text-center rounded-full py-2.5 text-sm font-medium transition-colors ${
                    tier.ctaVariant === "primary"
                      ? "bg-sky-600 text-white hover:bg-sky-700"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tier.cta.label}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            All tiers include emergency-first escalation, AHPRA-compliant AI agent naming, and AU data residency.
          </p>
        </section>

        {/* FAQ */}
        <section className="bg-slate-50 py-16 px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-semibold text-slate-900 mb-8">Common questions</h2>
            <div className="space-y-6">
              {faqs.map((faq) => (
                <div key={faq.q}>
                  <p className="font-medium text-slate-900 mb-1">{faq.q}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

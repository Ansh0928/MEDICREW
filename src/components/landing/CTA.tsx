"use client";

import Link from "next/link";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { LandingVariant } from "@/lib/marketing/landing-variants";
import { LandingSectionViewTracker } from "@/components/landing/LandingSectionViewTracker";

const ctaCopyByVariant: Record<
  LandingVariant,
  { title: string; accent: string; body: string }
> = {
  speed: {
    title: "Get triage clarity",
    accent: "fast",
    body: "Start free. Sign in to save your consultation, care plan, and follow-up reminders in one place.",
  },
  specialist: {
    title: "Get clear next steps",
    accent: "before you wait",
    body: "Start free. Sign in to save your consultation, care plan, and 48-hour check-ins in your patient portal.",
  },
  reassurance: {
    title: "Know what to do",
    accent: "with confidence",
    body: "Start free and get structured guidance you can share with family or your GP.",
  },
};

export function CTA({ variant = "specialist" }: { variant?: LandingVariant }) {
  const copy = ctaCopyByVariant[variant];

  return (
    <section id="cta" className="py-28 px-6" style={{ background: "#E7F3FF" }}>
      <LandingSectionViewTracker sectionId="cta" surface="cta" />
      <div className="max-w-4xl mx-auto text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-8"
          style={{
            background: "rgba(255,255,255,0.8)",
            borderColor: "#BFDBFE",
            color: "#637288",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: "#F7C543" }}
          />
          <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-wider">
            Free start · Secure account · Follow-up reminders
          </span>
        </div>

        <h2
          className="font-[family-name:var(--font-display)] text-4xl md:text-6xl leading-tight mb-6 text-balance"
          style={{ color: "#12181B", letterSpacing: "-2px" }}
        >
          {copy.title}{" "}
          <span className="italic" style={{ color: "#12CA93" }}>
            {copy.accent}
          </span>
        </h2>

        <p
          className="text-lg mb-10 max-w-lg mx-auto"
          style={{ color: "#384248" }}
        >
          {copy.body}
        </p>

        {/* Pill CTA — readme.com style */}
        <div
          className="inline-flex items-center gap-3 p-1.5 rounded-full border shadow-md mx-auto"
          style={{
            background: "rgba(255,255,255,0.9)",
            borderColor: "#E5E7EB",
          }}
        >
          <Link
            href="/consult"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-white font-medium font-[family-name:var(--font-mono)] text-sm hover:opacity-90 transition-opacity shadow-sm"
            style={{ background: "linear-gradient(180deg, #56B8FF, #018EF5)" }}
            onClick={() =>
              trackEvent(ANALYTICS_EVENTS.landingCtaClick, {
                surface: "cta",
                cta: "start_consultation",
                variant,
              })
            }
          >
            Start Free Consultation (Sign in required)
          </Link>
          <Link
            href="#team"
            className="px-5 py-3 text-sm font-[family-name:var(--font-mono)] hover:opacity-70 transition-opacity"
            style={{ color: "#118CFD" }}
            onClick={() =>
              trackEvent(ANALYTICS_EVENTS.landingSecondaryClick, {
                surface: "cta",
                cta: "meet_team",
              })
            }
          >
            Meet the Team
          </Link>
        </div>

        <p
          className="mt-8 font-[family-name:var(--font-mono)] text-[11px]"
          style={{ color: "#637288" }}
        >
          AHPRA-aligned · Privacy Act 1988 · Data stored in Australia
        </p>
      </div>
    </section>
  );
}

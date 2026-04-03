"use client";

import { LandingSectionViewTracker } from "@/components/landing/LandingSectionViewTracker";

const stats = [
  { value: "7-layer", label: "AI specialist review per consultation" },
  { value: "<2 min", label: "Average time to full assessment" },
  { value: "000-first", label: "Emergency escalation — always deterministic" },
  { value: "AU-only", label: "Data stored in Sydney (ap-southeast-2)" },
];

const testimonials = [
  {
    quote:
      "I described my chest tightness and within minutes MediCrew flagged a red flag I hadn't connected — it pushed me to see a GP that day. Turned out I needed an ECG.",
    name: "Tanya M.",
    location: "Brisbane, QLD",
    initials: "TM",
  },
  {
    quote:
      "As a caregiver managing my mum's medications, having a structured summary I could hand to her GP made the appointment so much more productive.",
    name: "David K.",
    location: "Sydney, NSW",
    initials: "DK",
  },
  {
    quote:
      "I liked that it was upfront about not being a diagnosis. It gave me a clear action list — book GP, watch for X, come back if Y. That's exactly what I needed at 2am.",
    name: "Sarah L.",
    location: "Melbourne, VIC",
    initials: "SL",
  },
];

const proofs = [
  {
    title: "Chest pain triage outcome",
    detail:
      "Detected escalation criteria early and routed user to urgent in-person review with a GP + cardiology question set.",
    badge: "Emergency-first",
  },
  {
    title: "Anxiety + dizziness consult",
    detail:
      "Generated a practical home-monitoring plan plus red-flag thresholds and a concise follow-up summary for family support.",
    badge: "Actionable next steps",
  },
  {
    title: "Medication follow-up support",
    detail:
      "Turned mixed symptoms into a structured timeline and appointment prep notes, reducing uncertainty before the GP visit.",
    badge: "Shareable summary",
  },
];

export function ProofSection() {
  return (
    <>
      {/* Stats strip */}
      <section className="border-y border-slate-100 bg-white py-10 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p
                className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-bold"
                style={{ color: "#118CFD" }}
              >
                {s.value}
              </p>
              <p className="mt-1 text-xs text-slate-500 leading-snug">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Proof in practice */}
      <section
        id="proof"
        className="py-24 px-6"
        style={{ background: "#F8FBFF" }}
      >
        <LandingSectionViewTracker sectionId="proof" surface="proof_section" />
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 max-w-2xl">
            <p
              className="font-[family-name:var(--font-mono)] text-xs tracking-widest uppercase mb-4"
              style={{ color: "#637288" }}
            >
              Proof in Practice
            </p>
            <h2
              className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-tight"
              style={{ color: "#12181B", letterSpacing: "-1px" }}
            >
              What users actually get{" "}
              <span className="italic" style={{ color: "#118CFD" }}>
                after a consult.
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-16">
            {proofs.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border p-6 transition-all duration-300 hover:shadow-md"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  borderColor: "#DCEAFE",
                }}
              >
                <span
                  className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-[family-name:var(--font-mono)] tracking-wide"
                  style={{
                    color: "#0F4C81",
                    borderColor: "#BFDBFE",
                    background: "#EFF6FF",
                  }}
                >
                  {item.badge}
                </span>
                <h3
                  className="mt-4 text-lg font-medium"
                  style={{ color: "#12181B" }}
                >
                  {item.title}
                </h3>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: "#637288" }}
                >
                  {item.detail}
                </p>
              </article>
            ))}
          </div>

          {/* Testimonials */}
          <div className="mb-4">
            <p
              className="font-[family-name:var(--font-mono)] text-xs tracking-widest uppercase mb-8"
              style={{ color: "#637288" }}
            >
              Beta user feedback
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl p-6"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid #DCEAFE",
                }}
              >
                <p
                  className="text-sm leading-relaxed mb-5"
                  style={{ color: "#374151" }}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "#EFF6FF", color: "#1D4ED8" }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "#12181B" }}
                    >
                      {t.name}
                    </p>
                    <p className="text-xs" style={{ color: "#637288" }}>
                      {t.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-center" style={{ color: "#9CA3AF" }}>
            Testimonials from beta program participants. MediCrew is
            AI-assisted, not AI-decided. All clinical decisions remain with your
            treating practitioner.
          </p>
        </div>
      </section>
    </>
  );
}

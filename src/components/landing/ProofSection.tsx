"use client";

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
    <section id="proof" className="py-24 px-6" style={{ background: "#F8FBFF" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 max-w-2xl">
          <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest uppercase mb-4" style={{ color: "#637288" }}>
            Proof in Practice
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-tight" style={{ color: "#12181B", letterSpacing: "-1px" }}>
            What users actually get{" "}
            <span className="italic" style={{ color: "#118CFD" }}>after a consult.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {proofs.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border p-6 transition-all duration-300 hover:shadow-md"
              style={{ background: "rgba(255,255,255,0.9)", borderColor: "#DCEAFE" }}
            >
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-[family-name:var(--font-mono)] tracking-wide"
                style={{ color: "#0F4C81", borderColor: "#BFDBFE", background: "#EFF6FF" }}
              >
                {item.badge}
              </span>
              <h3 className="mt-4 text-lg font-medium" style={{ color: "#12181B" }}>
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#637288" }}>
                {item.detail}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

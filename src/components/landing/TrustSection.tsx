"use client";

import Link from "next/link";

const pillars = [
  { code: "AUS-01", title: "AHPRA-Aligned", body: "AI agents are named to clearly distinguish them from registered practitioners — e.g. 'Alex AI — GP', never 'Dr. Alex'.", color: "#118CFD" },
  { code: "AUS-02", title: "Privacy Act 1988", body: "All data stored in Sydney (ap-southeast-2). Full APP 12 export and soft-delete on request.", color: "#12CA93" },
  { code: "AUS-03", title: "Emergency-First", body: "Deterministic emergency detection runs before any LLM call. If it's serious, you're told to call 000 first.", color: "#E95F6A" },
  { code: "AUS-04", title: "Not a Diagnosis", body: "Every output carries AHPRA-required disclaimers. MediCrew navigates — your GP diagnoses.", color: "#8470BE" },
];

export function TrustSection() {
  return (
    <section id="safety" className="py-28 px-6" style={{ background: "linear-gradient(to bottom, transparent, #AE9ED4)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 max-w-xl">
          <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest uppercase mb-4" style={{ color: "#637288" }}>
            Trust & Safety
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-tight" style={{ color: "#12181B", letterSpacing: "-1px" }}>
            Built for{" "}
            <span className="italic" style={{ color: "#8470BE" }}>Australian healthcare.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {pillars.map((p) => (
            <div key={p.code}
              className="group rounded-2xl p-8 border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}>
              <div className="flex items-center gap-3 mb-5">
                <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest px-2 py-1 rounded"
                  style={{ color: p.color, background: `${p.color}12`, border: `1px solid ${p.color}25` }}>
                  {p.code}
                </span>
                <div className="h-px flex-1" style={{ background: `${p.color}20` }} />
              </div>
              <h3 className="font-medium mb-2 text-lg" style={{ color: "#12181B" }}>{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#637288" }}>{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/trust"
            className="inline-flex items-center rounded-full border px-4 py-2 text-sm transition-opacity hover:opacity-80"
            style={{ color: "#12181B", borderColor: "rgba(255,255,255,0.9)", background: "rgba(255,255,255,0.7)" }}
          >
            Read full trust center
          </Link>
          <Link
            href="/privacy"
            className="inline-flex items-center rounded-full border px-4 py-2 text-sm transition-opacity hover:opacity-80"
            style={{ color: "#12181B", borderColor: "rgba(255,255,255,0.9)", background: "rgba(255,255,255,0.7)" }}
          >
            Privacy policy
          </Link>
          <Link
            href="/terms"
            className="inline-flex items-center rounded-full border px-4 py-2 text-sm transition-opacity hover:opacity-80"
            style={{ color: "#12181B", borderColor: "rgba(255,255,255,0.9)", background: "rgba(255,255,255,0.7)" }}
          >
            Terms of use
          </Link>
        </div>
      </div>
    </section>
  );
}

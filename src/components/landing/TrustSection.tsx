"use client";

const pillars = [
  {
    code: "AUS-01",
    title: "AHPRA-Aligned",
    body: "AI agents are named to clearly distinguish them from registered practitioners — e.g. 'Alex AI — GP', never 'Dr. Alex'.",
    color: "#818cf8",
    glow: "rgba(129,140,248,0.08)",
    border: "rgba(129,140,248,0.2)",
  },
  {
    code: "AUS-02",
    title: "Privacy Act 1988",
    body: "All data stored in Sydney (ap-southeast-2). Full APP 12 export and soft-delete on request.",
    color: "#34d399",
    glow: "rgba(52,211,153,0.08)",
    border: "rgba(52,211,153,0.2)",
  },
  {
    code: "AUS-03",
    title: "Emergency-First",
    body: "Deterministic emergency detection runs before any LLM call. If it's serious, you're told to call 000 first.",
    color: "#fb923c",
    glow: "rgba(251,146,60,0.08)",
    border: "rgba(251,146,60,0.2)",
  },
  {
    code: "AUS-04",
    title: "Not a Diagnosis",
    body: "Every output carries AHPRA-required disclaimers. MediCrew navigates — your GP diagnoses.",
    color: "#f472b6",
    glow: "rgba(244,114,182,0.08)",
    border: "rgba(244,114,182,0.2)",
  },
];

export function TrustSection() {
  return (
    <section id="safety" className="py-28 px-6 border-t border-white/[0.04]" style={{ background: "#080812" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 max-w-xl">
          <p className="font-[family-name:var(--font-mono)] text-xs text-violet-400/60 tracking-widest uppercase mb-4">
            Trust & Safety
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-white leading-tight">
            Built for{" "}
            <span className="italic" style={{ background: "linear-gradient(135deg, #34d399, #67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Australian healthcare.
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {pillars.map((p) => (
            <div
              key={p.code}
              className="group relative rounded-2xl p-8 border transition-all duration-300 hover:scale-[1.01]"
              style={{ background: p.glow, borderColor: p.border }}
            >
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest px-2 py-1 rounded"
                  style={{ color: p.color, background: `${p.color}15`, border: `1px solid ${p.color}25` }}
                >
                  {p.code}
                </span>
                <div className="h-px flex-1" style={{ background: `${p.color}20` }} />
              </div>
              <h3 className="text-white font-medium mb-2 text-lg">{p.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

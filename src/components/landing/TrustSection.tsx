"use client";

const pillars = [
  {
    code: "AUS-01",
    title: "AHPRA-Aligned",
    body: "AI agents are named to clearly distinguish them from registered practitioners — e.g. 'Alex AI — GP', never 'Dr. Alex'.",
  },
  {
    code: "AUS-02",
    title: "Privacy Act 1988",
    body: "All data stored in Sydney (ap-southeast-2). Full APP 12 export and soft-delete on request.",
  },
  {
    code: "AUS-03",
    title: "Emergency-First",
    body: "Deterministic emergency detection runs before any LLM call. If it's serious, you're told to call 000 first.",
  },
  {
    code: "AUS-04",
    title: "Not a Diagnosis",
    body: "Every output carries AHPRA-required disclaimers. MediCrew navigates — your GP diagnoses.",
  },
];

export function TrustSection() {
  return (
    <section id="safety" className="bg-black py-28 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 max-w-xl">
          <p className="font-[family-name:var(--font-mono)] text-xs text-white/30 tracking-widest uppercase mb-4">
            Trust & Safety
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-white leading-tight">
            Built for{" "}
            <span className="italic text-blue-300">Australian healthcare.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.06]">
          {pillars.map((p) => (
            <div
              key={p.code}
              className="bg-[#050505] p-8 hover:bg-white/[0.02] transition-colors duration-300"
            >
              <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/20 tracking-widest block mb-4">
                {p.code}
              </span>
              <h3 className="text-white font-medium mb-2">{p.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

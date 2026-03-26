"use client";

const steps = [
  {
    number: "01",
    title: "Describe your symptoms",
    body: "Tell us what you're feeling in plain language. No jargon, no forms, no waiting room.",
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.15)",
  },
  {
    number: "02",
    title: "Your AI team consults",
    body: "Eight specialists — GP, cardiologist, mental health, and more — analyse your case simultaneously. Not one bot. A whole team.",
    color: "#f472b6",
    glow: "rgba(244,114,182,0.15)",
  },
  {
    number: "03",
    title: "Receive clear guidance",
    body: "Get urgency assessment, likely explanations, and exact questions to ask your real doctor. Structured. Actionable. Instantly.",
    color: "#67e8f9",
    glow: "rgba(103,232,249,0.15)",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-white/[0.04]" style={{ background: "#060614" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 max-w-xl">
          <p className="font-[family-name:var(--font-mono)] text-xs text-violet-400/60 tracking-widest uppercase mb-4">
            How It Works
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-white leading-tight">
            From symptoms to clarity{" "}
            <span className="italic" style={{ background: "linear-gradient(135deg, #a78bfa, #67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              in minutes.
            </span>
          </h2>
        </div>

        <div className="flex flex-col gap-6">
          {steps.map((step, i) => (
            <div
              key={i}
              className="group relative flex gap-6 items-start rounded-2xl p-6 border border-white/[0.06] transition-all duration-300 hover:border-white/[0.12]"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              {/* Number circle */}
              <div
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{ background: step.glow, border: `1px solid ${step.color}30` }}
              >
                <span className="font-[family-name:var(--font-mono)] text-[11px] font-medium" style={{ color: step.color }}>
                  {step.number}
                </span>
              </div>

              {/* Content */}
              <div className="pt-1">
                <h3 className="text-white font-medium mb-2 text-lg">{step.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed max-w-lg">{step.body}</p>
              </div>

              {/* Right glow on hover */}
              <div
                className="absolute right-0 top-0 bottom-0 w-1 rounded-r-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(to bottom, transparent, ${step.color}, transparent)` }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

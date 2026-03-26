"use client";

const steps = [
  {
    number: "01",
    title: "Describe your symptoms",
    body: "Tell us what you're feeling in plain language. No jargon, no forms.",
  },
  {
    number: "02",
    title: "Your AI team consults",
    body: "Eight specialists — GP, cardiologist, mental health, and more — analyse your case simultaneously.",
  },
  {
    number: "03",
    title: "Receive clear guidance",
    body: "Get urgency assessment, likely explanations, and exact questions to ask your doctor.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-black py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 max-w-xl">
          <p className="font-[family-name:var(--font-mono)] text-xs text-white/30 tracking-widest uppercase mb-4">
            How It Works
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-white leading-tight">
            From symptoms to clarity{" "}
            <span className="italic text-blue-300">in minutes.</span>
          </h2>
        </div>

        <div className="relative">
          {/* Vertical connector */}
          <div className="absolute left-[19px] top-8 bottom-8 w-px bg-gradient-to-b from-white/10 via-blue-500/20 to-transparent hidden md:block" />

          <div className="flex flex-col gap-10">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-8 items-start group">
                <div className="flex-shrink-0 w-10 h-10 rounded-full border border-white/[0.12] bg-black flex items-center justify-center z-10 group-hover:border-blue-500/40 group-hover:bg-blue-500/5 transition-all duration-300">
                  <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 group-hover:text-blue-400 transition-colors">
                    {step.number}
                  </span>
                </div>
                <div className="pt-1.5">
                  <h3 className="text-white font-medium mb-2">{step.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed max-w-lg">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

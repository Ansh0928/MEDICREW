"use client";

import { Users, Zap, Shield, Clock, Brain, FileText } from "lucide-react";

const features = [
  {
    icon: <Users className="w-5 h-5" />,
    title: "Multi-Specialist Review",
    description: "Eight AI doctors assess your case simultaneously — not just a single chatbot.",
    size: "col-span-2",
    accent: "blue",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Instant Guidance",
    description: "Results in minutes, not weeks.",
    size: "",
    accent: "emerald",
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: "Smart Triage",
    description: "Urgency-aware — knows when to say go to hospital.",
    size: "",
    accent: "violet",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "24/7 Availability",
    description: "No appointment needed. Available every hour, including 3am.",
    size: "",
    accent: "amber",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Appointment Prep",
    description: "Get the right questions to ask your doctor before you go.",
    size: "",
    accent: "rose",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Privacy First",
    description: "Data stored in Australia (ap-southeast-2). AHPRA-aligned AI naming.",
    size: "col-span-2",
    accent: "emerald",
  },
];

const accentMap: Record<string, string> = {
  blue:    "text-blue-400 bg-blue-400/10 border-blue-400/20",
  emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  violet:  "text-violet-400 bg-violet-400/10 border-violet-400/20",
  amber:   "text-amber-400 bg-amber-400/10 border-amber-400/20",
  rose:    "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

export function Features() {
  return (
    <section id="how-it-works" className="bg-black py-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-16 max-w-xl">
          <p className="font-[family-name:var(--font-mono)] text-xs text-white/30 tracking-widest uppercase mb-4">
            Why MediCrew
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-white leading-tight">
            Healthcare navigation,{" "}
            <span className="italic text-blue-300">redesigned.</span>
          </h2>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {features.map((f, i) => {
            const accent = accentMap[f.accent] ?? accentMap.blue;
            return (
              <div
                key={i}
                className={`group relative rounded-2xl p-6 border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300 ${f.size}`}
              >
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border ${accent} mb-5 transition-transform duration-300 group-hover:scale-110`}>
                  {f.icon}
                </div>
                <h3 className="text-white font-medium mb-2 text-sm">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.description}</p>

                {/* Subtle corner glow on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: "radial-gradient(circle at 0% 0%, rgba(96,165,250,0.04) 0%, transparent 60%)" }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

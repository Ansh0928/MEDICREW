"use client";

import { Users, Zap, Shield, Clock, Brain, FileText } from "lucide-react";

const features = [
  {
    icon: <Users className="w-5 h-5" />,
    title: "Multi-Specialist Review",
    description: "Eight AI doctors assess your case simultaneously — not just a single chatbot. GP, cardiologist, dermatologist, mental health and more in one consultation.",
    size: "col-span-2",
    color: "#818cf8",
    glow: "rgba(129,140,248,0.12)",
    border: "rgba(129,140,248,0.25)",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Instant Guidance",
    description: "Results in minutes, not weeks.",
    size: "",
    color: "#34d399",
    glow: "rgba(52,211,153,0.10)",
    border: "rgba(52,211,153,0.20)",
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: "Smart Triage",
    description: "Urgency-aware — knows when to say go to hospital.",
    size: "",
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.10)",
    border: "rgba(167,139,250,0.20)",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "24/7 Availability",
    description: "No appointment needed. Available every hour, including 3am.",
    size: "",
    color: "#fb923c",
    glow: "rgba(251,146,60,0.10)",
    border: "rgba(251,146,60,0.20)",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Appointment Prep",
    description: "Get the right questions to ask your doctor before you go.",
    size: "",
    color: "#f472b6",
    glow: "rgba(244,114,182,0.10)",
    border: "rgba(244,114,182,0.20)",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Privacy First",
    description: "Data stored in Australia (ap-southeast-2). AHPRA-aligned AI naming. No data sold. Ever.",
    size: "col-span-2",
    color: "#67e8f9",
    glow: "rgba(103,232,249,0.10)",
    border: "rgba(103,232,249,0.20)",
  },
];

export function Features() {
  return (
    <section className="py-28 px-6 border-t border-white/[0.04]" style={{ background: "#080812" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 max-w-xl">
          <p className="font-[family-name:var(--font-mono)] text-xs text-violet-400/60 tracking-widest uppercase mb-4">
            Why MediCrew
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-white leading-tight">
            Healthcare navigation,{" "}
            <span className="italic" style={{ background: "linear-gradient(135deg, #818cf8, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              redesigned.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {features.map((f, i) => (
            <div
              key={i}
              className={`group relative rounded-2xl p-6 border transition-all duration-300 hover:scale-[1.01] ${f.size}`}
              style={{ background: f.glow, borderColor: f.border }}
            >
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${f.color}15`, border: `1px solid ${f.color}30`, color: f.color }}
              >
                {f.icon}
              </div>
              <h3 className="text-white font-medium mb-2 text-sm">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.description}</p>

              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle at 0% 0%, ${f.color}08 0%, transparent 60%)` }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

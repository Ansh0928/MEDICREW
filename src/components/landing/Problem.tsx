"use client";

import { Clock, MapPin, HelpCircle, DollarSign } from "lucide-react";

const stats = [
  { icon: <Clock className="w-5 h-5" />, stat: "4–6 weeks", label: "Avg. specialist wait time in Australia", color: "#f472b6", bg: "rgba(244,114,182,0.08)", border: "rgba(244,114,182,0.2)" },
  { icon: <MapPin className="w-5 h-5" />, stat: "7M+", label: "Australians with limited specialist access", color: "#818cf8", bg: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.2)" },
  { icon: <HelpCircle className="w-5 h-5" />, stat: "65%", label: "Unsure if symptoms need urgent care", color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)" },
  { icon: <DollarSign className="w-5 h-5" />, stat: "$400+", label: "Average out-of-pocket specialist visit", color: "#fb923c", bg: "rgba(251,146,60,0.08)", border: "rgba(251,146,60,0.2)" },
];

export function Problem() {
  return (
    <section className="py-24 px-6 border-t border-white/[0.04]" style={{ background: "#080812" }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <p className="font-[family-name:var(--font-mono)] text-xs text-violet-400/60 tracking-widest uppercase mb-4">
              The Problem
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-white leading-tight mb-6">
              Healthcare access{" "}
              <span className="italic" style={{ background: "linear-gradient(135deg, #a78bfa, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                shouldn&apos;t be this hard.
              </span>
            </h2>
            <p className="text-white/40 text-base leading-relaxed max-w-sm">
              Millions of Australians wait weeks or pay hundreds just to understand their own symptoms.
              MediCrew gives you the guidance — instantly, for free.
            </p>
          </div>

          {/* Right — stats */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}
              >
                <div className="mb-3" style={{ color: s.color }}>{s.icon}</div>
                <div className="font-[family-name:var(--font-display)] text-3xl text-white mb-1" style={{ color: s.color }}>
                  {s.stat}
                </div>
                <p className="font-[family-name:var(--font-mono)] text-[11px] text-white/40 leading-snug">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

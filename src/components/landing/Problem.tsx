"use client";

import { Clock, MapPin, HelpCircle, DollarSign } from "lucide-react";

const stats = [
  { icon: <Clock className="w-5 h-5" />, stat: "4–6 weeks", label: "Avg. specialist wait time in Australia", color: "#118CFD" },
  { icon: <MapPin className="w-5 h-5" />, stat: "7M+", label: "Australians with limited specialist access", color: "#8470BE" },
  { icon: <HelpCircle className="w-5 h-5" />, stat: "65%", label: "Unsure if symptoms need urgent care", color: "#12CA93" },
  { icon: <DollarSign className="w-5 h-5" />, stat: "$400+", label: "Average out-of-pocket specialist visit", color: "#F7C543" },
];

export function Problem() {
  return (
    <section className="py-24 px-6" style={{ background: "linear-gradient(25deg, #EEE8E4, #FDF5E2)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest uppercase mb-4" style={{ color: "#637288" }}>
              The Problem
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-tight mb-6"
              style={{ color: "#12181B", letterSpacing: "-1px" }}>
              Healthcare access{" "}
              <span className="italic" style={{ color: "#118CFD" }}>shouldn&apos;t be this hard.</span>
            </h2>
            <p className="text-base leading-relaxed max-w-sm" style={{ color: "#384248" }}>
              Millions of Australians wait weeks or pay hundreds just to understand their own symptoms.
              MediCrew gives you the guidance — instantly, for free.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {stats.map((s, i) => (
              <div key={i}
                className="rounded-2xl p-5 border hover:shadow-md transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}>
                <div className="mb-3" style={{ color: s.color }}>{s.icon}</div>
                <div className="font-[family-name:var(--font-display)] text-3xl mb-1" style={{ color: s.color }}>
                  {s.stat}
                </div>
                <p className="font-[family-name:var(--font-mono)] text-[11px] leading-snug" style={{ color: "#637288" }}>
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

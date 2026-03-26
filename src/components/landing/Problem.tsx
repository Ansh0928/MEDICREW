"use client";

import { Clock, MapPin, HelpCircle, DollarSign } from "lucide-react";

const stats = [
  { icon: <Clock className="w-5 h-5" />, stat: "4–6 weeks", label: "Avg. specialist wait time in Australia" },
  { icon: <MapPin className="w-5 h-5" />, stat: "7M+", label: "Australians with limited specialist access" },
  { icon: <HelpCircle className="w-5 h-5" />, stat: "65%", label: "Unsure if symptoms need urgent care" },
  { icon: <DollarSign className="w-5 h-5" />, stat: "$400+", label: "Average out-of-pocket specialist visit" },
];

export function Problem() {
  return (
    <section className="bg-[#050505] py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <p className="font-[family-name:var(--font-mono)] text-xs text-white/30 tracking-widest uppercase mb-4">
              The Problem
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-white leading-tight mb-6">
              Healthcare access{" "}
              <span className="italic text-blue-300">shouldn't be this hard.</span>
            </h2>
            <p className="text-white/40 text-base leading-relaxed max-w-sm">
              Millions of Australians wait weeks or pay hundreds to understand their own symptoms.
              MediCrew gives you the guidance — instantly, for free.
            </p>
          </div>

          {/* Right — stats */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors duration-300"
              >
                <div className="text-white/25 mb-3">{s.icon}</div>
                <div className="font-[family-name:var(--font-display)] text-3xl text-white mb-1">
                  {s.stat}
                </div>
                <p className="font-[family-name:var(--font-mono)] text-[11px] text-white/30 leading-snug">
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

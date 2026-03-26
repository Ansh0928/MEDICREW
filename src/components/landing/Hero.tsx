"use client";

import Link from "next/link";
import { Entropy } from "@/components/ui/entropy";
import { useEffect, useState } from "react";

export function Hero() {
  const [entropySize, setEntropySize] = useState(420);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 768) setEntropySize(300);
      else if (w < 1280) setEntropySize(360);
      else setEntropySize(440);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden flex items-center"
      style={{ background: "linear-gradient(180deg, rgba(1,142,245,0.12) 0%, rgba(247,247,247,0.4) 60%, #ffffff 100%)" }}>

      {/* Soft dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: "radial-gradient(circle, rgba(17,140,253,0.15) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div className="flex flex-col gap-8">
            {/* Sparkle eyebrow */}
            <div className="opacity-0 animate-fade-up delay-100 flex items-center gap-2" style={{ animationFillMode: "forwards" }}>
              <span className="text-xl" style={{ color: "#F7C543" }}>✦</span>
              <span className="font-[family-name:var(--font-mono)] text-xs tracking-widest uppercase" style={{ color: "#637288" }}>
                AI Health Navigation · Australia
              </span>
            </div>

            {/* Heading */}
            <div className="opacity-0 animate-fade-up delay-200" style={{ animationFillMode: "forwards" }}>
              <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-6xl xl:text-[72px] leading-[1.05] tracking-tight"
                style={{ color: "#12181B", letterSpacing: "-2px" }}>
                Navigate your health{" "}
                <span className="italic" style={{ color: "#118CFD" }}>
                  with an AI care team.
                </span>
              </h1>
            </div>

            {/* Sub */}
            <p className="opacity-0 animate-fade-up delay-300 text-base leading-relaxed max-w-md"
              style={{ color: "#384248", animationFillMode: "forwards" }}>
              Eight AI specialists — GP, cardiologist, mental health, and more — review your symptoms together.
              Clear, prioritised guidance in minutes, not weeks.
            </p>

            {/* CTA pill */}
            <div className="opacity-0 animate-fade-up delay-400" style={{ animationFillMode: "forwards" }}>
              <div className="inline-flex items-center gap-3 p-1.5 rounded-full border shadow-sm"
                style={{ background: "rgba(255,255,255,0.8)", borderColor: "#E5E7EB", backdropFilter: "blur(8px)" }}>
                <Link href="/consult"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-white text-sm font-medium font-[family-name:var(--font-mono)] hover:opacity-90 transition-opacity shadow-sm"
                  style={{ background: "linear-gradient(180deg, #56B8FF, #018EF5)" }}>
                  Get Started
                  <span>→</span>
                </Link>
                <Link href="#team"
                  className="px-4 py-2.5 text-sm font-[family-name:var(--font-mono)] hover:opacity-70 transition-opacity"
                  style={{ color: "#118CFD" }}>
                  Meet the Team
                </Link>
              </div>
            </div>

            {/* Trust strip */}
            <div className="opacity-0 animate-fade-in delay-600 flex flex-wrap items-center gap-x-6 gap-y-2" style={{ animationFillMode: "forwards" }}>
              {["Free to use", "No account needed", "Privacy-first"].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <span className="text-sm" style={{ color: "#12CA93" }}>✓</span>
                  <span className="font-[family-name:var(--font-mono)] text-xs" style={{ color: "#637288" }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Entropy canvas */}
          <div className="opacity-0 animate-fade-in delay-300 flex flex-col items-center justify-center gap-4"
            style={{ animationFillMode: "forwards" }}>
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-2xl opacity-20 scale-95"
                style={{ background: "linear-gradient(135deg, #118CFD, #12CA93)" }} />
              <Entropy size={entropySize} className="rounded-2xl relative shadow-2xl" />
              <div className="absolute bottom-[-28px] left-0 right-0 flex justify-between px-4">
                <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase" style={{ color: "#637288" }}>Order</span>
                <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase" style={{ color: "#637288" }}>Chaos</span>
              </div>
            </div>
            <p className="mt-10 font-[family-name:var(--font-mono)] text-[11px] text-center max-w-xs" style={{ color: "#637288" }}>
              MediCrew transforms medical uncertainty into structured guidance
            </p>
          </div>
        </div>

        {/* Agent marquee */}
        <div className="opacity-0 animate-fade-in delay-700 mt-20 overflow-hidden pt-8" style={{ animationFillMode: "forwards", borderTop: "1px solid rgba(17,140,253,0.1)" }}>
          <div className="flex gap-0 animate-marquee whitespace-nowrap">
            {[
              "🚨 Triage AI", "👨‍⚕️ Alex AI — GP", "❤️ Sarah AI — Cardiology",
              "🧠 Maya AI — Mental Health", "🔬 Priya AI — Dermatology",
              "🦴 James AI — Orthopedic", "🫁 Chen AI — Gastroenterology",
              "🏃 Emma AI — Physiotherapy",
              "🚨 Triage AI", "👨‍⚕️ Alex AI — GP", "❤️ Sarah AI — Cardiology",
              "🧠 Maya AI — Mental Health", "🔬 Priya AI — Dermatology",
              "🦴 James AI — Orthopedic", "🫁 Chen AI — Gastroenterology",
              "🏃 Emma AI — Physiotherapy",
            ].map((agent, i) => (
              <span key={i} className="font-[family-name:var(--font-mono)] text-xs px-8 flex-shrink-0" style={{ color: "#637288" }}>
                {agent}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { Entropy } from "@/components/ui/entropy";
import { useEffect, useState } from "react";

const WORDS = ["symptoms", "confusion", "uncertainty", "waiting rooms"];

export function Hero() {
  const [wordIndex, setWordIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [entropySize, setEntropySize] = useState(420);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setWordIndex((i) => (i + 1) % WORDS.length);
        setVisible(true);
      }, 400);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 768) setEntropySize(320);
      else if (w < 1280) setEntropySize(380);
      else setEntropySize(460);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <section className="relative min-h-screen bg-black overflow-hidden flex items-center dot-grid">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-blue-600/[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-indigo-600/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-6 items-center">

          {/* Left — Text */}
          <div className="flex flex-col gap-8">
            {/* Eyebrow */}
            <div
              className="opacity-0 animate-fade-up delay-100 flex items-center gap-3"
              style={{ animationFillMode: "forwards" }}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-[family-name:var(--font-mono)] text-xs text-white/40 tracking-widest uppercase">
                  AI Health Navigation — Australia
                </span>
              </div>
            </div>

            {/* Headline */}
            <div
              className="opacity-0 animate-fade-up delay-200"
              style={{ animationFillMode: "forwards" }}
            >
              <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-6xl xl:text-7xl text-white leading-[1.05] tracking-tight">
                Navigate your{" "}
                <span
                  className={`italic text-blue-300 transition-all duration-300 ${
                    visible ? "opacity-100 blur-none" : "opacity-0 blur-sm"
                  }`}
                >
                  {WORDS[wordIndex]}
                </span>
                <br />
                with a team of AI specialists.
              </h1>
            </div>

            {/* Sub */}
            <p
              className="opacity-0 animate-fade-up delay-300 text-white/50 text-lg leading-relaxed max-w-lg"
              style={{ animationFillMode: "forwards" }}
            >
              Eight AI specialists — GP, cardiologist, dermatologist, and more —
              review your symptoms together and give you clear, prioritised guidance.
              Instantly.
            </p>

            {/* CTAs */}
            <div
              className="opacity-0 animate-fade-up delay-400 flex flex-col sm:flex-row gap-3"
              style={{ animationFillMode: "forwards" }}
            >
              <Link
                href="/consult"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white text-black text-sm font-medium font-[family-name:var(--font-mono)] hover:bg-blue-50 transition-all duration-200"
              >
                Start Free Consultation
                <span className="group-hover:translate-x-0.5 transition-transform duration-200">→</span>
              </Link>
              <Link
                href="#team"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-white/[0.12] text-white/70 text-sm font-[family-name:var(--font-mono)] hover:border-white/30 hover:text-white transition-all duration-200"
              >
                Meet the team
              </Link>
            </div>

            {/* Trust strip */}
            <div
              className="opacity-0 animate-fade-in delay-600 flex items-center gap-6 pt-2"
              style={{ animationFillMode: "forwards" }}
            >
              {["Free to use", "No account needed", "Privacy-first"].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <span className="text-emerald-400 text-xs">✓</span>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-white/35">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Entropy canvas */}
          <div
            className="opacity-0 animate-fade-in delay-300 flex flex-col items-center justify-center gap-4"
            style={{ animationFillMode: "forwards" }}
          >
            <div className="relative">
              <Entropy size={entropySize} className="rounded-2xl" />
              {/* Labels */}
              <div className="absolute bottom-[-28px] left-0 right-0 flex justify-between px-4">
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 tracking-widest uppercase">
                  Order
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 tracking-widest uppercase">
                  Chaos
                </span>
              </div>
            </div>
            <p className="mt-10 font-[family-name:var(--font-mono)] text-[11px] text-white/20 tracking-wide text-center max-w-xs">
              MediCrew transforms medical uncertainty into structured guidance
            </p>
          </div>

        </div>

        {/* Agent marquee */}
        <div
          className="opacity-0 animate-fade-in delay-700 mt-20 overflow-hidden border-t border-white/[0.05] pt-8"
          style={{ animationFillMode: "forwards" }}
        >
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
              <span
                key={i}
                className="font-[family-name:var(--font-mono)] text-xs text-white/25 px-8 flex-shrink-0"
              >
                {agent}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

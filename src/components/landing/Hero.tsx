"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

const dicebear = (seed: string) =>
  `https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=${seed}`;

const MESSAGES = [
  { id: 1, delay: 600, type: "patient" },
  { id: 2, delay: 2000, type: "triage" },
  { id: 3, delay: 3500, type: "gp" },
  { id: 4, delay: 5000, type: "cardiology" },
];
const CYCLE_MS = 9500;

function ChatDemo() {
  const [visible, setVisible] = useState(0);

  const run = useCallback(() => {
    setVisible(0);
    const timers = MESSAGES.map((m) =>
      setTimeout(() => setVisible(m.id), m.delay)
    );
    return timers;
  }, []);

  useEffect(() => {
    const timers = run();
    const interval = setInterval(() => {
      timers.forEach(clearTimeout);
      run();
    }, CYCLE_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [run]);

  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-[#0c0c1e]/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-violet-900/20">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/20 ml-2 tracking-wide">
          MediCrew — consultation in progress
        </span>
        <span className="ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-[family-name:var(--font-mono)] text-[9px] text-emerald-400/70">LIVE</span>
        </span>
      </div>

      {/* Chat */}
      <div className="p-5 space-y-5 min-h-[380px]">
        {/* Patient */}
        {visible >= 1 && (
          <div className="flex gap-3 animate-fade-up" style={{ animationFillMode: "forwards" }}>
            <img src={dicebear("jamie")} alt="You" className="w-8 h-8 rounded-full bg-violet-500/20 flex-shrink-0 border border-violet-500/20" />
            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 mb-1.5">You · just now</div>
              <div className="rounded-2xl rounded-tl-sm bg-violet-500/[0.08] border border-violet-500/20 px-4 py-3 text-sm text-white/80 leading-relaxed max-w-[260px]">
                I&apos;ve had chest tightness and shortness of breath for 2 days, plus dizziness when I stand up.
              </div>
            </div>
          </div>
        )}

        {/* Triage */}
        {visible >= 2 && (
          <div className="flex gap-3 animate-fade-up" style={{ animationFillMode: "forwards" }}>
            <img src={dicebear("triage")} alt="Triage AI" className="w-8 h-8 rounded-full bg-amber-500/20 flex-shrink-0 border border-amber-500/30" />
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/30">Triage AI</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-300 font-[family-name:var(--font-mono)] border border-amber-500/25">⚠ MEDIUM-HIGH</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-amber-500/[0.06] border border-amber-500/20 px-4 py-3 text-sm text-white/70 leading-relaxed max-w-[260px]">
                Cardiac symptoms flagged. Routing to GP + Cardiology for simultaneous review.
              </div>
            </div>
          </div>
        )}

        {/* GP */}
        {visible >= 3 && (
          <div className="flex gap-3 animate-fade-up" style={{ animationFillMode: "forwards" }}>
            <img src={dicebear("alex")} alt="Alex AI — GP" className="w-8 h-8 rounded-full bg-blue-500/20 flex-shrink-0 border border-blue-500/30" />
            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 mb-1.5">Alex AI — GP</div>
              <div className="rounded-2xl rounded-tl-sm bg-blue-500/[0.06] border border-blue-500/20 px-4 py-3 text-sm text-white/70 leading-relaxed max-w-[260px]">
                Could be postural hypotension or arrhythmia. I&apos;ll prep the exact questions to ask your GP — book within 48hrs.
              </div>
            </div>
          </div>
        )}

        {/* Cardiology */}
        {visible >= 4 && (
          <div className="flex gap-3 animate-fade-up" style={{ animationFillMode: "forwards" }}>
            <img src={dicebear("sarah")} alt="Sarah AI — Cardiology" className="w-8 h-8 rounded-full bg-rose-500/20 flex-shrink-0 border border-rose-500/30" />
            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 mb-1.5">Sarah AI — Cardiology</div>
              <div className="rounded-2xl rounded-tl-sm bg-rose-500/[0.06] border border-rose-500/20 px-4 py-3 text-sm text-white/70 leading-relaxed max-w-[260px]">
                Chest tightness + dizziness needs an ECG. If symptoms worsen — call 000, don&apos;t wait.
              </div>
            </div>
          </div>
        )}

        {/* Typing dots */}
        {visible > 0 && visible < 4 && (
          <div className="flex gap-1.5 px-2 pl-11">
            {[0, 150, 300].map((d) => (
              <div key={d} className="w-1.5 h-1.5 rounded-full bg-violet-400/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.01] flex items-center gap-3">
        <div className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.07] px-3 py-2.5 font-[family-name:var(--font-mono)] text-xs text-white/20">
          Describe your symptoms...
        </div>
        <button className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white text-sm shadow-lg shadow-violet-900/40 hover:from-violet-500 hover:to-purple-500 transition-all">
          →
        </button>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-screen bg-[#060614] overflow-hidden flex items-center">
      {/* Gradient mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-[10%] w-[700px] h-[700px] bg-violet-700/25 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-[5%] w-[500px] h-[500px] bg-cyan-600/12 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-[30%] w-[300px] h-[300px] bg-pink-600/10 rounded-full blur-[80px]" />
      </div>
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left */}
          <div className="flex flex-col gap-8">
            <div className="opacity-0 animate-fade-up delay-100 flex" style={{ animationFillMode: "forwards" }}>
              <span className="px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 font-[family-name:var(--font-mono)] text-[11px] text-violet-300 tracking-wider uppercase">
                🇦🇺 AI Health Navigation · Australia
              </span>
            </div>

            <div className="opacity-0 animate-fade-up delay-200" style={{ animationFillMode: "forwards" }}>
              <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-6xl xl:text-7xl text-white leading-[1.05] tracking-tight">
                Your personal{" "}
                <span className="italic" style={{ background: "linear-gradient(135deg, #a78bfa, #f472b6, #67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  AI care team
                </span>
                {" "}—{" "}available now.
              </h1>
            </div>

            <p className="opacity-0 animate-fade-up delay-300 text-white/50 text-lg leading-relaxed max-w-lg" style={{ animationFillMode: "forwards" }}>
              Eight AI specialists review your symptoms simultaneously — GP, cardiologist, mental health, and more. Clear guidance in minutes, not weeks.
            </p>

            <div className="opacity-0 animate-fade-up delay-400 flex flex-col sm:flex-row gap-3" style={{ animationFillMode: "forwards" }}>
              <Link
                href="/consult"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white text-sm font-medium font-[family-name:var(--font-mono)] transition-all duration-200 shadow-lg shadow-violet-900/40"
                style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
              >
                Start Free Consultation
                <span className="group-hover:translate-x-0.5 transition-transform duration-200">→</span>
              </Link>
              <Link
                href="#team"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-white/[0.12] text-white/70 text-sm font-[family-name:var(--font-mono)] hover:border-white/25 hover:text-white transition-all duration-200"
              >
                Meet the team
              </Link>
            </div>

            <div className="opacity-0 animate-fade-in delay-600 flex flex-wrap items-center gap-x-6 gap-y-2 pt-2" style={{ animationFillMode: "forwards" }}>
              {["Free to use", "No account needed", "Privacy-first"].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <span className="text-emerald-400 text-sm">✓</span>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-white/35">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Chat demo */}
          <div className="opacity-0 animate-fade-in delay-400" style={{ animationFillMode: "forwards" }}>
            <ChatDemo />
            <p className="mt-4 font-[family-name:var(--font-mono)] text-[11px] text-white/20 text-center tracking-wide">
              8 AI specialists · response in &lt;60 seconds · always free
            </p>
          </div>
        </div>

        {/* Agent marquee */}
        <div className="opacity-0 animate-fade-in delay-700 mt-20 overflow-hidden border-t border-white/[0.05] pt-8" style={{ animationFillMode: "forwards" }}>
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
              <span key={i} className="font-[family-name:var(--font-mono)] text-xs text-white/20 px-8 flex-shrink-0">
                {agent}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

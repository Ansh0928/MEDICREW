"use client";

import { useEffect, useState, useCallback } from "react";
import { LandingSectionViewTracker } from "@/components/landing/LandingSectionViewTracker";

const dicebear = (seed: string) =>
  `https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=${seed}`;

const MESSAGES = [
  { id: 1, delay: 600, type: "patient" },
  { id: 2, delay: 2000, type: "triage" },
  { id: 3, delay: 3500, type: "gp" },
  { id: 4, delay: 5000, type: "cardiology" },
];

function ChatDemo() {
  const [visible, setVisible] = useState(0);

  const run = useCallback(() => {
    setVisible(0);
    const timers = MESSAGES.map((m) =>
      setTimeout(() => setVisible(m.id), m.delay),
    );
    return timers;
  }, []);

  useEffect(() => {
    const timers = run();
    const interval = setInterval(() => {
      timers.forEach(clearTimeout);
      run();
    }, 9500);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [run]);

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-xl border"
      style={{ borderColor: "#E5E7EB", background: "#ffffff" }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "#F3F4F6", background: "#FAFAFA" }}
      >
        <div className="flex gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: "#E95F6A" }}
          />
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: "#F7C543" }}
          />
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: "#12CA93" }}
          />
        </div>
        <span
          className="font-[family-name:var(--font-mono)] text-[10px] ml-2"
          style={{ color: "#637288" }}
        >
          MediCrew — consultation
        </span>
        <span className="ml-auto flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#12CA93" }}
          />
          <span
            className="font-[family-name:var(--font-mono)] text-[9px]"
            style={{ color: "#12CA93" }}
          >
            LIVE
          </span>
        </span>
      </div>

      {/* Messages */}
      <div
        className="p-5 space-y-4 min-h-[300px]"
        style={{ background: "#FAFAFA" }}
      >
        {visible >= 1 && (
          <div
            className="flex gap-3 animate-fade-up"
            style={{ animationFillMode: "forwards" }}
          >
            <img
              src={dicebear("jamie")}
              alt="You"
              className="w-8 h-8 rounded-full flex-shrink-0 border"
              style={{ borderColor: "#E5E7EB" }}
            />
            <div>
              <div
                className="font-[family-name:var(--font-mono)] text-[10px] mb-1.5"
                style={{ color: "#637288" }}
              >
                You · just now
              </div>
              <div
                className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed max-w-[260px] border"
                style={{
                  background: "#EFF6FF",
                  borderColor: "#BFDBFE",
                  color: "#1E40AF",
                }}
              >
                I&apos;ve had chest tightness and shortness of breath for 2
                days, plus dizziness when I stand up.
              </div>
            </div>
          </div>
        )}

        {visible >= 2 && (
          <div
            className="flex gap-3 animate-fade-up"
            style={{ animationFillMode: "forwards" }}
          >
            <img
              src={dicebear("triage")}
              alt="Triage AI"
              className="w-8 h-8 rounded-full flex-shrink-0 border"
              style={{ borderColor: "#FEF3C7" }}
            />
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="font-[family-name:var(--font-mono)] text-[10px]"
                  style={{ color: "#637288" }}
                >
                  Triage AI
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-[family-name:var(--font-mono)]"
                  style={{
                    background: "#FEF9C3",
                    color: "#92400E",
                    border: "1px solid #FDE68A",
                  }}
                >
                  ⚠ MEDIUM-HIGH
                </span>
              </div>
              <div
                className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed max-w-[260px] border"
                style={{
                  background: "#FFFBEB",
                  borderColor: "#FDE68A",
                  color: "#78350F",
                }}
              >
                Cardiac symptoms flagged. Routing to GP + Cardiology for
                simultaneous review.
              </div>
            </div>
          </div>
        )}

        {visible >= 3 && (
          <div
            className="flex gap-3 animate-fade-up"
            style={{ animationFillMode: "forwards" }}
          >
            <img
              src={dicebear("alex")}
              alt="Alex AI — GP"
              className="w-8 h-8 rounded-full flex-shrink-0 border"
              style={{ borderColor: "#BFDBFE" }}
            />
            <div>
              <div
                className="font-[family-name:var(--font-mono)] text-[10px] mb-1.5"
                style={{ color: "#637288" }}
              >
                Alex AI — GP
              </div>
              <div
                className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed max-w-[260px] border"
                style={{
                  background: "#EFF6FF",
                  borderColor: "#BFDBFE",
                  color: "#1E40AF",
                }}
              >
                Could be postural hypotension or arrhythmia. Book a GP within
                48hrs — I&apos;ll prep your questions.
              </div>
            </div>
          </div>
        )}

        {visible >= 4 && (
          <div
            className="flex gap-3 animate-fade-up"
            style={{ animationFillMode: "forwards" }}
          >
            <img
              src={dicebear("sarah")}
              alt="Sarah AI — Cardiology"
              className="w-8 h-8 rounded-full flex-shrink-0 border"
              style={{ borderColor: "#FECDD3" }}
            />
            <div>
              <div
                className="font-[family-name:var(--font-mono)] text-[10px] mb-1.5"
                style={{ color: "#637288" }}
              >
                Sarah AI — Cardiology
              </div>
              <div
                className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed max-w-[260px] border"
                style={{
                  background: "#FFF1F2",
                  borderColor: "#FECDD3",
                  color: "#9F1239",
                }}
              >
                Chest tightness + dizziness needs an ECG. If symptoms worsen —
                call 000, don&apos;t wait.
              </div>
            </div>
          </div>
        )}

        {visible > 0 && visible < 4 && (
          <div className="flex gap-1.5 pl-11">
            {[0, 150, 300].map((d) => (
              <div
                key={d}
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: "#118CFD", animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="px-5 py-3 border-t flex items-center gap-3"
        style={{ borderColor: "#E5E7EB", background: "#ffffff" }}
      >
        <div
          className="flex-1 rounded-xl px-3 py-2.5 font-[family-name:var(--font-mono)] text-xs border"
          style={{
            background: "#F9FAFB",
            borderColor: "#E5E7EB",
            color: "#9CA3AF",
          }}
        >
          Describe your symptoms...
        </div>
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm shadow-sm"
          style={{ background: "linear-gradient(180deg, #56B8FF, #018EF5)" }}
        >
          →
        </button>
      </div>
    </div>
  );
}

const steps = [
  {
    number: "01",
    title: "Describe your symptoms",
    body: "Tell us what you're feeling in plain language. No jargon, no forms, no waiting room.",
    color: "#118CFD",
  },
  {
    number: "02",
    title: "Your AI team consults",
    body: "Eight specialists — GP, cardiologist, mental health, and more — analyse your case simultaneously.",
    color: "#12CA93",
  },
  {
    number: "03",
    title: "Receive clear guidance",
    body: "Urgency assessment, likely explanations, and the exact questions to ask your doctor.",
    color: "#8470BE",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-24 px-6"
      style={{ background: "linear-gradient(25deg, #E1E7EA, #DCD9E7)" }}
    >
      <LandingSectionViewTracker
        sectionId="how-it-works"
        surface="how_it_works"
      />
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 max-w-xl">
          <p
            className="font-[family-name:var(--font-mono)] text-xs tracking-widest uppercase mb-4"
            style={{ color: "#637288" }}
          >
            How It Works
          </p>
          <h2
            className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-tight"
            style={{ color: "#12181B", letterSpacing: "-1px" }}
          >
            From symptoms to clarity{" "}
            <span className="italic" style={{ color: "#12CA93" }}>
              in minutes.
            </span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Steps */}
          <div className="flex flex-col gap-4">
            {steps.map((step, i) => (
              <div
                key={i}
                className="group flex gap-5 items-start rounded-2xl p-6 border transition-all duration-300 hover:shadow-md"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  borderColor: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border"
                  style={{
                    background: `${step.color}15`,
                    borderColor: `${step.color}30`,
                  }}
                >
                  <span
                    className="font-[family-name:var(--font-mono)] text-[10px] font-medium"
                    style={{ color: step.color }}
                  >
                    {step.number}
                  </span>
                </div>
                <div className="pt-0.5">
                  <h3
                    className="font-medium mb-1.5"
                    style={{ color: "#12181B" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#637288" }}
                  >
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat demo */}
          <ChatDemo />
        </div>
      </div>
    </section>
  );
}

// src/components/consult/ProgressSteps.tsx
"use client";

import { SwarmPhase } from "@/agents/swarm-types";

const STEPS: { label: string; phase: SwarmPhase }[] = [
  { label: "Triage", phase: "triage" },
  { label: "Specialists", phase: "swarm" },
  { label: "Residents", phase: "swarm" },
  { label: "Debate", phase: "debate" },
  { label: "Rectification", phase: "rectification" },
  { label: "MDT", phase: "mdt" },
  { label: "Results", phase: "synthesis" },
];

// Maps SwarmPhase to the index of the active step
const PHASE_TO_STEP_INDEX: Record<SwarmPhase, number> = {
  triage: 0,
  swarm: 1,
  debate: 3,
  rectification: 4,
  mdt: 5,
  synthesis: 6,
  complete: 6,
};

interface ProgressStepsProps {
  currentPhase: SwarmPhase | null;
}

export function ProgressSteps({ currentPhase }: ProgressStepsProps) {
  const activeIndex = currentPhase != null ? PHASE_TO_STEP_INDEX[currentPhase] : -1;

  return (
    <div className="flex items-center gap-0 px-4 py-3 bg-white border-b border-gray-100">
      {STEPS.map((step, i) => {
        const isActive = i === activeIndex;
        const isComplete = i < activeIndex;
        const isLast = i === STEPS.length - 1;

        return (
          <div key={step.label} className="flex items-center min-w-0">
            {/* Step pill */}
            <div className="flex items-center gap-1.5">
              {/* Circle indicator */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-colors duration-300 ${
                  isComplete
                    ? "bg-blue-600 text-white"
                    : isActive
                    ? "bg-blue-100 border-2 border-blue-600 text-blue-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {isComplete ? "✓" : i + 1}
              </div>
              {/* Label */}
              <span
                className={`text-xs font-medium whitespace-nowrap transition-colors duration-300 ${
                  isActive
                    ? "text-blue-700"
                    : isComplete
                    ? "text-blue-600"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {!isLast && (
              <div
                className={`h-px mx-2 flex-1 min-w-[12px] transition-colors duration-300 ${
                  isComplete ? "bg-blue-400" : "bg-gray-200"
                }`}
                style={{ width: 16 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

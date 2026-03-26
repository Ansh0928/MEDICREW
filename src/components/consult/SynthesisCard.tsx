"use client";
import { SwarmSynthesis } from "@/agents/swarm-types";
import { UrgencyLevel } from "@/agents/types";

const URGENCY_CONFIG: Record<
  UrgencyLevel,
  { label: string; className: string }
> = {
  emergency: {
    label: "🚨 EMERGENCY — Call 000 immediately",
    className:
      "block w-full text-center bg-red-600 text-white text-lg px-4 py-3 rounded-lg font-bold animate-pulse",
  },
  urgent: {
    label: "Urgent — See doctor today",
    className:
      "bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium",
  },
  routine: {
    label: "Routine — Schedule an appointment",
    className:
      "bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium",
  },
  self_care: {
    label: "Self-care recommended",
    className:
      "bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium",
  },
};

interface Props {
  synthesis: SwarmSynthesis;
  onStartNew: () => void;
}

export function SynthesisCard({ synthesis, onStartNew }: Props) {
  const config = URGENCY_CONFIG[synthesis.urgency];
  const isEmergency = synthesis.urgency === "emergency";
  return (
    <div
      className={`rounded-xl p-6 space-y-4 border-2 ${isEmergency ? "border-red-600 bg-red-950/20" : ""}`}
      role={isEmergency ? "alert" : undefined}
      aria-live={isEmergency ? "assertive" : undefined}
    >
      <span className={config.className}>{config.label}</span>

      <div>
        <h3 className="font-semibold mb-2">Next Steps</h3>
        <ol className="space-y-1">
          {synthesis.nextSteps.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-primary font-medium">{i + 1}.</span> {step}
            </li>
          ))}
        </ol>
      </div>

      {synthesis.questionsForDoctor.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Questions to ask your doctor</h3>
          <ul className="space-y-1">
            {synthesis.questionsForDoctor.map((q, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                • {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t pt-3">
        {synthesis.disclaimer}
      </p>

      <button onClick={onStartNew} className="text-sm text-primary underline">
        Start new consultation
      </button>
    </div>
  );
}

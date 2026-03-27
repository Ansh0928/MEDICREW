// src/components/consult/SynthesisCard.tsx
"use client";
import { SwarmSynthesis } from "@/agents/swarm-types";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";

const urgencyColors: Record<string, string> = {
  emergency: "bg-red-100 text-red-700",
  urgent: "bg-orange-100 text-orange-700",
  routine: "bg-green-100 text-green-700",
  self_care: "bg-blue-100 text-blue-700",
};

interface SynthesisCardProps {
  synthesis: SwarmSynthesis;
  onStartNew?: () => void;
}

export function SynthesisCard({ synthesis, onStartNew }: SynthesisCardProps) {
  const handleShare = async () => {
    const summary = [
      "MediCrew consultation summary",
      `Urgency: ${synthesis.urgency}`,
      `Primary recommendation: ${synthesis.primaryRecommendation}`,
      "",
      "Next steps:",
      ...synthesis.nextSteps.map((step, i) => `${i + 1}. ${step}`),
      "",
      "For medical diagnosis and treatment, follow up with your GP or emergency services.",
    ].join("\n");

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "MediCrew consultation summary",
          text: summary,
        });
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
      }
      trackEvent(ANALYTICS_EVENTS.summaryShared, { channel: "native_or_clipboard", urgency: synthesis.urgency });
    } catch {
      // Sharing is optional and should never block the flow.
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${urgencyColors[synthesis.urgency] ?? "bg-gray-100 text-gray-700"}`}>
          {synthesis.urgency}
        </span>
        <span className="text-sm font-medium text-gray-900">Team Recommendation</span>
      </div>
      <p className="text-sm text-gray-700">{synthesis.primaryRecommendation}</p>
      {synthesis.nextSteps.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
          {synthesis.nextSteps.map((step, i) => <li key={i}>{step}</li>)}
        </ul>
      )}
      {synthesis.bookingNeeded && (
        <p className="text-xs text-blue-600 font-medium">Booking with a healthcare provider is recommended.</p>
      )}
      <p className="text-[10px] text-gray-400">{synthesis.disclaimer}</p>
      {onStartNew && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onStartNew}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            Start new consultation
          </button>
          <button
            onClick={handleShare}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            Share summary with GP/family
          </button>
        </div>
      )}
    </div>
  );
}

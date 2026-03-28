// src/components/consult/SynthesisCard.tsx
"use client";
import { useState } from "react";
import { SwarmSynthesis } from "@/agents/swarm-types";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ClipboardCopy, CheckCheck, Share2, AlertTriangle, ListChecks, ArrowRight } from "lucide-react";

const urgencyColors: Record<string, string> = {
  emergency: "bg-red-100 text-red-700 border-red-200",
  urgent: "bg-orange-100 text-orange-700 border-orange-200",
  routine: "bg-green-100 text-green-700 border-green-200",
  self_care: "bg-blue-100 text-blue-700 border-blue-200",
};

interface SynthesisCardProps {
  synthesis: SwarmSynthesis;
  redFlags?: string[];
  consultationId?: string;
  onStartNew?: () => void;
}

export function SynthesisCard({ synthesis, redFlags, consultationId, onStartNew }: SynthesisCardProps) {
  const [copied, setCopied] = useState(false);

  const summaryText = [
    "MediCrew Consultation Summary",
    `Urgency: ${synthesis.urgency}`,
    "",
    `Assessment: ${synthesis.primaryRecommendation}`,
    ...(redFlags && redFlags.length > 0
      ? ["", "Red Flags:", ...redFlags.map((f) => `• ${f}`)]
      : []),
    "",
    "Next steps:",
    ...synthesis.nextSteps.map((step, i) => `${i + 1}. ${step}`),
    "",
    synthesis.disclaimer,
  ].join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackEvent(ANALYTICS_EVENTS.summaryShared, { channel: "copy", urgency: synthesis.urgency });
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "MediCrew consultation summary", text: summaryText });
      } else {
        await navigator.clipboard.writeText(summaryText);
      }
      trackEvent(ANALYTICS_EVENTS.summaryShared, { channel: "native_or_clipboard", urgency: synthesis.urgency });
    } catch { /* ignore */ }
  };

  const isUrgent = synthesis.urgency === "emergency" || synthesis.urgency === "urgent";

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${
              urgencyColors[synthesis.urgency] ?? "bg-gray-100 text-gray-700 border-gray-200"
            }`}
          >
            {synthesis.urgency.replace("_", " ")}
          </span>
          <span className="text-sm font-semibold text-gray-900">Team Recommendation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100 transition-colors"
            title="Copy summary"
          >
            {copied ? (
              <><CheckCheck className="w-3.5 h-3.5 text-green-500" /> Copied</>
            ) : (
              <><ClipboardCopy className="w-3.5 h-3.5" /> Copy</>
            )}
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100 transition-colors"
            title="Share summary"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Red flags — only show if present */}
        {redFlags && redFlags.length > 0 && (
          <div className={`rounded-md p-3 ${isUrgent ? "bg-red-50 border border-red-100" : "bg-orange-50 border border-orange-100"}`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${isUrgent ? "text-red-500" : "text-orange-500"}`} />
              <span className={`text-xs font-semibold uppercase tracking-wide ${isUrgent ? "text-red-700" : "text-orange-700"}`}>
                Red flags identified
              </span>
            </div>
            <ul className="space-y-0.5">
              {redFlags.map((flag, i) => (
                <li key={i} className={`text-xs flex items-start gap-1.5 ${isUrgent ? "text-red-800" : "text-orange-800"}`}>
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-current flex-shrink-0" />
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Primary recommendation */}
        <p className="text-sm text-gray-700">{synthesis.primaryRecommendation}</p>

        {/* Next steps */}
        {synthesis.nextSteps.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ListChecks className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Next steps</span>
            </div>
            <ol className="space-y-1">
              {synthesis.nextSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {synthesis.bookingNeeded && (
          <p className="text-xs text-blue-600 font-medium">Booking with a healthcare provider is recommended.</p>
        )}

        <p className="text-[10px] text-gray-400 leading-relaxed">{synthesis.disclaimer}</p>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onStartNew && (
            <button
              onClick={onStartNew}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              Start new consultation
            </button>
          )}
          {consultationId && (
            <a
              href={`/doctor/referral/${consultationId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 border border-blue-200 text-blue-700 rounded-md hover:bg-blue-50 transition-colors"
            >
              View referral letter
              <ArrowRight className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

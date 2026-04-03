"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";

const CONSENT_VERSION = "1.0";

interface ConsentStepProps {
  onComplete: () => void;
}

export function ConsentStep({ onComplete }: ConsentStepProps) {
  const [healthData, setHealthData] = useState(false);
  const [aiGuidance, setAiGuidance] = useState(false);
  const [overseasProcessing, setOverseasProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = healthData && aiGuidance && overseasProcessing;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allChecked) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/patient/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consentVersion: CONSENT_VERSION,
          dataCategories: {
            healthDataCollection: healthData,
            aiGuidance: aiGuidance,
            overseasProcessing: overseasProcessing,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to save consent");
      trackEvent(ANALYTICS_EVENTS.onboardingStepCompleted, { step: "consent" });
      onComplete();
    } catch {
      setError("Failed to save your consent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="mb-6 text-sm text-muted-foreground">
        Before using Medicrew, please review and consent to the following. This
        is required under the Australian Privacy Act 1988.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={healthData}
            onChange={(e) => setHealthData(e.target.checked)}
            className="mt-1"
          />
          <div>
            <p className="font-medium">Health Data Collection</p>
            <p className="text-sm text-muted-foreground">
              I consent to Medicrew collecting and storing my health information
              including symptoms, consultation history, and health profile data
              to provide AI-assisted health guidance.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={aiGuidance}
            onChange={(e) => setAiGuidance(e.target.checked)}
            className="mt-1"
          />
          <div>
            <p className="font-medium">AI Health Guidance</p>
            <p className="text-sm text-muted-foreground">
              I understand that Medicrew uses AI agents to provide health
              information and navigation. This is not medical diagnosis or
              treatment. I should always consult a registered healthcare
              professional for medical concerns.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={overseasProcessing}
            onChange={(e) => setOverseasProcessing(e.target.checked)}
            className="mt-1"
          />
          <div>
            <p className="font-medium">Overseas Data Processing</p>
            <p className="text-sm text-muted-foreground">
              I consent to my health information being processed by AI language
              model providers (such as Groq and OpenAI) whose servers may be
              located outside Australia. Medicrew stores all data in Sydney
              (ap-southeast-2) but AI processing may occur overseas.
            </p>
          </div>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          disabled={!allChecked || submitting}
          className="w-full"
        >
          {submitting ? "Saving..." : "I Consent — Continue"}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Consent version {CONSENT_VERSION}. You can withdraw consent and
          request data deletion at any time from your profile settings.
        </p>
      </form>
    </div>
  );
}

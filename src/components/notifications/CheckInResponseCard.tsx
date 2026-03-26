"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface CheckInResponseCardProps {
  checkInId: string;
  notificationId: string;
  message: string;
  createdAt: string;
  onResponded: () => void;
}

type ResponseOption = "better" | "same" | "worse";

interface EscalationResult {
  escalated: boolean;
  urgencyTier: string | null;
  emergency: boolean;
}

export function CheckInResponseCard({
  checkInId,
  message,
  createdAt,
  onResponded,
}: CheckInResponseCardProps) {
  const [response, setResponse] = useState<ResponseOption | null>(null);
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<EscalationResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!response) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const patientId =
        typeof window !== "undefined" ? localStorage.getItem("patientId") : null;
      const res = await fetch("/api/checkin/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(patientId ? { "x-patient-id": patientId } : {}),
        },
        body: JSON.stringify({ checkInId, response, freeText }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit response");
      }

      const data = await res.json();
      setResult(data.escalation);
      setSubmitted(true);
      onResponded();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const responseStyles: Record<ResponseOption, { border: string; bg: string; label: string }> = {
    better: { border: "border-green-500", bg: "bg-green-50 dark:bg-green-950/30", label: "Better" },
    same: { border: "border-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950/30", label: "Same" },
    worse: { border: "border-red-500", bg: "bg-red-50 dark:bg-red-950/30", label: "Worse" },
  };

  if (submitted && result) {
    return (
      <Card className={`p-4 border-l-4 ${result.emergency ? "border-l-red-600 bg-red-50 dark:bg-red-950/20" : result.escalated ? "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20" : "border-l-green-500 bg-green-50 dark:bg-green-950/20"}`}>
        <div className="flex items-start gap-3">
          {result.emergency ? (
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          )}
          <div className="space-y-1">
            {result.emergency ? (
              <>
                <p className="font-semibold text-red-700">Emergency Alert</p>
                <p className="text-sm text-red-600">
                  This sounds like a medical emergency. Please call 000 immediately or go to your nearest emergency department.
                </p>
              </>
            ) : result.escalated ? (
              <>
                <p className="font-semibold text-orange-700">Your care team has been notified</p>
                <p className="text-sm text-orange-600">
                  A specialist will review your case and follow up with you.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-green-700">Response recorded</p>
                <p className="text-sm text-green-600">
                  Thank you for checking in. Your care team will continue to monitor your progress.
                </p>
              </>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          Check-in from your care team
          <Badge variant="default" className="text-xs ml-auto">Action required</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(createdAt).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        <div>
          <p className="text-sm font-medium mb-2">How are you feeling?</p>
          <div className="flex gap-2">
            {(["better", "same", "worse"] as ResponseOption[]).map((option) => {
              const styles = responseStyles[option];
              const isSelected = response === option;
              return (
                <Button
                  key={option}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={isSelected ? `${styles.bg} ${styles.border} border-2` : ""}
                  onClick={() => setResponse(option)}
                >
                  {styles.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Anything else to share? (optional)</p>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none h-20"
            placeholder="Describe how you're feeling in more detail..."
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
          />
        </div>

        {submitError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            {submitError}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!response || submitting}
          className="w-full"
        >
          {submitting ? "Submitting..." : "Submit Response"}
        </Button>
      </CardContent>
    </Card>
  );
}

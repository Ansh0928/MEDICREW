"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Clock, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CareRecommendation {
  urgency?: string;
  summary?: string;
  primaryRecommendation?: string;
  nextSteps?: string[];
  specialistType?: string;
  timeframe?: string;
}

interface ConsultationEntry {
  id: string;
  symptoms: string;
  urgencyLevel: string | null;
  recommendation: CareRecommendation | null | unknown;
  createdAt: string;
}

interface ConsultationHistoryListProps {
  consultations: ConsultationEntry[];
}

const urgencyConfig: Record<
  string,
  {
    label: string;
    variant: "destructive" | "default" | "secondary" | "outline";
  }
> = {
  emergency: { label: "Emergency", variant: "destructive" },
  urgent: { label: "Urgent", variant: "default" },
  routine: { label: "Routine", variant: "secondary" },
  self_care: { label: "Self-Care", variant: "outline" },
};

function extractRecommendation(
  rec: ConsultationEntry["recommendation"],
): CareRecommendation | null {
  if (!rec || typeof rec !== "object") return null;
  return rec as CareRecommendation;
}

export function ConsultationHistoryList({
  consultations,
}: ConsultationHistoryListProps) {
  if (consultations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No consultations yet</p>
        <Link href="/consult">
          <Button className="mt-4">Start Your First Consultation</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {consultations.map((consultation) => {
        const urgency = consultation.urgencyLevel ?? "routine";
        const config = urgencyConfig[urgency] ?? urgencyConfig.routine;
        const rec = extractRecommendation(consultation.recommendation);

        const snippet = rec?.primaryRecommendation ?? rec?.summary;

        return (
          <Link
            key={consultation.id}
            href={`/patient/consultation/${consultation.id}`}
            className="block group"
          >
            <Card className="p-4 bg-muted/30 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {consultation.symptoms.substring(0, 100)}
                    {consultation.symptoms.length > 100 && "…"}
                  </p>

                  {snippet && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {snippet}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(consultation.createdAt).toLocaleDateString(
                      "en-AU",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={config.variant}>{config.label}</Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

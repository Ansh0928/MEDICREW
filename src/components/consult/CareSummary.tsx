import { AHPRA_DISCLAIMER } from "@/lib/compliance";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CareRecommendation {
  urgency: string;
  summary: string;
  nextSteps: string[];
  questionsForDoctor: string[];
  specialistType?: string;
  timeframe: string;
  disclaimer: string;
}

const urgencyVariants: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  emergency: "destructive",
  urgent: "default",
  routine: "secondary",
  self_care: "outline",
};

const urgencyLabels: Record<string, string> = {
  emergency: "Emergency",
  urgent: "Urgent",
  routine: "Routine",
  self_care: "Self Care",
};

export function CareSummary({ recommendation }: { recommendation: CareRecommendation }) {
  const urgencyVariant = urgencyVariants[recommendation.urgency] ?? "secondary";
  const urgencyLabel = urgencyLabels[recommendation.urgency] ?? recommendation.urgency;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Care Summary
          <Badge variant={urgencyVariant}>
            {urgencyLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{recommendation.summary}</p>

        {recommendation.nextSteps.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-1">Next Steps</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {recommendation.nextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        )}

        {recommendation.questionsForDoctor.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-1">Questions for Your Doctor</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {recommendation.questionsForDoctor.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}

        {recommendation.timeframe && (
          <p className="text-sm">
            <span className="font-medium">See a healthcare professional:</span>{" "}
            {recommendation.timeframe}
          </p>
        )}

        {recommendation.specialistType && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Specialist type:</span>{" "}
            {recommendation.specialistType}
          </p>
        )}

        <p className="text-xs text-muted-foreground border-t pt-3 mt-3">
          {AHPRA_DISCLAIMER}
        </p>
      </CardContent>
    </Card>
  );
}

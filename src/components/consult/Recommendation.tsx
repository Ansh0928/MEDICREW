"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CareRecommendation, UrgencyLevel } from "@/agents/types";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Heart,
  ArrowRight,
  MessageCircle,
} from "lucide-react";

interface RecommendationProps {
  recommendation: CareRecommendation;
  onStartNew: () => void;
}

const urgencyConfig: Record<
  UrgencyLevel,
  { color: string; icon: React.ReactNode; label: string; bgColor: string }
> = {
  emergency: {
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    icon: <AlertTriangle className="w-5 h-5" />,
    label: "Emergency - Call 000",
  },
  urgent: {
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
    icon: <Clock className="w-5 h-5" />,
    label: "Urgent",
  },
  routine: {
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    icon: <CheckCircle className="w-5 h-5" />,
    label: "Routine",
  },
  self_care: {
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
    icon: <Heart className="w-5 h-5" />,
    label: "Self Care",
  },
};

export function Recommendation({ recommendation, onStartNew }: RecommendationProps) {
  const config = urgencyConfig[recommendation.urgency];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Urgency Banner */}
      <Card className={`p-4 ${config.bgColor}`}>
        <div className="flex items-center gap-3">
          <div className={config.color}>{config.icon}</div>
          <div>
            <Badge
              variant="outline"
              className={`${config.color} border-current`}
            >
              {config.label}
            </Badge>
            <p className="text-sm mt-1 text-foreground">
              {recommendation.timeframe}
            </p>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <span className="text-2xl">📋</span>
          Summary
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {recommendation.summary}
        </p>
      </Card>

      {/* Next Steps */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-primary" />
          Recommended Next Steps
        </h3>
        <ul className="space-y-2">
          {recommendation.nextSteps.map((step, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-2"
            >
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                {index + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </motion.li>
          ))}
        </ul>
      </Card>

      {/* Questions for Doctor */}
      {recommendation.questionsForDoctor.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Questions to Ask Your Doctor
          </h3>
          <ul className="space-y-2">
            {recommendation.questionsForDoctor.map((question, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-muted-foreground"
              >
                <span className="text-primary">•</span>
                {question}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Disclaimer */}
      <Card className="p-4 bg-muted/50">
        <p className="text-xs text-muted-foreground leading-relaxed">
          ⚠️ {recommendation.disclaimer}
        </p>
      </Card>

      {/* Start New Button */}
      <Button onClick={onStartNew} variant="outline" className="w-full">
        Start New Consultation
      </Button>
    </motion.div>
  );
}

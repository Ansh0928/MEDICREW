"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Activity, AlertCircle } from "lucide-react";

interface CarePlanData {
  monitoringStatus: "active" | "inactive";
  nextCheckIn: {
    scheduledFor: string;
    status: string;
  } | null;
  latestConsultation: {
    urgencyLevel: string | null;
    createdAt: string;
  } | null;
  actionItems: string[];
  recentCheckIns: Array<{
    status: string;
    response: string | null;
    respondedAt: string | null;
  }>;
  lastAgentActivity: {
    agentName: string;
    message: string;
    updatedAt: string;
  } | null;
}

interface CarePlanDetailProps {
  patientId: string;
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatAuDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Australia/Sydney",
  });
}

function getResponseColor(response: string | null): string {
  if (response === "better") return "text-green-600";
  if (response === "worse") return "text-red-600";
  return "text-yellow-600";
}

function getResponseBadgeVariant(
  response: string | null
): "default" | "secondary" | "destructive" | "outline" {
  if (response === "better") return "default";
  if (response === "worse") return "destructive";
  return "secondary";
}

export function CarePlanDetail({ patientId }: CarePlanDetailProps) {
  const [carePlan, setCarePlan] = useState<CarePlanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCarePlan = async () => {
      try {
        const res = await fetch("/api/patient/care-plan", {
          headers: { "x-patient-id": patientId },
        });
        if (res.ok) {
          const data = await res.json();
          setCarePlan(data);
        }
      } catch {
        console.error("Failed to load care plan");
      } finally {
        setLoading(false);
      }
    };

    fetchCarePlan();
  }, [patientId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!carePlan?.latestConsultation) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Start a consultation to begin your care plan</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">

      {/* Monitoring Status Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Monitoring Status
            </CardTitle>
            <Badge
              variant={
                carePlan.monitoringStatus === "active" ? "default" : "secondary"
              }
            >
              {carePlan.monitoringStatus === "active"
                ? "Active Monitoring"
                : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {carePlan.monitoringStatus === "active" ? (
            <p className="text-sm text-muted-foreground">
              Your care team is actively monitoring your health
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active monitoring at this time
            </p>
          )}
          {carePlan.lastAgentActivity && (
            <p className="text-xs text-muted-foreground mt-2">
              <span className="font-medium">
                {carePlan.lastAgentActivity.agentName}:
              </span>{" "}
              {carePlan.lastAgentActivity.message}{" "}
              <span className="opacity-60">
                &middot; {formatRelativeTime(carePlan.lastAgentActivity.updatedAt)}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Next Check-in Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Next Check-in
          </CardTitle>
        </CardHeader>
        <CardContent>
          {carePlan.nextCheckIn ? (
            <>
              <p className="text-sm font-medium">
                Scheduled for{" "}
                {formatAuDate(carePlan.nextCheckIn.scheduledFor)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Your care team will check in with you
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No check-ins currently scheduled
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action Items Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Action Items from Your Last Consultation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {carePlan.actionItems.length > 0 ? (
            <ul className="space-y-2">
              {carePlan.actionItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No current action items
            </p>
          )}
          {carePlan.latestConsultation && (
            <div className="mt-3 flex items-center gap-2">
              {carePlan.latestConsultation.urgencyLevel && (
                <Badge variant="outline" className="text-xs capitalize">
                  {carePlan.latestConsultation.urgencyLevel.replace("_", " ")}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(carePlan.latestConsultation.createdAt)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Check-in History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Check-in History</CardTitle>
        </CardHeader>
        <CardContent>
          {carePlan.recentCheckIns.length > 0 ? (
            <ul className="space-y-2">
              {carePlan.recentCheckIns.map((checkIn, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 text-sm"
                >
                  <Badge variant="outline" className="text-xs capitalize">
                    {checkIn.status}
                  </Badge>
                  {checkIn.response && (
                    <Badge
                      variant={getResponseBadgeVariant(checkIn.response)}
                      className={`text-xs capitalize ${getResponseColor(checkIn.response)}`}
                    >
                      {checkIn.response}
                    </Badge>
                  )}
                  {checkIn.respondedAt && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatRelativeTime(checkIn.respondedAt)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No check-in history yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* AHPRA Disclaimer */}
      <p className="text-xs text-muted-foreground text-center px-4">
        This care plan summary is for informational purposes only and does not
        constitute a medical diagnosis or treatment plan.
      </p>

    </div>
  );
}

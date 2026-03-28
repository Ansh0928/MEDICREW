"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, Activity, AlertCircle, ExternalLink, ChevronRight } from "lucide-react";
import Link from "next/link";

interface CarePlanData {
  monitoringStatus: "active" | "inactive";
  nextCheckIn: {
    id: string;
    scheduledFor: string;
    status: string;
  } | null;
  latestConsultation: {
    id: string;
    urgencyLevel: string | null;
    createdAt: string;
    primaryRecommendation: string | null;
    bookingNeeded: boolean;
  } | null;
  actionItems: string[];
  recentCheckIns: Array<{
    id: string;
    status: string;
    response: string | null;
    respondedAt: string | null;
    createdAt: string;
  }>;
  lastAgentActivity: {
    agentName: string;
    message: string;
    updatedAt: string;
  } | null;
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

const RESPONSE_OPTIONS: { value: "better" | "same" | "worse"; label: string; color: string }[] = [
  { value: "better", label: "Better", color: "bg-green-100 text-green-700 hover:bg-green-200 border-green-300" },
  { value: "same", label: "Same", color: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300" },
  { value: "worse", label: "Worse", color: "bg-red-100 text-red-700 hover:bg-red-200 border-red-300" },
];

export function CarePlanDetail() {
  const [carePlan, setCarePlan] = useState<CarePlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const fetchCarePlan = useCallback(async () => {
    try {
      const res = await fetch("/api/patient/care-plan");
      if (res.ok) {
        const data = await res.json();
        setCarePlan(data);
      }
    } catch {
      console.error("Failed to load care plan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCarePlan();
  }, [fetchCarePlan]);

  const handleCheckInResponse = async (checkInId: string, response: "better" | "same" | "worse") => {
    setRespondingId(checkInId);
    try {
      const res = await fetch("/api/checkin/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkInId, response }),
      });
      if (res.ok) {
        await fetchCarePlan();
      }
    } catch {
      console.error("Failed to submit check-in response");
    } finally {
      setRespondingId(null);
    }
  };

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
            <p className="text-sm mb-4">Start a consultation to begin your care plan</p>
            <Link
              href="/consult"
              className="inline-flex rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Start Your First Consultation
            </Link>
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
          {carePlan.nextCheckIn ? (() => {
            const isPast = new Date(carePlan.nextCheckIn!.scheduledFor) <= new Date();
            return (
              <>
                <p className="text-sm font-medium">
                  {isPast ? "Your care team is checking in:" : `Scheduled for ${formatAuDate(carePlan.nextCheckIn!.scheduledFor)}`}
                </p>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  {isPast ? "How are your symptoms compared to your last consultation?" : "Your care team will check in with you"}
                </p>
                {isPast && (
                  <div className="flex gap-2 flex-wrap">
                    {RESPONSE_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant="outline"
                        size="sm"
                        disabled={respondingId === carePlan.nextCheckIn!.id}
                        onClick={() => handleCheckInResponse(carePlan.nextCheckIn!.id, opt.value)}
                        className={`text-xs border ${opt.color}`}
                      >
                        {respondingId === carePlan.nextCheckIn!.id ? "Saving…" : opt.label}
                      </Button>
                    ))}
                  </div>
                )}
              </>
            );
          })() : (
            <p className="text-sm text-muted-foreground">
              No check-ins currently scheduled
            </p>
          )}
        </CardContent>
      </Card>

      {/* Care Team Assessment */}
      {carePlan.latestConsultation?.primaryRecommendation && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Care Team Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{carePlan.latestConsultation.primaryRecommendation}</p>
            <Link
              href={`/patient/consultation/${carePlan.latestConsultation.id}`}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
            >
              View full summary <ChevronRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Book a GP CTA */}
      {carePlan.latestConsultation?.bookingNeeded && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm font-medium text-blue-800 mb-2">
              Your care team recommends seeing a GP.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://www.hotdoc.com.au"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Book via HotDoc <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://www.healthengine.com.au"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                HealthEngine <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}

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
            <ul className="space-y-3">
              {carePlan.recentCheckIns.map((checkIn) => (
                <li key={checkIn.id} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
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
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatRelativeTime(checkIn.respondedAt ?? checkIn.createdAt)}
                    </span>
                  </div>
                  {checkIn.status === "pending" && (
                    <div className="flex gap-2 flex-wrap mt-1.5">
                      {RESPONSE_OPTIONS.map((opt) => (
                        <Button
                          key={opt.value}
                          variant="outline"
                          size="sm"
                          disabled={respondingId === checkIn.id}
                          onClick={() => handleCheckInResponse(checkIn.id, opt.value)}
                          className={`text-xs border ${opt.color}`}
                        >
                          {respondingId === checkIn.id ? "Saving…" : opt.label}
                        </Button>
                      ))}
                    </div>
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

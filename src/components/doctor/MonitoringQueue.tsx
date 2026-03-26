"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, User, Activity, TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";

interface MonitoringPatient {
  id: string;
  name: string;
  email: string;
  knownConditions: string | null;
  lastCheckIn: {
    status: string;
    response: string | null;
    respondedAt: string | null;
    createdAt: string;
  } | null;
  lastConsultation: {
    urgencyLevel: string | null;
    symptoms: string | null;
    createdAt: string;
  } | null;
  effectiveUrgency: string;
  urgencyTrend: "improving" | "stable" | "worsening" | "insufficient_data";
  lastAgentActivity: {
    agentName: string;
    message: string;
    updatedAt: string;
  } | null;
}

const URGENCY_BADGE: Record<string, { variant: "destructive" | "default" | "secondary" | "outline"; label: string }> = {
  emergency: { variant: "destructive", label: "Emergency" },
  urgent: { variant: "default", label: "Urgent" },
  routine: { variant: "secondary", label: "Routine" },
  self_care: { variant: "outline", label: "Self Care" },
};

const RESPONSE_COLOR: Record<string, string> = {
  better: "text-green-600",
  same: "text-yellow-600",
  worse: "text-red-600",
};

const TREND_INDICATOR: Record<string, { icon: LucideIcon; label: string; className: string }> = {
  improving: { icon: TrendingUp, label: "Improving", className: "text-green-600" },
  stable: { icon: Minus, label: "Stable", className: "text-yellow-600" },
  worsening: { icon: TrendingDown, label: "Worsening", className: "text-red-600" },
  insufficient_data: { icon: Minus, label: "Not enough data", className: "text-muted-foreground" },
};

export function MonitoringQueue() {
  const [patients, setPatients] = useState<MonitoringPatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/doctor/monitoring")
      .then((res) => res.json())
      .then((data) => {
        setPatients(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="w-8 h-8 mx-auto mb-3 opacity-50 animate-pulse" />
        <p>Loading monitoring queue...</p>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No active patients in the monitoring queue</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {patients.length} patient{patients.length !== 1 ? "s" : ""} — sorted by urgency
      </p>
      {patients.map((patient) => {
        const urgencyInfo = URGENCY_BADGE[patient.effectiveUrgency] ?? { variant: "outline" as const, label: patient.effectiveUrgency };
        const trendInfo = TREND_INDICATOR[patient.urgencyTrend] ?? TREND_INDICATOR.insufficient_data;
        const TrendIcon = trendInfo.icon;
        return (
          <Card key={patient.id} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Patient Info */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{patient.name}</span>
                </div>
                {patient.knownConditions && (
                  <p className="text-xs text-muted-foreground">{patient.knownConditions}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{patient.email}</p>
                <div className="mt-2">
                  <Badge variant={urgencyInfo.variant} className="text-xs">
                    {urgencyInfo.variant === "destructive" && (
                      <AlertCircle className="w-3 h-3 mr-1" />
                    )}
                    {urgencyInfo.label}
                  </Badge>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendIcon className={`w-4 h-4 ${trendInfo.className}`} />
                    <span className={`text-xs ${trendInfo.className}`}>{trendInfo.label}</span>
                  </div>
                </div>
              </div>

              {/* Last Check-in */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Last Check-in</p>
                {patient.lastCheckIn ? (
                  <>
                    <p className="text-sm capitalize">{patient.lastCheckIn.status}</p>
                    {patient.lastCheckIn.response && (
                      <p className={`text-sm font-medium capitalize ${RESPONSE_COLOR[patient.lastCheckIn.response] ?? ""}`}>
                        {patient.lastCheckIn.response}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(patient.lastCheckIn.createdAt).toLocaleDateString("en-AU")}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No check-ins yet</p>
                )}
              </div>

              {/* Last Consultation */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Last Consultation</p>
                {patient.lastConsultation ? (
                  <>
                    {patient.lastConsultation.symptoms && (
                      <p className="text-sm line-clamp-2">{patient.lastConsultation.symptoms}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(patient.lastConsultation.createdAt).toLocaleDateString("en-AU")}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No consultations yet</p>
                )}
              </div>

              {/* Last Agent Activity */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Last Agent Activity</p>
                {patient.lastAgentActivity ? (
                  <>
                    <p className="text-xs font-medium text-blue-600">{patient.lastAgentActivity.agentName}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{patient.lastAgentActivity.message}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(patient.lastAgentActivity.updatedAt).toLocaleDateString("en-AU")}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No agent activity</p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

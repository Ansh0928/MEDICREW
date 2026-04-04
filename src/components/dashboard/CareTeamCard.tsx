"use client";

import { useState, useEffect } from "react";
import { CARE_TEAM } from "@/lib/care-team-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AgentStatus {
  agentName: string;
  message: string;
  updatedAt: string;
}

interface CareTeamCardProps {
  patientId: string;
  initialStatuses: Record<string, AgentStatus>;
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

export function CareTeamCard({
  patientId: _patientId,
  initialStatuses,
}: CareTeamCardProps) {
  const [statuses, setStatuses] =
    useState<Record<string, AgentStatus>>(initialStatuses);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await fetch("/api/patient/care-team-status");
        if (!res.ok) return;
        const data = await res.json();
        if (data.statuses) {
          setStatuses(data.statuses as Record<string, AgentStatus>);
        }
      } catch {
        // Silently ignore fetch errors — stale data is acceptable
      }
    };

    const intervalId = setInterval(fetchStatuses, 30_000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Filter out triage from the care team display
  const displayTeam = CARE_TEAM.filter((member) => member.role !== "triage");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Care Team</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayTeam.map((member) => {
          const status = statuses[member.role];
          return (
            <Card
              key={member.role}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <span
                    className="text-3xl"
                    role="img"
                    aria-label={member.specialty}
                  >
                    {member.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold leading-tight">
                      {member.name}
                    </CardTitle>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {member.specialty}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {status?.message ?? "No recent activity"}
                </p>
                {status?.updatedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatRelativeTime(status.updatedAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

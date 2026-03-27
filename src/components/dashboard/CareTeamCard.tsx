"use client";

import { useState, useEffect } from "react";
import { CARE_TEAM } from "@/lib/care-team-config";
import { createSupabaseBrowser } from "@/lib/supabase/client";
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

export function CareTeamCard({ patientId, initialStatuses }: CareTeamCardProps) {
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>(initialStatuses);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    if (!supabase) return; // Supabase not configured — skip realtime subscription

    const channel = supabase
      .channel(`care-status-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "CareTeamStatus",
          filter: `patientId=eq.${patientId}`,
        },
        (payload) => {
          if (
            payload.new &&
            typeof payload.new === "object" &&
            "statuses" in payload.new
          ) {
            setStatuses(payload.new.statuses as Record<string, AgentStatus>);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId]);

  // Filter out triage from the care team display
  const displayTeam = CARE_TEAM.filter((member) => member.role !== "triage");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Care Team</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayTeam.map((member) => {
          const status = statuses[member.role];
          return (
            <Card key={member.role} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <span className="text-3xl" role="img" aria-label={member.specialty}>
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

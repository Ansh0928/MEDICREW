"use client";
import { CARE_TEAM } from "@/lib/care-team-config";
import { Badge } from "@/components/ui/badge";

interface AgentOverlayProps {
  agentName?: string;
  agentRole?: string;
  specialty?: string;
  isStreaming: boolean;
}

export function AgentOverlay({
  agentName,
  agentRole,
  specialty,
  isStreaming,
}: AgentOverlayProps) {
  if (!agentName || !isStreaming) return null;

  const agent = CARE_TEAM.find((a) => a.role === agentRole);
  const emoji = agent?.emoji || "";

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 mb-2 animate-in fade-in">
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="font-medium text-sm">{agentName}</p>
        {specialty && (
          <Badge variant="secondary" className="text-xs">
            {specialty}
          </Badge>
        )}
      </div>
      <span className="ml-auto text-xs text-muted-foreground animate-pulse">
        Speaking...
      </span>
    </div>
  );
}

export function RoutingNotice({ specialists }: { specialists: string[] }) {
  if (specialists.length === 0) return null;

  return (
    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 mb-3">
      <p className="text-sm font-medium">Your care team is reviewing:</p>
      <ul className="mt-1 space-y-1">
        {specialists.map((name) => (
          <li
            key={name}
            className="text-sm text-muted-foreground flex items-center gap-1"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

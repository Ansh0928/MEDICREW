"use client";

import { SwarmState, SwarmLeadState } from "@/agents/swarm-types";
import { agentRegistry } from "@/agents/definitions";
import { AgentRole } from "@/agents/types";

interface SwarmDebugPanelProps {
  state: Partial<SwarmState>;
}

function LeadSwarmCard({ role, swarm }: { role: AgentRole; swarm: SwarmLeadState }) {
  const agent = agentRegistry[role];
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">
          {agent?.emoji} {agent?.name}
        </div>
        <span className="text-xs text-muted-foreground capitalize px-1.5 py-0.5 bg-muted rounded">
          {swarm.status}
        </span>
      </div>
      {swarm.hypotheses.map((h) => (
        <div key={h.id} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="truncate max-w-[180px]">{h.name}</span>
            <span className="text-muted-foreground ml-2 shrink-0">{h.confidence}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${h.confidence}%` }}
            />
          </div>
        </div>
      ))}
      {swarm.hypotheses.length === 0 && (
        <p className="text-xs text-muted-foreground">No hypotheses yet</p>
      )}
    </div>
  );
}

export function SwarmDebugPanel({ state }: SwarmDebugPanelProps) {
  const leadSwarms = state.leadSwarms ?? {};
  const mdtMessages = state.mdtMessages ?? [];

  return (
    <div className="space-y-4 text-sm font-mono overflow-y-auto">
      {/* Phase indicator */}
      {state.currentPhase && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-b pb-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Phase: <span className="text-foreground capitalize">{state.currentPhase}</span>
        </div>
      )}

      {/* Lead swarms with hypothesis bars */}
      {Object.entries(leadSwarms).map(([role, swarm]) =>
        swarm ? (
          <LeadSwarmCard key={role} role={role as AgentRole} swarm={swarm} />
        ) : null
      )}

      {Object.keys(leadSwarms).length === 0 && (
        <p className="text-xs text-muted-foreground">Awaiting swarm data...</p>
      )}

      {/* MDT debate transcript */}
      {mdtMessages.length > 0 && (
        <div className="border rounded-lg p-3 space-y-2">
          <div className="font-semibold text-sm">💬 MDT Debate</div>
          {mdtMessages.map((msg, i) => (
            <div key={i} className="text-xs space-y-0.5">
              <span className="text-primary font-medium">
                {agentRegistry[msg.doctorRole]?.name ?? msg.doctorRole}
              </span>
              <span className="text-muted-foreground capitalize"> [{msg.type}]</span>
              <p className="text-foreground pl-2 border-l border-muted">{msg.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";
import { SwarmState } from "@/agents/swarm-types";
import { agentRegistry } from "@/agents/definitions";

export function SwarmDebugPanel({ state }: { state: Partial<SwarmState> }) {
  if (!state.doctorSwarms) return null;

  return (
    <div className="space-y-4 text-sm font-mono">
      {Object.entries(state.doctorSwarms).map(([role, swarm]) => {
        const agent = agentRegistry[role as keyof typeof agentRegistry];
        return (
          <div key={role} className="border rounded-lg p-3 space-y-2">
            <div className="font-semibold">{(agent as any)?.emoji} {agent?.name}</div>
            {swarm?.hypotheses.map((h) => (
              <div key={h.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{h.name}</span>
                  <span className="text-muted-foreground">{h.confidence}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${h.confidence}%` }} />
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {(state.debate?.length ?? 0) > 0 && (
        <div className="border rounded-lg p-3 space-y-2">
          <div className="font-semibold">Team Debate</div>
          {state.debate!.map((d, i) => (
            <div key={i} className="text-xs">
              <span className="text-primary">{agentRegistry[d.doctorRole]?.name}</span>
              <span className="text-muted-foreground"> ({d.type}): </span>
              {d.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

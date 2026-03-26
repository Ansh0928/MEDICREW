"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { AgentNode, AgentState } from "./AgentNode";
import { HuddleConnections, HuddleConnection } from "./HuddleConnections";
import { HuddleChatPanel, ChatMessage } from "./HuddleChatPanel";
import { FollowUpBar } from "./FollowUpBar";
import { RoutingChip } from "./RoutingChip";
import { SynthesisCard } from "./SynthesisCard";
import { SwarmEvent, SwarmSynthesis } from "@/agents/swarm-types";

// ── Agent display names ───────────────────────────────────────────────────────

const residentNames: Record<string, string> = {
  conservative: "Kai",
  pharmacological: "Priya",
  investigative: "Zoe",
  "red-flag": "Sam",
};

const leadNames: Record<string, string> = {
  gp: "Alex AI",
  cardiology: "Jordan AI",
  mental_health: "Maya AI",
  dermatology: "Derma AI",
  orthopedic: "Ortho AI",
  gastro: "Gastro AI",
  physiotherapy: "Emma AI",
};

function getAgentDisplayName(role: string): string {
  return residentNames[role] ?? leadNames[role] ?? role;
}

// ── Geometry ─────────────────────────────────────────────────────────────────

export interface AgentPosition {
  x: number;
  y: number;
  isCenter: boolean;
}

/**
 * Computes pixel offsets (from container centre) for all agents.
 * Primary lead is at (0,0); all others evenly spaced on a circle.
 * Exported for testing.
 */
export function computeAgentPositions(
  primaryLeadRoles: string[],
  allRoles: string[],
  baseRadius: number
): Record<string, AgentPosition> {
  const primaryLead = primaryLeadRoles[0] ?? allRoles[0];
  const outer = allRoles.filter((r) => r !== primaryLead);
  const radius = outer.length > 10 ? 200 : baseRadius;
  const positions: Record<string, AgentPosition> = {};

  positions[primaryLead] = { x: 0, y: 0, isCenter: true };

  outer.forEach((role, i) => {
    const angle = (2 * Math.PI * i) / outer.length - Math.PI / 2;
    positions[role] = {
      x: Math.round(radius * Math.cos(angle)),
      y: Math.round(radius * Math.sin(angle)),
      isCenter: false,
    };
  });

  return positions;
}

// ── HuddleRoom ────────────────────────────────────────────────────────────────

interface AgentVisualState {
  role: string;
  state: AgentState;
  bubbleText?: string;
}

interface PatientInfo {
  age: string;
  gender: string;
  knownConditions?: string;
}

interface HuddleRoomProps {
  symptoms: string;
  patientInfo: PatientInfo;
  onReset?: () => void;
}

export function HuddleRoom({ symptoms, patientInfo }: HuddleRoomProps) {
  const [agents, setAgents] = useState<Record<string, AgentVisualState>>({});
  const [connections, setConnections] = useState<HuddleConnection[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [synthesis, setSynthesis] = useState<SwarmSynthesis | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [followupRouting, setFollowupRouting] = useState<{ type: "simple" | "complex"; roles: string[] } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // positionsRef holds the latest computed positions so handleEvent (memoised) can read them
  const positionsRef = useRef<Record<string, AgentPosition>>({});

  const RADIUS = 160;

  const updateAgent = useCallback((role: string, state: AgentState, bubbleText?: string) => {
    setAgents((prev) => ({
      ...prev,
      [role]: { role, state, bubbleText },
    }));
  }, []);

  const addChatMessage = useCallback((agentName: string, content: string, type: ChatMessage["type"], messageType?: ChatMessage["messageType"]) => {
    setChatMessages((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), agentName, content, type, messageType },
    ]);
  }, []);

  const handleEvent = useCallback((event: SwarmEvent) => {
    switch (event.type) {
      case "doctor_activated":
        updateAgent(event.role, "active");
        break;

      case "hypothesis_found":
        updateAgent(event.residentRole, "speaking", `${event.name} (${event.confidence}%)`);
        addChatMessage(
          residentNames[event.residentRole] ?? event.residentRole,
          `${event.name} — confidence ${event.confidence}%`,
          "hypothesis",
        );
        break;

      case "debate_message": {
        updateAgent(event.residentRole, "speaking", event.content.slice(0, 60));
        addChatMessage(
          residentNames[event.residentRole] ?? event.residentRole,
          event.content,
          "debate",
          event.messageType as ChatMessage["messageType"],
        );
        if (event.referencingHypothesisId && positionsRef.current) {
          const fromPos = positionsRef.current[event.residentRole];
          const toPos = positionsRef.current[event.role];
          if (fromPos && toPos) {
            setConnections((prev) => [
              ...prev,
              {
                id: Math.random().toString(36).slice(2),
                fromX: fromPos.x, fromY: fromPos.y,
                toX: toPos.x, toY: toPos.y,
                type: event.messageType as HuddleConnection["type"],
              },
            ]);
          }
        }
        break;
      }

      case "rectification_complete":
        updateAgent(event.role, "done");
        addChatMessage(getAgentDisplayName(event.role), event.summary, "rectification");
        break;

      case "mdt_message":
        addChatMessage(getAgentDisplayName(event.role), event.content, "mdt", event.messageType as ChatMessage["messageType"]);
        break;

      case "doctor_complete":
        updateAgent(event.role, "done");
        break;

      case "synthesis_complete":
        setSynthesis(event.data);
        setAgents((prev) =>
          Object.fromEntries(
            Object.entries(prev).map(([r, a]) => [r, { ...a, state: "done" as AgentState, bubbleText: undefined }])
          )
        );
        break;

      case "followup_routed":
        setFollowupRouting({ type: event.questionType, roles: event.activatedRoles });
        break;

      case "error":
        addChatMessage("System", event.message, "system");
        break;
    }
  }, [updateAgent, addChatMessage]);

  const startConsultation = useCallback(async () => {
    setIsRunning(true);
    setAgents({});
    setConnections([]);
    setChatMessages([]);
    setSynthesis(null);
    setFollowupRouting(null);

    const response = await fetch("/api/swarm/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms, patientInfo }),
    });

    if (!response.body) { setIsRunning(false); return; }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const event: SwarmEvent = JSON.parse(line.slice(5).trim());
          handleEvent(event);
          if (event.type === "done") { setIsRunning(false); return; }
        } catch { /* ignore parse errors */ }
      }
    }
    setIsRunning(false);
  }, [symptoms, patientInfo, handleEvent]);

  useEffect(() => {
    startConsultation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFollowUp = useCallback(async (question: string) => {
    setFollowupRouting(null);
    const response = await fetch("/api/swarm/followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // MVP: "current" is accepted by the backend as any non-empty string.
      // Phase 2: capture real sessionId from a session_id SSE event emitted by /api/swarm/start.
      body: JSON.stringify({ sessionId: "current", question }),
    });
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const event: SwarmEvent = JSON.parse(line.slice(5).trim());
          handleEvent(event);
          if (event.type === "done") return;
        } catch { /* ignore */ }
      }
    }
  }, [handleEvent]);

  const allRoles = Object.keys(agents);
  const primaryLead = allRoles.find((r) => agents[r]?.state === "done") ?? allRoles[0];
  const positions = computeAgentPositions(
    primaryLead ? [primaryLead] : [],
    allRoles,
    RADIUS
  );
  // Keep positionsRef in sync so handleEvent can read current positions without re-memoising
  positionsRef.current = positions;

  return (
    <div className="flex h-full gap-0">
      {/* Huddle circle area */}
      <div className="flex-1 flex flex-col">
        <div
          ref={containerRef}
          className="relative flex-1"
          style={{ minHeight: 400 }}
        >
          <HuddleConnections
            connections={connections}
            width={containerRef.current?.offsetWidth ?? 600}
            height={containerRef.current?.offsetHeight ?? 400}
          />
          {Object.entries(agents).map(([role, agentState]) => {
            const pos = positions[role] ?? { x: 0, y: 0, isCenter: false };
            return (
              <AgentNode
                key={role}
                name={getAgentDisplayName(role)}
                role={role}
                avatarSeed={getAgentDisplayName(role).split(" ")[0]}
                x={pos.x}
                y={pos.y}
                state={agentState.state}
                bubbleText={agentState.bubbleText}
                isCenter={pos.isCenter}
              />
            );
          })}
          {allRoles.length === 0 && isRunning && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
              Connecting to care team…
            </div>
          )}
        </div>

        {synthesis && (
          <div className="px-4 pb-2">
            <SynthesisCard synthesis={synthesis} />
          </div>
        )}

        {followupRouting && (
          <div className="px-4 py-1">
            <RoutingChip questionType={followupRouting.type} activatedRoles={followupRouting.roles} />
          </div>
        )}

        {synthesis && (
          <FollowUpBar onSubmit={handleFollowUp} disabled={isRunning} />
        )}
      </div>

      {/* Live chat panel */}
      <div className="w-64 flex-shrink-0">
        <HuddleChatPanel messages={chatMessages} />
      </div>
    </div>
  );
}

"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { AgentNode, AgentState } from "./AgentNode";
import { HuddleConnections, HuddleConnection } from "./HuddleConnections";
import { HuddleChatPanel, ChatMessage } from "./HuddleChatPanel";
import { FollowUpBar } from "./FollowUpBar";
import { RoutingChip } from "./RoutingChip";
import { SynthesisCard } from "./SynthesisCard";
import { TriageTransparencyPanel, OrbState } from "./TriageTransparencyPanel";
import { SwarmEvent, SwarmSynthesis, SwarmState, SwarmLeadState, SwarmPhase, DoctorRole } from "@/agents/swarm-types";
import { ProgressSteps } from "./ProgressSteps";

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
  onSwarmStateChange?: (state: Partial<SwarmState>) => void;
  onPhaseChange?: (phase: SwarmPhase) => void;
}

export function HuddleRoom({ symptoms, patientInfo, onSwarmStateChange, onPhaseChange }: HuddleRoomProps) {
  const [agents, setAgents] = useState<Record<string, AgentVisualState>>({});
  const [connections, setConnections] = useState<HuddleConnection[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [synthesis, setSynthesis] = useState<SwarmSynthesis | null>(null);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [followupAnswer, setFollowupAnswer] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [orbState, setOrbState] = useState<OrbState[]>([]);
  const [liveFeedText, setLiveFeedText] = useState("");
  const [followupRouting, setFollowupRouting] = useState<{ type: "simple" | "complex"; roles: string[] } | null>(null);
  const [currentPhase, setCurrentPhase] = useState<SwarmPhase | null>(null);
  const onPhaseChangeRef = useRef(onPhaseChange);
  onPhaseChangeRef.current = onPhaseChange;
  const containerRef = useRef<HTMLDivElement>(null);
  // positionsRef holds the latest computed positions so handleEvent (memoised) can read them
  const positionsRef = useRef<Record<string, AgentPosition>>({});
  // swarmDebugRef accumulates state for the debug panel without causing re-renders
  const swarmDebugRef = useRef<Partial<SwarmState>>({});
  const onSwarmStateChangeRef = useRef(onSwarmStateChange);
  onSwarmStateChangeRef.current = onSwarmStateChange;

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

  const emitDebugState = useCallback((patch: Partial<SwarmState>) => {
    swarmDebugRef.current = { ...swarmDebugRef.current, ...patch };
    onSwarmStateChangeRef.current?.(swarmDebugRef.current);
  }, []);

  const handleEvent = useCallback((event: SwarmEvent) => {
    switch (event.type) {
      case "triage_complete":
        setRedFlags(event.data.redFlags ?? []);
        emitDebugState({ triage: event.data });
        break;

      case "phase_changed":
        setCurrentPhase(event.phase);
        onPhaseChangeRef.current?.(event.phase);
        emitDebugState({ currentPhase: event.phase });
        break;

      case "doctor_activated":
        updateAgent(event.role, "active");
        setOrbState((prev) => {
          const exists = prev.find((o) => o.role === event.role);
          if (!exists) return [...prev, { role: event.role as DoctorRole, status: "active" }];
          return prev.map((o) => o.role === event.role ? { ...o, status: "active" } : o);
        });
        setLiveFeedText(`${leadNames[event.role] ?? event.role} is reviewing...`);
        emitDebugState({
          leadSwarms: {
            ...swarmDebugRef.current.leadSwarms,
            [event.role]: swarmDebugRef.current.leadSwarms?.[event.role as DoctorRole] ?? {
              status: "running", hypotheses: [], residentDebate: [], rectification: null,
            } as SwarmLeadState,
          },
        });
        break;

      case "hypothesis_found":
        updateAgent(event.residentRole, "speaking", `${event.name} (${event.confidence}%)`);
        addChatMessage(
          residentNames[event.residentRole] ?? event.residentRole,
          `${event.name} — confidence ${event.confidence}%`,
          "hypothesis",
        );
        emitDebugState({
          leadSwarms: {
            ...swarmDebugRef.current.leadSwarms,
            [event.role]: {
              ...(swarmDebugRef.current.leadSwarms?.[event.role as DoctorRole] ?? { status: "running", residentDebate: [], rectification: null }),
              hypotheses: [
                ...(swarmDebugRef.current.leadSwarms?.[event.role as DoctorRole]?.hypotheses ?? []),
                { id: event.hypothesisId, name: event.name, confidence: event.confidence, reasoning: "", residentRole: event.residentRole },
              ],
            } as SwarmLeadState,
          },
        });
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
        emitDebugState({
          leadSwarms: {
            ...swarmDebugRef.current.leadSwarms,
            [event.role]: {
              ...(swarmDebugRef.current.leadSwarms?.[event.role as DoctorRole] ?? { hypotheses: [], residentDebate: [], rectification: null }),
              status: "complete",
              rectification: { doctorRole: event.role as DoctorRole, summary: event.summary },
            } as SwarmLeadState,
          },
        });
        break;

      case "mdt_message":
        updateAgent(event.role, "speaking", event.content.slice(0, 60));
        addChatMessage(getAgentDisplayName(event.role), event.content, "mdt", event.messageType as ChatMessage["messageType"]);
        emitDebugState({
          mdtMessages: [
            ...(swarmDebugRef.current.mdtMessages ?? []),
            { doctorRole: event.role as DoctorRole, type: event.messageType, content: event.content },
          ],
        });
        break;

      case "doctor_complete":
        updateAgent(event.role, "done");
        setOrbState((prev) =>
          prev.map((o) => o.role === event.role ? { ...o, status: "done" as const } : o)
        );
        break;

      case "synthesis_complete":
        setSynthesis(event.data);
        setAgents((prev) =>
          Object.fromEntries(
            Object.entries(prev).map(([r, a]) => [r, { ...a, state: "done" as AgentState, bubbleText: undefined }])
          )
        );
        setLiveFeedText("");
        break;

      case "gatekeeper_review":
        addChatMessage(
          "Alex AI — GP",
          `${event.decision === "revise" ? "Final review requested revisions" : "Final review approved"}: ${event.rationale}`,
          "system"
        );
        break;

      case "followup_routed":
        setFollowupRouting({ type: event.questionType, roles: event.activatedRoles });
        break;

      case "followup_answer":
        setFollowupAnswer(event.answer);
        break;

      case "error":
        addChatMessage("System", event.message, "system");
        setIsRunning(false);
        break;
    }
  }, [updateAgent, addChatMessage, emitDebugState]);

  const startConsultation = useCallback(async () => {
    setIsRunning(true);
    setAgents({});
    setConnections([]);
    setChatMessages([]);
    setSynthesis(null);
    setRedFlags([]);
    setFollowupRouting(null);

    // C2 fix: route through authenticated /api/consult (stream + swarm flags) so every
    // consultation is persisted with a Patient record and the 48h Inngest check-in fires.
    // /api/swarm/start is now internal-only; HuddleRoom no longer calls it directly.
    const response = await fetch("/api/consult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms, patientInfo, stream: true, swarm: true }),
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
    setFollowupAnswer(null);
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
    <div className="flex h-full gap-0 flex-col">
      <TriageTransparencyPanel
        orbs={orbState}
        liveFeed={liveFeedText}
        isVisible={orbState.length > 0 || isRunning}
      />
      {/* Progress steps */}
      <ProgressSteps currentPhase={currentPhase} />

      {/* Huddle circle + chat */}
      <div className="flex flex-1 overflow-hidden gap-0">
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
            <SynthesisCard synthesis={synthesis} redFlags={redFlags.length > 0 ? redFlags : undefined} />
          </div>
        )}

        {followupRouting && (
          <div className="px-4 py-1">
            <RoutingChip questionType={followupRouting.type} activatedRoles={followupRouting.roles} />
          </div>
        )}

        {followupAnswer && (
          <div className="px-4 py-2 mx-4 mb-2 rounded-lg bg-blue-50 border border-blue-100">
            <p className="text-xs font-medium text-blue-700 mb-0.5">Follow-up answer</p>
            <p className="text-sm text-gray-700">{followupAnswer}</p>
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
    </div>
  );
}

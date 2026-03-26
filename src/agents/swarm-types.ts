// src/agents/swarm-types.ts
import { AgentRole, UrgencyLevel } from "./types";

// DoctorRole is an alias for AgentRole (spec requirement).
// Note: AgentRole includes "triage" — callers must ensure only actual medical specialty roles are passed.
export type DoctorRole = AgentRole;

export type DebateMessageType = "agree" | "challenge" | "add_context";

export interface SwarmHypothesis {
  id: string;
  name: string;
  confidence: number; // 0-100
  reasoning: string;
}

export interface SwarmClarification {
  id: string;
  doctorRole: DoctorRole;
  question: string;
  answer?: string;
  status: "pending" | "answered";
}

export interface SwarmDebateMessage {
  doctorRole: DoctorRole;
  type: DebateMessageType;
  content: string;
  referencingHypothesis?: string; // SwarmHypothesis.id
}

export interface SwarmSynthesis {
  urgency: UrgencyLevel;
  rankedHypotheses: Array<{ name: string; confidence: number; doctorRole: DoctorRole }>;
  nextSteps: string[];
  questionsForDoctor: string[];
  timeframe: string;
  disclaimer: string;
}

export interface SwarmDoctorState {
  status: "pending" | "running" | "waiting_for_patient" | "complete";
  hypotheses: SwarmHypothesis[];
  pendingQuestion?: string;
}

export interface SwarmState {
  sessionId: string;
  symptoms: string;
  patientInfo: { age: string; gender: string; knownConditions?: string };
  triage: {
    urgency: UrgencyLevel;
    relevantDoctors: DoctorRole[];
    redFlags: string[];
  } | null;
  doctorSwarms: Partial<Record<DoctorRole, SwarmDoctorState>>;
  clarifications: SwarmClarification[];
  activeClarificationIds: string[];
  debate: SwarmDebateMessage[];
  synthesis: SwarmSynthesis | null;
  currentPhase: "triage" | "swarm" | "awaiting_patient" | "debate" | "synthesis" | "complete";
}

export type SwarmEvent =
  | { type: "triage_complete"; data: NonNullable<SwarmState["triage"]> }
  | { type: "phase_changed"; phase: SwarmState["currentPhase"] }
  | { type: "doctor_activated"; doctorRole: DoctorRole; doctorName: string }
  | { type: "doctor_complete"; doctorRole: DoctorRole }
  | { type: "hypothesis_found"; doctorRole: DoctorRole; hypothesisId: string; name: string; confidence: number }
  | { type: "question_ready"; clarificationId: string; doctorRole: DoctorRole; question: string }
  | { type: "doctor_token"; doctorRole: DoctorRole; token: string }
  | { type: "debate_message"; doctorRole: DoctorRole; messageType: DebateMessageType; content: string }
  | { type: "synthesis_complete"; data: SwarmSynthesis }
  | { type: "error"; message: string }
  | { type: "done" };

// Phase 1: module-level Map works within a single serverless invocation (same SSE connection).
// Phase 2: replace with Upstash Redis for cross-invocation session resume.
export const answerStore = new Map<string, string>();

// src/agents/swarm-types.ts
import { UrgencyLevel } from "./types";

export type DoctorRole =
  | "gp"
  | "cardiology"
  | "mental_health"
  | "dermatology"
  | "orthopedic"
  | "gastro"
  | "physiotherapy";

export type ResidentRole =
  | "conservative"
  | "pharmacological"
  | "investigative"
  | "red-flag";

export const DOCTOR_ROLES: DoctorRole[] = [
  "gp", "cardiology", "mental_health", "dermatology",
  "orthopedic", "gastro", "physiotherapy",
];

export const RESIDENT_ROLES: ResidentRole[] = [
  "conservative", "pharmacological", "investigative", "red-flag",
];

export type DebateMessageType = "agree" | "challenge" | "add_context";
export type MdtMessageType = "agree" | "note" | "escalate";

export interface SwarmHypothesis {
  id: string;
  name: string;
  confidence: number;
  reasoning: string;
  residentRole: ResidentRole;
}

export interface SwarmClarification {
  id: string;
  doctorRole: DoctorRole;
  residentRole: ResidentRole;
  question: string;
  answer?: string;
  status: "pending" | "answered";
}

export interface SwarmResidentDebateMessage {
  doctorRole: DoctorRole;
  residentRole: ResidentRole;
  type: DebateMessageType;
  content: string;
  referencingHypothesisId?: string;
}

export interface SwarmRectification {
  doctorRole: DoctorRole;
  summary: string;
}

export interface SwarmMdtMessage {
  doctorRole: DoctorRole;
  type: MdtMessageType;
  content: string;
}

export interface SwarmSynthesis {
  urgency: UrgencyLevel;
  primaryRecommendation: string;
  nextSteps: string[];
  bookingNeeded: boolean;
  disclaimer: string;
}

export interface SwarmLeadState {
  status: "pending" | "running" | "rectifying" | "complete";
  hypotheses: SwarmHypothesis[];
  residentDebate: SwarmResidentDebateMessage[];
  rectification: SwarmRectification | null;
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
  leadSwarms: Partial<Record<DoctorRole, SwarmLeadState>>;
  clarifications: SwarmClarification[];
  activeClarificationIds: string[];
  pendingClarifications: SwarmClarification[];
  mdtMessages: SwarmMdtMessage[];
  synthesis: SwarmSynthesis | null;
  primaryLeadRole: DoctorRole | null;
  currentPhase:
    | "triage"
    | "swarm"
    | "awaiting_patient"
    | "debate"
    | "rectification"
    | "mdt"
    | "synthesis"
    | "complete";
}

export type SwarmPhase = SwarmState["currentPhase"];

export type SwarmEvent =
  | { type: "triage_complete"; data: NonNullable<SwarmState["triage"]> }
  | { type: "phase_changed"; phase: SwarmPhase }
  | { type: "doctor_activated"; role: DoctorRole; name: string }
  | { type: "doctor_complete"; role: DoctorRole }
  | { type: "hypothesis_found"; role: DoctorRole; residentRole: ResidentRole; hypothesisId: string; name: string; confidence: number }
  | { type: "question_ready"; clarificationId: string; role: DoctorRole; question: string }
  | { type: "debate_message"; role: DoctorRole; residentRole: ResidentRole; messageType: DebateMessageType; content: string; referencingHypothesisId?: string }
  | { type: "rectification_complete"; role: DoctorRole; summary: string }
  | { type: "mdt_message"; role: DoctorRole; messageType: MdtMessageType; content: string }
  | { type: "synthesis_complete"; data: SwarmSynthesis }
  | { type: "followup_routed"; questionType: "simple" | "complex"; activatedRoles: string[] }
  | { type: "followup_answer"; answer: string }
  | { type: "error"; message: string }
  | { type: "done" };

export function createInitialSwarmState(
  sessionId: string,
  symptoms: string,
  patientInfo: SwarmState["patientInfo"],
): SwarmState {
  return {
    sessionId,
    symptoms,
    patientInfo,
    triage: null,
    leadSwarms: {},
    clarifications: [],
    activeClarificationIds: [],
    pendingClarifications: [],
    mdtMessages: [],
    synthesis: null,
    primaryLeadRole: null,
    currentPhase: "triage",
  };
}

// Module-level answer store — works within a single serverless invocation.
// Phase 2: replace with Upstash Redis for cross-invocation session resume.
export const answerStore = new Map<string, string>();

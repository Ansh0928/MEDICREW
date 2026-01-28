import { z } from "zod";

// Agent roles in the system
export type AgentRole = 
  | "triage" 
  | "gp" 
  | "cardiology" 
  | "mental_health" 
  | "dermatology" 
  | "orthopedic"
  | "gastro"
  | "orchestrator";

// Urgency levels for triage
export type UrgencyLevel = "emergency" | "urgent" | "routine" | "self_care";

// Agent message in the conversation
export interface AgentMessage {
  role: AgentRole;
  agentName: string;
  content: string;
  reasoning?: string;
  timestamp: Date;
}

// Consultation state managed by the orchestrator
export interface ConsultationState {
  // User input
  symptoms: string;
  additionalInfo: string[];
  
  // Conversation history
  messages: AgentMessage[];
  
  // Triage assessment
  urgencyLevel?: UrgencyLevel;
  redFlags: string[];
  
  // Specialist routing
  relevantSpecialties: AgentRole[];
  
  // Final recommendation
  recommendation?: CareRecommendation;
  
  // Metadata
  sessionId: string;
  startedAt: Date;
  currentStep: ConsultationStep;
}

export type ConsultationStep = 
  | "gathering_info"
  | "triage"
  | "specialist_consultation"
  | "generating_recommendation"
  | "complete";

// Care recommendation output
export interface CareRecommendation {
  urgency: UrgencyLevel;
  summary: string;
  nextSteps: string[];
  questionsForDoctor: string[];
  specialistType?: string;
  timeframe: string;
  disclaimer: string;
}

// Agent definition
export interface AgentDefinition {
  role: AgentRole;
  name: string;
  emoji: string;
  description: string;
  systemPrompt: string;
  specialties: string[];
}

// Zod schemas for structured outputs
export const UrgencyLevelSchema = z.enum(["emergency", "urgent", "routine", "self_care"]);

export const TriageOutputSchema = z.object({
  urgencyLevel: UrgencyLevelSchema,
  reasoning: z.string(),
  redFlags: z.array(z.string()),
  relevantSpecialties: z.array(z.string()),
  followUpQuestions: z.array(z.string()).optional(),
});

export const SpecialistOutputSchema = z.object({
  assessment: z.string(),
  keyFindings: z.array(z.string()),
  recommendations: z.array(z.string()),
  questionsForPatient: z.array(z.string()).optional(),
});

export const RecommendationSchema = z.object({
  urgency: UrgencyLevelSchema,
  summary: z.string(),
  nextSteps: z.array(z.string()),
  questionsForDoctor: z.array(z.string()),
  specialistType: z.string().optional(),
  timeframe: z.string(),
});

export type TriageOutput = z.infer<typeof TriageOutputSchema>;
export type SpecialistOutput = z.infer<typeof SpecialistOutputSchema>;

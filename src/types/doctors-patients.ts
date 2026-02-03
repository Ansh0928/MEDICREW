/**
 * Types for the Doctors & Patients vertical (deep niche).
 * Patient symptom checks, doctor queue, AI insights, and doctor notes.
 */

export type PortalUserRole = "patient" | "doctor";

export interface PortalUser {
  id: string;
  email: string;
  name: string;
  role: PortalUserRole;
  avatar?: string;
}

/** Urgency levels used in patient triage and doctor queue (aligned with reference app). */
export type SymptomUrgencyLevel = "low" | "medium" | "high" | "critical";

export interface AIAssessment {
  urgencyLevel: SymptomUrgencyLevel;
  possibleConditions: string[];
  recommendedAction: string;
  questionsToAsk: string[];
  confidence: number;
  reasoning: string;
}

export interface SymptomCheck {
  id: string;
  patientId: string;
  patientName: string;
  symptoms: string[];
  duration: string;
  additionalInfo: string;
  aiAssessment: AIAssessment;
  status: "pending" | "in-review" | "completed";
  createdAt: string;
  assignedDoctor?: string;
}

export interface QueueItem {
  id: string;
  patientId: string;
  patientName: string;
  urgencyLevel: SymptomUrgencyLevel;
  estimatedWaitTime: number;
  status: "waiting" | "in-progress" | "completed";
  symptomCheckId: string;
  checkInTime: string;
}

export interface DoctorNote {
  id: string;
  symptomCheckId: string;
  doctorId: string;
  doctorName: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  createdAt: string;
}

/** AI output for doctor diagnostic insights */
export interface DoctorInsights {
  differentialDiagnosis: string[];
  recommendedTests: string[];
  redFlags: string[];
  aiConfidence: number;
}

/** AI output for treatment plan suggestion */
export interface TreatmentPlanSuggestion {
  medications: string[];
  lifestyle: string[];
  followUp: string;
}

export interface PortalStatistics {
  totalChecksToday: number;
  pendingReviews: number;
  inReview: number;
  completedToday: number;
  averageWaitTime: number;
  criticalCases: number;
}

import { detectEmergency, EmergencyResult } from "./emergency-rules";

export type CheckInResponse = "better" | "same" | "worse";

export interface EscalationResult {
  escalate: boolean;
  newUrgencyTier: "urgent" | "emergency" | null;
  notifySpecialist: boolean;
  emergency: EmergencyResult | null;
  specialistMessage: string | null;
}

export function evaluateCheckInResponse(
  response: CheckInResponse,
  freeText: string,
): EscalationResult {
  // Always check free text for emergency keywords (same rules engine as Phase 1)
  const emergencyCheck = detectEmergency(freeText);
  if (emergencyCheck.isEmergency) {
    return {
      escalate: true,
      newUrgencyTier: "emergency",
      notifySpecialist: true,
      emergency: emergencyCheck,
      specialistMessage: `EMERGENCY: Patient reported ${emergencyCheck.category} symptoms in check-in response. 000 referral issued.`,
    };
  }

  // "Worse" response escalates urgency
  if (response === "worse") {
    return {
      escalate: true,
      newUrgencyTier: "urgent",
      notifySpecialist: true,
      emergency: null,
      specialistMessage:
        "Patient reported feeling worse since last consultation. Review recommended.",
    };
  }

  // "Better" or "Same" — no escalation
  return {
    escalate: false,
    newUrgencyTier: null,
    notifySpecialist: false,
    emergency: null,
    specialistMessage: null,
  };
}

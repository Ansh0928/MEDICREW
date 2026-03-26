export interface PatientProfile {
  medications?: string[];
  allergies?: string[];
  knownConditions?: string;
}

/**
 * Builds a compact context string from a patient profile for injection into
 * agent system prompts. Empty or undefined fields are omitted.
 */
export function buildPatientContext(profile: PatientProfile): string {
  const parts: string[] = [];

  if (profile.medications && profile.medications.length > 0) {
    parts.push(`Medications: ${profile.medications.join(', ')}`);
  }

  if (profile.allergies && profile.allergies.length > 0) {
    parts.push(`Allergies: ${profile.allergies.join(', ')}`);
  }

  if (profile.knownConditions && profile.knownConditions.trim().length > 0) {
    parts.push(`Known conditions: ${profile.knownConditions.trim()}`);
  }

  return parts.join('. ');
}

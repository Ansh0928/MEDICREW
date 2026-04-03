import { z } from "zod";

export const ConsultationPatientInfoSchema = z.object({
  age: z.string().trim().min(1, "age is required"),
  gender: z.string().trim().min(1, "gender is required"),
  knownConditions: z.string().trim().optional(),
  medications: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  historySummary: z.string().trim().optional(),
});

export type ConsultationPatientInfo = z.infer<
  typeof ConsultationPatientInfoSchema
>;

export const ConsultationInputSchema = z.object({
  symptoms: z
    .string()
    .trim()
    .min(1, "Symptoms are required")
    .max(4000, "Symptoms must be under 4000 characters"),
  stream: z.boolean().optional(),
  swarm: z.boolean().optional(),
  patientInfo: ConsultationPatientInfoSchema.partial().optional(),
});

interface PatientProfileLike {
  name?: string | null;
  age?: number | null;
  gender?: string | null;
  knownConditions?: string | null;
  medications?: string | string[] | null;
  allergies?: string | string[] | null;
}

function asStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed))
        return parsed.filter(
          (item): item is string => typeof item === "string",
        );
    } catch {
      return [value];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

export function resolveConsultationPatientInfo(
  patientProfile: PatientProfileLike | null,
  override: Partial<ConsultationPatientInfo> | undefined,
): ConsultationPatientInfo {
  const candidate = {
    age:
      override?.age ??
      (patientProfile?.age !== undefined && patientProfile?.age !== null
        ? String(patientProfile.age)
        : "unknown"),
    gender: override?.gender ?? patientProfile?.gender ?? "unknown",
    knownConditions:
      override?.knownConditions ?? patientProfile?.knownConditions ?? undefined,
    medications: override?.medications ?? patientProfile?.medications ?? [],
    allergies: override?.allergies ?? patientProfile?.allergies ?? [],
    historySummary: override?.historySummary,
  };

  return ConsultationPatientInfoSchema.parse({
    ...candidate,
    medications: asStringArray(candidate.medications),
    allergies: asStringArray(candidate.allergies),
  });
}

export function buildPatientContext(info: ConsultationPatientInfo): string {
  const medications = info.medications?.length
    ? info.medications.join(", ")
    : "none";
  const allergies = info.allergies?.length ? info.allergies.join(", ") : "none";
  const knownConditions = info.knownConditions?.trim() || "none";
  const history = info.historySummary?.trim();

  return [
    `Patient profile: Age ${info.age}, ${info.gender}. Known conditions: ${knownConditions}. Medications: ${medications}. Allergies: ${allergies}.`,
    history ? `Relevant history: ${history}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

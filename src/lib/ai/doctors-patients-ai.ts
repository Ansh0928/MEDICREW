/**
 * Gemini-backed AI for Doctors & Patients vertical.
 * Symptom triage, doctor insights, and treatment plan suggestions.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createModel } from "@/lib/ai/config";
import type {
  AIAssessment,
  SymptomCheck,
  DoctorInsights,
  TreatmentPlanSuggestion,
} from "@/types/doctors-patients";

const getJsonFromResponse = (content: string): Record<string, unknown> | null => {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/** Analyze patient symptoms and return structured triage assessment (Gemini). */
export async function analyzeSymptoms(
  symptoms: string[],
  duration: string,
  additionalInfo: string
): Promise<AIAssessment> {
  const llm = createModel(0.3);
  const prompt = `You are a medical triage AI assistant. Analyze the following patient symptoms and provide a structured assessment.

Symptoms: ${symptoms.join(", ")}
Duration: ${duration}
Additional Information: ${additionalInfo || "None provided"}

Respond ONLY with a JSON object in this exact format:
{
  "urgencyLevel": "low" | "medium" | "high" | "critical",
  "possibleConditions": ["condition1", "condition2", "condition3", "condition4"],
  "recommendedAction": "specific action for patient",
  "questionsToAsk": ["question1", "question2", "question3", "question4"],
  "confidence": 85,
  "reasoning": "brief explanation of the assessment"
}

Guidelines:
- CRITICAL: Life-threatening symptoms (chest pain, severe breathing difficulty, unconsciousness, severe bleeding)
- HIGH: Requires urgent attention within 24 hours
- MEDIUM: Should see doctor within a few days
- LOW: Self-care appropriate, monitor symptoms`;

  const response = await llm.invoke([
    new SystemMessage(
      "You are a medical triage AI. Always respond with valid JSON only."
    ),
    new HumanMessage(prompt),
  ]);
  const content = (response.content as string) ?? "";
  const parsed = getJsonFromResponse(content);
  if (parsed) {
    return {
      urgencyLevel: (parsed.urgencyLevel as AIAssessment["urgencyLevel"]) ?? "medium",
      possibleConditions: Array.isArray(parsed.possibleConditions)
        ? parsed.possibleConditions.slice(0, 4)
        : ["Further evaluation needed"],
      recommendedAction:
        (parsed.recommendedAction as string) ?? "Consult a healthcare provider",
      questionsToAsk: Array.isArray(parsed.questionsToAsk)
        ? parsed.questionsToAsk.slice(0, 4)
        : ["Please describe symptoms in detail"],
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 75,
      reasoning: (parsed.reasoning as string) ?? "Based on symptom analysis",
    };
  }
  return fallbackAssessment(symptoms, duration, additionalInfo);
}

function fallbackAssessment(
  symptoms: string[],
  duration: string,
  additionalInfo: string
): AIAssessment {
  const criticalKeywords = [
    "severe",
    "chest pain",
    "can't breathe",
    "unconscious",
    "bleeding",
    "emergency",
  ];
  const hasCritical = criticalKeywords.some((k) =>
    (symptoms.join(" ") + " " + additionalInfo).toLowerCase().includes(k)
  );
  const urgencyLevel = hasCritical ? "critical" : "medium";
  return {
    urgencyLevel: urgencyLevel as AIAssessment["urgencyLevel"],
    possibleConditions: [
      "Further evaluation needed",
      "Viral illness",
      "Stress-related symptoms",
    ],
    recommendedAction:
      urgencyLevel === "critical"
        ? "Seek emergency medical attention immediately. Call 000 or go to the nearest emergency department."
        : "Book a routine appointment with your GP within the next few days. Rest and monitor symptoms.",
    questionsToAsk: [
      "How long have you had these symptoms?",
      "Have you tried any treatments?",
      "Do you have any allergies?",
      "Is this the first time?",
    ],
    confidence: 75,
    reasoning: `Based on ${symptoms.join(", ")} over ${duration}.`,
  };
}

/** Generate diagnostic insights for a doctor reviewing a case (Gemini). */
export async function generateDoctorInsights(
  symptomCheck: SymptomCheck
): Promise<DoctorInsights> {
  const llm = createModel(0.3);
  const prompt = `As a medical AI assisting doctors, analyze this patient case and provide diagnostic insights.

Patient Symptoms: ${symptomCheck.symptoms.join(", ")}
Duration: ${symptomCheck.duration}
Additional Info: ${symptomCheck.additionalInfo || "None"}
AI Triage Level: ${symptomCheck.aiAssessment.urgencyLevel}
Possible Conditions: ${symptomCheck.aiAssessment.possibleConditions.join(", ")}

Respond with JSON only:
{
  "differentialDiagnosis": ["diagnosis1", "diagnosis2", "diagnosis3"],
  "recommendedTests": ["test1", "test2", "test3"],
  "redFlags": ["flag1", "flag2"],
  "aiConfidence": 85
}`;

  const response = await llm.invoke([
    new SystemMessage(
      "You are a medical AI assisting doctors. Respond with valid JSON only."
    ),
    new HumanMessage(prompt),
  ]);
  const content = (response.content as string) ?? "";
  const parsed = getJsonFromResponse(content);
  if (parsed) {
    return {
      differentialDiagnosis: Array.isArray(parsed.differentialDiagnosis)
        ? parsed.differentialDiagnosis
        : symptomCheck.aiAssessment.possibleConditions,
      recommendedTests: Array.isArray(parsed.recommendedTests)
        ? parsed.recommendedTests
        : ["Physical examination", "Vital signs"],
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
      aiConfidence:
        typeof parsed.aiConfidence === "number"
          ? parsed.aiConfidence
          : symptomCheck.aiAssessment.confidence,
    };
  }
  return {
    differentialDiagnosis: symptomCheck.aiAssessment.possibleConditions,
    recommendedTests: ["CBC", "Basic metabolic panel", "Physical examination"],
    redFlags: symptomCheck.aiAssessment.urgencyLevel === "critical" ? ["Requires immediate evaluation"] : [],
    aiConfidence: symptomCheck.aiAssessment.confidence,
  };
}

/** Generate treatment plan suggestion (Gemini). */
export async function generateTreatmentPlan(
  diagnosis: string,
  symptoms: string[]
): Promise<TreatmentPlanSuggestion> {
  const llm = createModel(0.3);
  const prompt = `As a medical AI, suggest a treatment plan.

Diagnosis: ${diagnosis}
Symptoms: ${symptoms.join(", ")}

Respond with JSON only:
{
  "medications": ["medication1", "medication2", "medication3"],
  "lifestyle": ["recommendation1", "recommendation2", "recommendation3"],
  "followUp": "follow-up instructions"
}`;

  const response = await llm.invoke([
    new SystemMessage("You are a medical AI. Respond with valid JSON only."),
    new HumanMessage(prompt),
  ]);
  const content = (response.content as string) ?? "";
  const parsed = getJsonFromResponse(content);
  if (parsed) {
    return {
      medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      lifestyle: Array.isArray(parsed.lifestyle) ? parsed.lifestyle : [],
      followUp: (parsed.followUp as string) ?? "Schedule follow-up in 1-2 weeks or sooner if symptoms worsen.",
    };
  }
  return {
    medications: [
      "Symptomatic treatment as needed",
      "Follow prescribing guidelines",
    ],
    lifestyle: ["Rest and adequate hydration", "Avoid strenuous activities", "Balanced diet"],
    followUp: "Schedule follow-up in 1-2 weeks or sooner if symptoms worsen.",
  };
}

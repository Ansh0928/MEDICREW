// src/lib/intake-types.ts

export interface IntakeAnswer {
  questionId: string;
  question: string;
  answer: string; // always a string — body region label, "7", "Today", "Anxious", free text
}

export type IntakeQuestionType =
  | "text"
  | "body-map"
  | "slider"
  | "chips"
  | "emotional"
  | "confirm";

export interface IntakeQuestion {
  questionId: string;
  question: string;
  type: IntakeQuestionType;
  options?: string[]; // for chips / emotional
  min?: number; // for slider
  max?: number; // for slider
  done: boolean; // true = this is the last question (confirm step)
}

/** Map of standardized intake question IDs to avoid magic string coupling. */
export const INTAKE_QUESTION_IDS = {
  location: "location",
  duration: "duration",
  severity: "severity",
  emotional: "emotional",
  associated: "associated",
  confirm: "confirm",
} as const;

/** Builds a natural-language symptoms string from intake answers for the swarm. */
export function buildSymptomsFromAnswers(answers: IntakeAnswer[]): string {
  const parts = answers
    .filter(
      (a) =>
        a.answer.trim().length > 0 &&
        a.questionId !== INTAKE_QUESTION_IDS.confirm,
    )
    .map((a) => `${a.question}: ${a.answer}`);
  const confirm = answers.find(
    (a) => a.questionId === INTAKE_QUESTION_IDS.confirm,
  );
  const extra = confirm?.answer.trim();
  return [parts.join(". "), extra].filter(Boolean).join(". ");
}

/** Builds a historySummary string from structured intake answers (for buildPatientContext). */
export function buildHistorySummaryFromAnswers(
  answers: IntakeAnswer[],
): string {
  const structured = [
    INTAKE_QUESTION_IDS.location,
    INTAKE_QUESTION_IDS.duration,
    INTAKE_QUESTION_IDS.severity,
    INTAKE_QUESTION_IDS.emotional,
  ] as const;
  const structuredSet = new Set(structured);
  const parts = answers
    .filter((a) => structuredSet.has(a.questionId as any) && a.answer.trim())
    .map((a) => {
      if (a.questionId === INTAKE_QUESTION_IDS.severity)
        return `Severity: ${a.answer}/10`;
      if (a.questionId === INTAKE_QUESTION_IDS.emotional) {
        // answers formatted as "<emoji> <label>" — strip the emoji prefix
        return `Emotional state: ${a.answer.replace(/^\S+\s+/, "")}`;
      }
      return `${a.question}: ${a.answer}`;
    });
  return parts.join(". ");
}

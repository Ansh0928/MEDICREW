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
  options?: string[];  // for chips / emotional
  min?: number;        // for slider
  max?: number;        // for slider
  done: boolean;       // true = this is the last question (confirm step)
}

/** Builds a natural-language symptoms string from intake answers for the swarm. */
export function buildSymptomsFromAnswers(answers: IntakeAnswer[]): string {
  const parts = answers
    .filter((a) => a.answer.trim().length > 0 && a.questionId !== "confirm")
    .map((a) => `${a.question}: ${a.answer}`);
  const confirm = answers.find((a) => a.questionId === "confirm");
  const extra = confirm?.answer.trim();
  return [parts.join(". "), extra].filter(Boolean).join(". ");
}

/** Builds a historySummary string from structured intake answers (for buildPatientContext). */
export function buildHistorySummaryFromAnswers(answers: IntakeAnswer[]): string {
  const structured = ["location", "duration", "severity", "emotional"];
  const parts = answers
    .filter((a) => structured.includes(a.questionId) && a.answer.trim())
    .map((a) => {
      if (a.questionId === "severity") return `Severity: ${a.answer}/10`;
      if (a.questionId === "emotional") return `Emotional state: ${a.answer.replace(/^.*?\s/, "")}`;
      return `${a.question}: ${a.answer}`;
    });
  return parts.join(". ");
}

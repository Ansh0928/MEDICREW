import { describe, it, expect } from "vitest";
import { buildPatientContext } from "@/lib/consultation-intake";
import {
  buildSymptomsFromAnswers,
  buildHistorySummaryFromAnswers,
} from "@/lib/intake-types";
import type { IntakeAnswer } from "@/lib/intake-types";

const sampleAnswers: IntakeAnswer[] = [
  {
    questionId: "location",
    question: "Where is your main symptom?",
    answer: "Chest",
  },
  { questionId: "duration", question: "How long?", answer: "A few days" },
  { questionId: "severity", question: "How severe?", answer: "7" },
  {
    questionId: "emotional",
    question: "How are you feeling?",
    answer: "😟 Anxious",
  },
  {
    questionId: "associated",
    question: "Any other symptoms?",
    answer: "shortness of breath",
  },
];

describe("intake context building", () => {
  it("buildSymptomsFromAnswers produces natural language symptom string", () => {
    const result = buildSymptomsFromAnswers(sampleAnswers);
    expect(result).toContain("Chest");
    expect(result).toContain("shortness of breath");
    expect(result).not.toContain("confirm");
  });

  it("buildHistorySummaryFromAnswers includes severity and emotional state", () => {
    const result = buildHistorySummaryFromAnswers(sampleAnswers);
    expect(result).toContain("Severity: 7/10");
    expect(result).toContain("Emotional state: Anxious");
  });

  it("buildPatientContext includes historySummary when provided", () => {
    const summary = buildHistorySummaryFromAnswers(sampleAnswers);
    const context = buildPatientContext({
      age: "32",
      gender: "Female",
      historySummary: summary,
    });
    expect(context).toContain("Severity: 7/10");
    expect(context).toContain("Emotional state: Anxious");
  });
});

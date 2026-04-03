import { describe, test, expect } from "vitest";
import { evaluateCheckInResponse } from "@/lib/escalation-rules";

describe("ESCL-01/02: Escalation rules engine", () => {
  test("'worse' response returns escalate=true, urgentTier, notifySpecialist=true", () => {
    const result = evaluateCheckInResponse("worse", "");
    expect(result.escalate).toBe(true);
    expect(result.newUrgencyTier).toBe("urgent");
    expect(result.notifySpecialist).toBe(true);
    expect(result.emergency).toBeNull();
  });

  test("'better' response returns escalate=false, no tier, no specialist", () => {
    const result = evaluateCheckInResponse("better", "");
    expect(result.escalate).toBe(false);
    expect(result.newUrgencyTier).toBeNull();
    expect(result.notifySpecialist).toBe(false);
    expect(result.emergency).toBeNull();
  });

  test("'same' response returns escalate=false, no tier, no specialist", () => {
    const result = evaluateCheckInResponse("same", "");
    expect(result.escalate).toBe(false);
    expect(result.newUrgencyTier).toBeNull();
    expect(result.notifySpecialist).toBe(false);
    expect(result.emergency).toBeNull();
  });

  test("'worse' with emergency free text returns emergency tier (delegates to detectEmergency)", () => {
    const result = evaluateCheckInResponse("worse", "chest pain getting worse");
    expect(result.escalate).toBe(true);
    expect(result.newUrgencyTier).toBe("emergency");
    expect(result.notifySpecialist).toBe(true);
    expect(result.emergency).not.toBeNull();
    expect(result.emergency?.isEmergency).toBe(true);
    expect(result.emergency?.category).toBe("cardiac");
  });

  test("'worse' with non-emergency free text returns urgent escalation", () => {
    const result = evaluateCheckInResponse("worse", "no improvement at all");
    expect(result.escalate).toBe(true);
    expect(result.newUrgencyTier).toBe("urgent");
    expect(result.emergency).toBeNull();
  });

  test("'same' with emergency free text triggers emergency escalation regardless of status", () => {
    const result = evaluateCheckInResponse(
      "same",
      "I feel terrible and can't breathe",
    );
    expect(result.escalate).toBe(true);
    expect(result.newUrgencyTier).toBe("emergency");
    expect(result.notifySpecialist).toBe(true);
    expect(result.emergency?.isEmergency).toBe(true);
    expect(result.emergency?.category).toBe("respiratory");
  });

  test("'better' with emergency free text triggers emergency escalation", () => {
    const result = evaluateCheckInResponse("better", "I want to kill myself");
    expect(result.escalate).toBe(true);
    expect(result.newUrgencyTier).toBe("emergency");
    expect(result.emergency?.category).toBe("suicide");
  });

  test("specialistMessage is set for 'worse' response", () => {
    const result = evaluateCheckInResponse("worse", "");
    expect(result.specialistMessage).not.toBeNull();
    expect(typeof result.specialistMessage).toBe("string");
  });

  test("specialistMessage is null for 'better' response", () => {
    const result = evaluateCheckInResponse("better", "");
    expect(result.specialistMessage).toBeNull();
  });
});

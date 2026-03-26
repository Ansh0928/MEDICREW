import { describe, test, expect } from "vitest";
import { detectEmergency } from "@/lib/emergency-rules";

describe("COMP-03: Emergency rules engine", () => {
  test("returns isEmergency=true for 'chest pain'", () => {
    const result = detectEmergency("I have chest pain");
    expect(result.isEmergency).toBe(true);
    expect(result.category).toBe("cardiac");
  });

  test("returns isEmergency=true with Lifeline for suicidal ideation", () => {
    const result = detectEmergency("I want to kill myself");
    expect(result.isEmergency).toBe(true);
    expect(result.category).toBe("suicide");
    expect(result.response?.additionalLine).toContain("13 11 14");
  });

  test("returns isEmergency=true for stroke FAST symptoms", () => {
    const result = detectEmergency("face drooping and arm weakness");
    expect(result.isEmergency).toBe(true);
    expect(result.category).toBe("stroke");
  });

  test("returns isEmergency=true for respiratory emergency", () => {
    const result = detectEmergency("I can't breathe");
    expect(result.isEmergency).toBe(true);
    expect(result.category).toBe("respiratory");
  });

  test("returns isEmergency=true for severe bleeding", () => {
    const result = detectEmergency("severe bleeding from wound");
    expect(result.isEmergency).toBe(true);
    expect(result.category).toBe("bleeding");
  });

  test("returns isEmergency=true for overdose", () => {
    const result = detectEmergency("I took too many pills overdose");
    expect(result.isEmergency).toBe(true);
    expect(result.category).toBe("overdose");
  });

  test("returns isEmergency=false for non-emergency 'headache'", () => {
    const result = detectEmergency("I have a headache");
    expect(result.isEmergency).toBe(false);
    expect(result.category).toBeNull();
    expect(result.response).toBeNull();
  });

  test("all emergency responses include callToAction='000'", () => {
    const emergencies = ["chest pain", "want to kill myself", "can't breathe", "severe bleeding"];
    for (const text of emergencies) {
      const result = detectEmergency(text);
      expect(result.response?.callToAction).toBe("000");
    }
  });

  test("all emergency messages contain 'call 000'", () => {
    const result = detectEmergency("chest pain");
    expect(result.response?.message).toContain("000");
  });
});

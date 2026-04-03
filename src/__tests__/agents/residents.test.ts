import { describe, it, expect } from "vitest";
import { residentDefinitions } from "@/agents/definitions/residents";

describe("Resident definitions", () => {
  it("exports exactly 4 residents", () => {
    expect(Object.keys(residentDefinitions)).toHaveLength(4);
  });

  it.each([
    "conservative",
    "pharmacological",
    "investigative",
    "red-flag",
  ] as const)("%s resident has required fields", (role) => {
    const def = residentDefinitions[role];
    expect(def.role).toBe(role);
    expect(typeof def.systemPrompt).toBe("string");
    expect(def.systemPrompt.length).toBeGreaterThan(100);
    expect(def.systemPrompt).toContain("JSON");
    expect(def.systemPrompt).toContain("confidence");
  });

  it("red-flag resident prompt instructs to return confidence 100 only if critical", () => {
    const rf = residentDefinitions["red-flag"];
    expect(rf.systemPrompt).toContain("emergency");
  });
});

import { describe, it, expect } from "vitest";
import { buildPatientContext } from "@/lib/patient-context";

describe("PROF-02: Profile context injection", () => {
  it("Patient medications are included in agent system prompt context", () => {
    const ctx = buildPatientContext({
      medications: ["Metformin", "Lisinopril"],
    });
    expect(ctx).toContain("Metformin");
    expect(ctx).toContain("Lisinopril");
  });

  it("Patient allergies are included in agent system prompt context", () => {
    const ctx = buildPatientContext({ allergies: ["Penicillin", "Sulfa"] });
    expect(ctx).toContain("Penicillin");
    expect(ctx).toContain("Sulfa");
  });

  it("Patient known conditions are included in agent system prompt context", () => {
    const ctx = buildPatientContext({ knownConditions: "Type 2 Diabetes" });
    expect(ctx).toContain("Type 2 Diabetes");
  });

  it("Empty profile fields are omitted from context string", () => {
    const ctx = buildPatientContext({
      medications: [],
      allergies: [],
      knownConditions: "",
    });
    expect(ctx).toBe("");
  });
});

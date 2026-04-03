import { describe, it, expect } from "vitest";
import { CARE_TEAM } from "@/lib/care-team-config";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("ONBD-03: Care team config", () => {
  it("CARE_TEAM contains all 8 agents including triage", () => {
    expect(CARE_TEAM).toHaveLength(8);
    const roles = CARE_TEAM.map((m) => m.role);
    expect(roles).toContain("triage");
  });

  it("CARE_TEAM uses em dash in agent names (Alex AI — GP)", () => {
    const nonTriageMembers = CARE_TEAM.filter((m) => m.role !== "triage");
    for (const member of nonTriageMembers) {
      expect(member.name).toContain("\u2014");
    }
  });

  it("CARE_TEAM does not import from agentRegistry or LangChain", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/lib/care-team-config.ts"),
      "utf-8",
    );
    expect(src).not.toMatch(/agentRegistry/);
    expect(src).not.toMatch(/langchain/i);
  });

  it("CareTeamIntroStep excludes triage agent from display", async () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/onboarding/CareTeamIntroStep.tsx"),
      "utf-8",
    );
    expect(src).toMatch(/role !== .triage./);
  });
});

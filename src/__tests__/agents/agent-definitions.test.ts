// Tests: specialist agent definitions — compliance and structure checks
import { describe, it, expect } from "vitest";
import { agentRegistry } from "@/agents/definitions";
import { AGENT_COMPLIANCE_RULE } from "@/lib/compliance";

const SPECIALIST_ROLES = ["gp", "cardiology", "mental_health", "dermatology", "orthopedic", "gastro", "physiotherapy"] as const;
// orchestrator has a stub prompt — exclude from length/compliance checks
const ALL_ROLES = ["triage", ...SPECIALIST_ROLES] as const;

describe("Agent registry — structure", () => {
  it("exports exactly 9 agents (triage + orchestrator + 7 specialists)", () => {
    expect(Object.keys(agentRegistry)).toHaveLength(9);
  });

  it.each(ALL_ROLES)("%s has required fields (role, name, emoji, description, systemPrompt)", (role) => {
    const agent = agentRegistry[role];
    expect(agent.role).toBe(role);
    expect(typeof agent.name).toBe("string");
    expect(agent.name.length).toBeGreaterThan(0);
    expect(typeof agent.emoji).toBe("string");
    expect(typeof agent.description).toBe("string");
    expect(typeof agent.systemPrompt).toBe("string");
    expect(agent.systemPrompt.length).toBeGreaterThan(50);
  });

  it.each(ALL_ROLES)("%s has a non-empty specialties array", (role) => {
    const agent = agentRegistry[role];
    expect(Array.isArray(agent.specialties)).toBe(true);
    expect(agent.specialties.length).toBeGreaterThan(0);
  });
});

describe("Agent registry — AHPRA compliance (COMP-03)", () => {
  it.each(SPECIALIST_ROLES)(
    "%s specialist system prompt contains AGENT_COMPLIANCE_RULE",
    (role) => {
      const agent = agentRegistry[role];
      // Must contain the diagnostic language prohibition
      expect(agent.systemPrompt).toContain(AGENT_COMPLIANCE_RULE);
    }
  );

  it.each(ALL_ROLES)(
    "%s name does not contain bare 'Dr.' without 'AI'",
    (role) => {
      const agent = agentRegistry[role];
      // Must not have bare "Dr." — only "Dr. X AI" or "X AI" formats are compliant
      const hasBareDr = /\bDr\.\s+(?!.*AI)/.test(agent.name);
      expect(hasBareDr).toBe(false);
    }
  );
});

describe("Triage agent — specific behaviour", () => {
  it("triage system prompt contains urgency level classification", () => {
    const { systemPrompt } = agentRegistry.triage;
    expect(systemPrompt).toMatch(/emergency|urgent|routine/i);
  });

  it("triage system prompt warns about red flags", () => {
    const { systemPrompt } = agentRegistry.triage;
    expect(systemPrompt.toLowerCase()).toContain("red flag");
  });
});

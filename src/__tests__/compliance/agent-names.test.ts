import { describe, test, expect } from "vitest";
import { agentRegistry } from "@/agents/definitions";

describe("COMP-02: Agent AI naming", () => {
  const agentEntries = Object.entries(agentRegistry);

  test("all agent names contain 'AI' (except orchestrator which is 'MediCrew Coordinator')", () => {
    for (const [role, agent] of agentEntries) {
      if (role === "orchestrator") continue;
      expect(agent.name).toContain("AI");
    }
  });

  test("no agent name starts with 'Dr.'", () => {
    for (const [, agent] of agentEntries) {
      expect(agent.name.startsWith("Dr.")).toBe(false);
    }
  });

  test("gpAgent name is 'Alex AI \u2014 GP'", () => {
    expect(agentRegistry.gp.name).toBe("Alex AI \u2014 GP");
  });

  test("all patient-facing agents have AGENT_COMPLIANCE_RULE in system prompt", () => {
    for (const [role, agent] of agentEntries) {
      if (role === "orchestrator") continue;
      expect(agent.systemPrompt).toContain("you have [condition]");
    }
  });
});

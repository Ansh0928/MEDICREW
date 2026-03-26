// Tests: src/agents/definitions/*.ts agent name format
import { describe, test } from "vitest";

describe("COMP-02: Agent AI naming", () => {
  test.todo("all agent names contain 'AI' suffix");
  test.todo("no agent name starts with 'Dr.'");
  test.todo("gpAgent.name equals 'Alex AI — GP'");
  test.todo("agentRegistry has 9 entries (8 agents + orchestrator)");
});

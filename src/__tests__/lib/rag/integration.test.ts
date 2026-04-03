import { describe, test, expect } from "vitest";
import { buildResidentPrompt } from "@/agents/swarm";

describe("RAG integration: AU disclaimer in resident prompts", () => {
  test("AU_DISCLAIMER prefix appears in prompt when ragChunks provided", () => {
    const chunk =
      "[Reference material — US clinical guidelines. Apply Australian clinical standards where they differ.]\n\ncardiac assessment content";
    const prompt = buildResidentPrompt(
      "investigative",
      "cardiology",
      "chest pain",
      { age: "45", gender: "male" },
      [chunk],
    );
    expect(prompt).toContain("Australian clinical standards");
    expect(prompt).toContain("Relevant Medical Reference");
    expect(prompt).toContain("cardiac assessment content");
  });

  test("no RAG section when ragChunks is empty", () => {
    const prompt = buildResidentPrompt(
      "investigative",
      "cardiology",
      "chest pain",
      { age: "45", gender: "male" },
      [],
    );
    expect(prompt).not.toContain("Relevant Medical Reference");
  });
});

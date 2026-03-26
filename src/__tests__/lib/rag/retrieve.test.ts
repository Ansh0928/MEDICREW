import { describe, test, expect, vi, beforeEach } from "vitest";
import { retrieveMedicalContext } from "@/lib/rag/retrieve";

// Mock embed module
vi.mock("@/lib/rag/embed", () => ({
  embedText: vi.fn().mockResolvedValue(Array(768).fill(0.1)),
}));

// Mock @neondatabase/serverless
vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() =>
    vi.fn().mockResolvedValue([
      { content: "cardiac assessment chunk" },
      { content: "heart failure context" },
    ])
  ),
}));

describe("retrieveMedicalContext", () => {
  test("returns chunks per specialty with AU disclaimer prefix", async () => {
    const result = await retrieveMedicalContext("chest pain", ["cardiology"]);
    expect(result.cardiology).toHaveLength(2);
    expect(result.cardiology![0]).toContain("[Reference material");
    expect(result.cardiology![0]).toContain("Australian clinical standards");
    expect(result.cardiology![0]).toContain("cardiac assessment chunk");
  });

  test("returns empty object when embedText throws", async () => {
    const { embedText } = await import("@/lib/rag/embed");
    vi.mocked(embedText).mockRejectedValueOnce(new Error("Nomic down"));

    const result = await retrieveMedicalContext("chest pain", ["cardiology"]);
    expect(result).toEqual({});
  });

  test("queries each specialty in parallel", async () => {
    const result = await retrieveMedicalContext("fever and rash", ["gp", "dermatology"]);
    expect(Object.keys(result)).toContain("gp");
    expect(Object.keys(result)).toContain("dermatology");
  });
});

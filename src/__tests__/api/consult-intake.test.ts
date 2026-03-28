// src/__tests__/api/consult-intake.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Auth mock ────────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  getAuthenticatedPatient: vi.fn().mockResolvedValue({
    patient: { id: "patient-1" },
    needsOnboarding: false,
    error: null,
  }),
}));

// ── LLM mock — default to valid response ────────────────────────────────────
const mockInvoke = vi.fn();
vi.mock("@/lib/ai/config", () => ({
  createFastModel: vi.fn(() => ({ invoke: mockInvoke })),
}));

// ── Emergency rules mock ─────────────────────────────────────────────────────
vi.mock("@/lib/emergency-rules", () => ({
  detectEmergency: vi.fn().mockReturnValue({ isEmergency: false }),
}));

import { POST } from "@/app/api/consult/intake/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/consult/intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/consult/intake", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("returns first static question when no answers provided", async () => {
    const res = await POST(makeRequest({ answers: [] }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toMatchObject({
      questionId: "location",
      type: "body-map",
      done: false,
    });
  });

  it("returns AI-generated question when answers exist and LLM succeeds", async () => {
    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify({
        questionId: "radiation",
        question: "Does the chest pain radiate to your arm or jaw?",
        type: "chips",
        options: ["Yes, arm", "Yes, jaw", "Both", "Neither"],
        done: false,
      }),
    });

    const res = await POST(makeRequest({
      answers: [{ questionId: "location", question: "Where is your main symptom?", answer: "Chest" }],
    }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.question).toBe("Does the chest pain radiate to your arm or jaw?");
    expect(data.type).toBe("chips");
  });

  it("falls back to static questions when LLM times out", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("timeout"));

    const res = await POST(makeRequest({
      answers: [{ questionId: "location", question: "Where?", answer: "Chest" }],
    }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveProperty("questionId");
    expect(data).toHaveProperty("type");
    expect(data).toHaveProperty("done");
  });

  it("falls back when LLM returns malformed JSON", async () => {
    mockInvoke.mockResolvedValueOnce({ content: "not valid json at all" });

    const res = await POST(makeRequest({
      answers: [{ questionId: "location", question: "Where?", answer: "Back" }],
    }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveProperty("questionId");
  });

  it("caps at 10 answers and returns confirm question", async () => {
    const tenAnswers = Array.from({ length: 10 }, (_, i) => ({
      questionId: `q${i}`,
      question: `Question ${i}`,
      answer: `Answer ${i}`,
    }));

    const res = await POST(makeRequest({ answers: tenAnswers }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.done).toBe(true);
    expect(data.questionId).toBe("confirm");
  });

  it("returns 400 for invalid request body", async () => {
    const res = await POST(makeRequest({ wrong: "field" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValueOnce({
      patient: null,
      needsOnboarding: false,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const res = await POST(makeRequest({ answers: [] }));
    expect(res.status).toBe(401);
  });
});

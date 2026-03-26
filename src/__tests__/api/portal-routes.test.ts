// Tests: portal read routes (queue, statistics, symptom-checks)
// These routes delegate to the in-memory store — no LLM calls needed.
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the in-memory store so tests are isolated
vi.mock("@/lib/doctors-patients-store", () => ({
  getQueue: vi.fn().mockReturnValue([
    { id: "q-1", patientId: "p1", patientName: "Alice", urgencyLevel: "high", estimatedWaitTime: 15, status: "waiting", symptomCheckId: "sc-1", checkInTime: new Date().toISOString() },
  ]),
  getStatistics: vi.fn().mockReturnValue({
    totalChecksToday: 3,
    pendingReviews: 2,
    inReview: 1,
    completedToday: 0,
    averageWaitTime: 25,
    criticalCases: 1,
  }),
  getAllSymptomChecks: vi.fn().mockReturnValue([
    { id: "sc-1", patientId: "p1", patientName: "Alice", symptoms: ["headache"], duration: "2 days", additionalInfo: "", aiAssessment: { urgencyLevel: "medium", possibleConditions: [], recommendedAction: "", questionsToAsk: [], confidence: 0.8, reasoning: "" }, status: "pending", createdAt: new Date().toISOString() },
  ]),
  getSymptomChecksByPatient: vi.fn().mockImplementation((id: string) =>
    id === "p1"
      ? [{ id: "sc-1", patientId: "p1", patientName: "Alice", symptoms: ["headache"], duration: "2 days", additionalInfo: "", aiAssessment: { urgencyLevel: "medium", possibleConditions: [], recommendedAction: "", questionsToAsk: [], confidence: 0.8, reasoning: "" }, status: "pending", createdAt: new Date().toISOString() }]
      : []
  ),
  getSymptomCheckById: vi.fn().mockImplementation((id: string) =>
    id === "sc-1"
      ? { id: "sc-1", patientId: "p1", patientName: "Alice", symptoms: ["headache"], duration: "2 days", additionalInfo: "", aiAssessment: { urgencyLevel: "medium", possibleConditions: [], recommendedAction: "", questionsToAsk: [], confidence: 0.8, reasoning: "" }, status: "pending", createdAt: new Date().toISOString() }
      : undefined
  ),
}));

describe("GET /api/portal/queue", () => {
  beforeEach(() => vi.resetModules());

  it("returns 200 with queue array", async () => {
    const { GET } = await import("@/app/api/portal/queue/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].urgencyLevel).toBe("high");
  });
});

describe("GET /api/portal/statistics", () => {
  beforeEach(() => vi.resetModules());

  it("returns 200 with stats object", async () => {
    const { GET } = await import("@/app/api/portal/statistics/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.totalChecksToday).toBe("number");
    expect(typeof body.criticalCases).toBe("number");
  });
});

describe("GET /api/portal/symptom-checks", () => {
  beforeEach(() => vi.resetModules());

  it("returns all checks when no patientId query param", async () => {
    const { GET } = await import("@/app/api/portal/symptom-checks/route");
    const req = new Request("http://localhost/api/portal/symptom-checks");
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("returns filtered checks for a specific patientId", async () => {
    const { GET } = await import("@/app/api/portal/symptom-checks/route");
    const req = new Request("http://localhost/api/portal/symptom-checks?patientId=p1");
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.every((c: { patientId: string }) => c.patientId === "p1")).toBe(true);
  });

  it("returns empty array for unknown patientId", async () => {
    const { GET } = await import("@/app/api/portal/symptom-checks/route");
    const req = new Request("http://localhost/api/portal/symptom-checks?patientId=unknown");
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("GET /api/portal/symptom-checks/[id]", () => {
  beforeEach(() => vi.resetModules());

  it("returns 200 with check when found", async () => {
    const { GET } = await import("@/app/api/portal/symptom-checks/[id]/route");
    const req = new Request("http://localhost/api/portal/symptom-checks/sc-1");
    const res = await GET(req as any, { params: Promise.resolve({ id: "sc-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("sc-1");
  });

  it("returns 404 when check not found", async () => {
    const { GET } = await import("@/app/api/portal/symptom-checks/[id]/route");
    const req = new Request("http://localhost/api/portal/symptom-checks/nonexistent");
    const res = await GET(req as any, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });
});

describe("POST /api/portal/symptom-check validation", () => {
  beforeEach(() => {
    vi.resetModules();
    // Mock the AI analysis to avoid LLM calls
    vi.doMock("@/lib/ai/doctors-patients-ai", () => ({
      analyzeSymptoms: vi.fn().mockResolvedValue({
        urgencyLevel: "low",
        possibleConditions: ["tension headache"],
        recommendedAction: "rest",
        questionsToAsk: [],
        confidence: 0.8,
        reasoning: "mild symptoms",
      }),
    }));
  });

  it("rejects missing patientId", async () => {
    const { POST } = await import("@/app/api/portal/symptom-check/route");
    const req = new Request("http://localhost/api/portal/symptom-check", {
      method: "POST",
      body: JSON.stringify({ patientName: "Alice", symptoms: ["headache"], duration: "2 days" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("rejects empty symptoms array", async () => {
    const { POST } = await import("@/app/api/portal/symptom-check/route");
    const req = new Request("http://localhost/api/portal/symptom-check", {
      method: "POST",
      body: JSON.stringify({ patientId: "p1", patientName: "Alice", symptoms: [], duration: "2 days" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});

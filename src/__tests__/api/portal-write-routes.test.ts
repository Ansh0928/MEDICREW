// Tests: portal write routes (doctor-note, case-consult, case-insights) — validation only
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCheck = {
  id: "sc-1",
  patientId: "p1",
  patientName: "Alice",
  symptoms: ["headache"],
  duration: "2 days",
  additionalInfo: "",
  aiAssessment: { urgencyLevel: "medium", possibleConditions: [], recommendedAction: "", questionsToAsk: [], confidence: 0.8, reasoning: "" },
  status: "pending",
  createdAt: new Date().toISOString(),
};

const mockNote = { id: "dn-1", symptomCheckId: "sc-1", doctorId: "d1", doctorName: "Dr Jones", diagnosis: "migraine", treatment: "", notes: "", createdAt: new Date().toISOString() };

vi.mock("@/lib/doctors-patients-store", () => ({
  addDoctorNote: vi.fn().mockReturnValue(mockNote),
  getSymptomCheckById: vi.fn().mockImplementation((id: string) => id === "sc-1" ? mockCheck : undefined),
  updateSymptomCheckStatus: vi.fn(),
}));

vi.mock("@/agents/doctorConsultation", () => ({
  streamDoctorConsultation: vi.fn(async function* () { yield { type: "done" }; }),
}));

vi.mock("@/lib/ai/doctors-patients-ai", () => ({
  generateDoctorInsights: vi.fn().mockResolvedValue({ summary: "mild migraine" }),
  generateTreatmentPlan: vi.fn().mockResolvedValue({ plan: "paracetamol" }),
}));

describe("POST /api/portal/doctor-note", () => {
  beforeEach(() => vi.resetModules());

  it("rejects missing symptomCheckId", async () => {
    const { POST } = await import("@/app/api/portal/doctor-note/route");
    const res = await POST(new Request("http://localhost/api/portal/doctor-note", {
      method: "POST",
      body: JSON.stringify({ doctorId: "d1", doctorName: "Dr Jones", diagnosis: "migraine" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/symptomCheckId/);
  });

  it("rejects missing diagnosis", async () => {
    const { POST } = await import("@/app/api/portal/doctor-note/route");
    const res = await POST(new Request("http://localhost/api/portal/doctor-note", {
      method: "POST",
      body: JSON.stringify({ symptomCheckId: "sc-1", doctorId: "d1", doctorName: "Dr Jones" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 200 with note on valid input", async () => {
    const { POST } = await import("@/app/api/portal/doctor-note/route");
    const res = await POST(new Request("http://localhost/api/portal/doctor-note", {
      method: "POST",
      body: JSON.stringify({ symptomCheckId: "sc-1", doctorId: "d1", doctorName: "Dr Jones", diagnosis: "migraine" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("dn-1");
  });
});

describe("POST /api/portal/case-consult", () => {
  beforeEach(() => vi.resetModules());

  it("rejects missing symptomCheckId", async () => {
    const { POST } = await import("@/app/api/portal/case-consult/route");
    const res = await POST(new Request("http://localhost/api/portal/case-consult", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/symptomCheckId/);
  });

  it("returns 404 for unknown symptomCheckId", async () => {
    const { POST } = await import("@/app/api/portal/case-consult/route");
    const res = await POST(new Request("http://localhost/api/portal/case-consult", {
      method: "POST",
      body: JSON.stringify({ symptomCheckId: "nonexistent" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(404);
  });

  it("returns SSE stream for valid symptomCheckId", async () => {
    const { POST } = await import("@/app/api/portal/case-consult/route");
    const res = await POST(new Request("http://localhost/api/portal/case-consult", {
      method: "POST",
      body: JSON.stringify({ symptomCheckId: "sc-1" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
  });
});

describe("POST /api/portal/case-insights", () => {
  beforeEach(() => vi.resetModules());

  it("rejects missing symptomCheckId", async () => {
    const { POST } = await import("@/app/api/portal/case-insights/route");
    const res = await POST(new Request("http://localhost/api/portal/case-insights", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown symptomCheckId", async () => {
    const { POST } = await import("@/app/api/portal/case-insights/route");
    const res = await POST(new Request("http://localhost/api/portal/case-insights", {
      method: "POST",
      body: JSON.stringify({ symptomCheckId: "nonexistent" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(404);
  });
});

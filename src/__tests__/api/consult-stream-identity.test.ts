import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    careTeamStatus: { upsert: vi.fn() },
    consultation: { create: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    patientConsent: { findFirst: vi.fn() },
  },
}));

vi.mock("@/agents/orchestrator", () => ({
  runConsultation: vi.fn(),
  streamConsultation: vi.fn(),
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: vi.fn() },
}));

vi.mock("@/lib/consent-check", () => ({
  checkConsent: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthenticatedPatient: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { checkConsent } from "@/lib/consent-check";
import { runConsultation } from "@/agents/orchestrator";
import { inngest } from "@/lib/inngest/client";
import { getAuthenticatedPatient } from "@/lib/auth";

const AUTH_P1 = { patient: { id: "p1" }, error: null };
const AUTH_NONE = {
  patient: null,
  error: new Response(JSON.stringify({ error: "Authentication required" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  }),
};

describe("CONS-01: Consultation stream identity", () => {
  it("POST /api/consult requires authentication", async () => {
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_NONE as any);
    const { POST } = await import("@/app/api/consult/route");
    const req = new Request("http://localhost/api/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symptoms: "headache" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("POST /api/consult returns 401 without patient identification", async () => {
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_NONE as any);
    const { POST } = await import("@/app/api/consult/route");
    const req = new Request("http://localhost/api/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symptoms: "mild back pain" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});

describe("CONS-03: Consultation stream onboarding gate", () => {
  it("POST /api/consult returns 403 when patient has not completed onboarding", async () => {
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
    vi.mocked(checkConsent).mockResolvedValue(false);

    const { POST } = await import("@/app/api/consult/route");
    const req = new Request("http://localhost/api/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symptoms: "headache" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
  });

  it("POST /api/consult proceeds when onboardingComplete is true", async () => {
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
    vi.mocked(checkConsent).mockResolvedValue(true);
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
      id: "p1",
      name: "Test",
      knownConditions: null,
      medications: [],
      age: "30",
      gender: "male",
      allergies: [],
    } as any);
    vi.mocked(runConsultation).mockResolvedValue({
      messages: [],
      urgencyLevel: "routine",
      recommendation: { urgency: "routine", summary: "Fine" },
    } as any);
    vi.mocked(prisma.careTeamStatus.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.consultation.create).mockResolvedValue({
      id: "c1",
    } as any);
    vi.mocked(inngest.send).mockResolvedValue({} as any);

    const { POST } = await import("@/app/api/consult/route");
    const req = new Request("http://localhost/api/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symptoms: "mild headache", stream: false }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });
});

// Tests: /api/patient/referral/generate — Pro gating and letter generation
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockConsultation = {
  id: "consult-1",
  symptoms: "persistent headache and fatigue for 3 days",
  urgencyLevel: "routine",
  redFlags: JSON.stringify(["headache severity increasing"]),
  recommendation: {
    primaryRecommendation: "These symptoms may be consistent with tension-type headache and could warrant a GP review.",
    nextSteps: ["Book a GP appointment", "Monitor symptoms"],
  },
  referralLetter: null,
  referralLetterAt: null,
  createdAt: new Date("2026-04-01T10:00:00Z"),
};

const mockPatientPro = {
  subscriptionPlan: "pro",
  subscriptionStatus: "active",
  name: "Alice Smith",
  dateOfBirth: new Date("1990-01-15"),
  gender: "female",
  knownConditions: "Mild anxiety",
  medications: JSON.stringify(["sertraline 50mg"]),
  allergies: JSON.stringify(["penicillin"]),
};

const mockPatientFree = {
  ...mockPatientPro,
  subscriptionPlan: "free",
  subscriptionStatus: "active",
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findUnique: vi.fn(),
    },
    consultation: {
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getAuthenticatedPatient: vi.fn(),
}));

vi.mock("@/lib/ai/config", () => ({
  createModel: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: "Dear Colleague,\n\nI am writing to refer the above patient...\n\nYours sincerely,\nMediCrew AI Care Team",
    }),
  })),
}));

const AUTH_P1 = { patient: { id: "p1" }, needsOnboarding: false, error: null };
const AUTH_NONE = {
  patient: null,
  needsOnboarding: false,
  error: new Response(JSON.stringify({ error: "Authentication required" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  }),
};
const AUTH_ONBOARDING = {
  patient: { id: "p1" },
  needsOnboarding: true,
  error: null,
};

describe("POST /api/patient/referral/generate", () => {
  beforeEach(() => vi.resetModules());

  it("returns 401 when not authenticated", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_NONE as any);
    const { POST } = await import("@/app/api/patient/referral/generate/route");
    const res = await POST(
      new Request("http://localhost/api/patient/referral/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: "consult-1" }),
      }) as any,
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when onboarding required", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_ONBOARDING as any);
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(mockPatientPro as any);
    const { POST } = await import("@/app/api/patient/referral/generate/route");
    const res = await POST(
      new Request("http://localhost/api/patient/referral/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: "consult-1" }),
      }) as any,
    );
    expect(res.status).toBe(403);
  });

  it("returns 402 for free tier patients", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(mockPatientFree as any);
    const { POST } = await import("@/app/api/patient/referral/generate/route");
    const res = await POST(
      new Request("http://localhost/api/patient/referral/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: "consult-1" }),
      }) as any,
    );
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.upgradeUrl).toBe("/pricing");
  });

  it("returns 400 when consultationId is missing", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(mockPatientPro as any);
    const { POST } = await import("@/app/api/patient/referral/generate/route");
    const res = await POST(
      new Request("http://localhost/api/patient/referral/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }) as any,
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when consultation not found or not owned", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(mockPatientPro as any);
    vi.mocked(prisma.consultation.findFirst).mockResolvedValue(null);
    const { POST } = await import("@/app/api/patient/referral/generate/route");
    const res = await POST(
      new Request("http://localhost/api/patient/referral/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: "nonexistent" }),
      }) as any,
    );
    expect(res.status).toBe(404);
  });

  it("returns cached letter if already generated", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(mockPatientPro as any);
    const cachedLetter = "Dear Colleague, Previously generated letter...";
    vi.mocked(prisma.consultation.findFirst).mockResolvedValue({
      ...mockConsultation,
      referralLetter: cachedLetter,
      referralLetterAt: new Date("2026-04-02T10:00:00Z"),
    } as any);
    const { POST } = await import("@/app/api/patient/referral/generate/route");
    const res = await POST(
      new Request("http://localhost/api/patient/referral/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: "consult-1" }),
      }) as any,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cached).toBe(true);
    expect(body.letter).toBe(cachedLetter);
  });

  it("generates and persists a new letter for Pro patients", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(mockPatientPro as any);
    vi.mocked(prisma.consultation.findFirst).mockResolvedValue(mockConsultation as any);
    const { POST } = await import("@/app/api/patient/referral/generate/route");
    const res = await POST(
      new Request("http://localhost/api/patient/referral/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: "consult-1" }),
      }) as any,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cached).toBe(false);
    expect(typeof body.letter).toBe("string");
    expect(body.letter.length).toBeGreaterThan(0);
    // Verify letter was persisted
    expect(prisma.consultation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "consult-1" },
        data: expect.objectContaining({ referralLetter: body.letter }),
      }),
    );
  });

  it("letter content does not contain diagnosis claims", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(mockPatientPro as any);
    vi.mocked(prisma.consultation.findFirst).mockResolvedValue(mockConsultation as any);
    const { POST } = await import("@/app/api/patient/referral/generate/route");
    const res = await POST(
      new Request("http://localhost/api/patient/referral/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: "consult-1" }),
      }) as any,
    );
    const body = await res.json();
    // Verify the mocked LLM response doesn't include forbidden diagnosis language
    expect(body.letter).not.toMatch(/you have [a-z]/i);
    expect(body.letter).not.toMatch(/the patient has [a-z]/i);
  });
});

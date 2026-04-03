import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getAuthenticatedPatient: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

const AUTH_P1 = { patient: { id: "p1" }, error: null };
const AUTH_NONE = {
  patient: null,
  error: new Response(JSON.stringify({ error: "Authentication required" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  }),
};

const BASE_BODY = {
  dateOfBirth: "1990-01-15",
  gender: "male",
  knownConditions: "Hypertension",
  medications: ["Lisinopril"],
  allergies: ["Penicillin"],
};

beforeEach(() => {
  vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
});

describe("ONBD-01: Patient onboarding API", () => {
  it("POST /api/patient/onboarding saves dateOfBirth, gender, knownConditions, medications, allergies", async () => {
    vi.mocked(prisma.patient.update).mockResolvedValue({
      id: "p1",
      dateOfBirth: new Date("1990-01-15"),
      gender: "male",
      knownConditions: "Hypertension",
      medications: ["Lisinopril"],
      allergies: ["Penicillin"],
      onboardingComplete: true,
    } as any);

    const { POST } = await import("@/app/api/patient/onboarding/route");
    const req = new Request("http://localhost/api/patient/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(BASE_BODY),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gender: "male",
          knownConditions: "Hypertension",
          medications: JSON.stringify(["Lisinopril"]),
          allergies: JSON.stringify(["Penicillin"]),
        }),
      }),
    );
  });

  it("POST /api/patient/onboarding saves emergencyContact and gpDetails as JSON", async () => {
    const ec = { name: "Jane", phone: "0400000000", relationship: "Spouse" };
    const gp = {
      name: "Dr Smith",
      practice: "City Clinic",
      phone: "0398000000",
    };
    vi.mocked(prisma.patient.update).mockResolvedValue({ id: "p1" } as any);

    const { POST } = await import("@/app/api/patient/onboarding/route");
    const req = new Request("http://localhost/api/patient/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...BASE_BODY,
        emergencyContact: ec,
        gpDetails: gp,
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emergencyContact: ec,
          gpDetails: gp,
        }),
      }),
    );
  });

  it("POST /api/patient/onboarding sets onboardingComplete to true", async () => {
    vi.mocked(prisma.patient.update).mockResolvedValue({
      id: "p1",
      onboardingComplete: true,
    } as any);

    const { POST } = await import("@/app/api/patient/onboarding/route");
    const req = new Request("http://localhost/api/patient/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(BASE_BODY),
    });
    await POST(req as any);
    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ onboardingComplete: true }),
      }),
    );
  });

  it("POST /api/patient/onboarding returns 400 when required fields are missing", async () => {
    const { POST } = await import("@/app/api/patient/onboarding/route");
    const req = new Request("http://localhost/api/patient/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ knownConditions: "none" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("POST /api/patient/onboarding returns 401 without authentication", async () => {
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_NONE as any);
    const { POST } = await import("@/app/api/patient/onboarding/route");
    const req = new Request("http://localhost/api/patient/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(BASE_BODY),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });
});

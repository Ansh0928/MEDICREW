// Tests: clinic access scoping for all doctor detail routes
// Verifies that auto-assign is removed and unassigned/cross-clinic patients return 404.
import { describe, it, expect, vi, beforeEach } from "vitest";

const CLINIC_A = "clinic-a";
const CLINIC_B = "clinic-b";

const mockDoctor = {
  id: "doctor-1",
  name: "Dr Smith",
  email: "smith@test.com",
  specialty: "GP",
  clerkUserId: "user-1",
  clinicId: CLINIC_A,
  createdAt: new Date(),
};

const mockPatientSameClinic = {
  id: "patient-1",
  name: "Alice",
  email: "alice@test.com",
  dateOfBirth: null,
  gender: "female",
  knownConditions: null,
  medications: null,
  allergies: null,
  onboardingComplete: true,
  clinicId: CLINIC_A,
  consultations: [],
};

const mockConsultationSameClinic = {
  id: "consult-1",
  patientId: "patient-1",
  symptoms: "headache",
  urgencyLevel: "routine",
  redFlags: null,
  recommendation: null,
  createdAt: new Date(),
  patient: { clinicId: CLINIC_A },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    doctor: {
      findFirst: vi.fn().mockResolvedValue(mockDoctor),
    },
    patient: {
      findUnique: vi.fn().mockResolvedValue(mockPatientSameClinic),
      update: vi.fn(),
    },
    consultation: {
      findUnique: vi.fn().mockResolvedValue(mockConsultationSameClinic),
    },
    referralToken: {
      create: vi.fn().mockResolvedValue({ token: "tok-123" }),
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({
    userId: "user-1",
    sessionClaims: { publicMetadata: { role: "doctor" } },
  }),
}));

// ─── GET /api/doctor/patients/[id] ───────────────────────────────────────────

describe("GET /api/doctor/patients/[id]", () => {
  beforeEach(() => vi.resetModules());

  it("returns 403 when doctor has no clinic", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.doctor.findFirst).mockResolvedValueOnce({
      ...mockDoctor,
      clinicId: null,
    });
    const { GET } = await import("@/app/api/doctor/patients/[id]/route");
    const res = await GET(new Request("http://localhost") as any, {
      params: Promise.resolve({ id: "patient-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 for unassigned patient (regression: was auto-assign)", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.patient.findUnique).mockResolvedValueOnce({
      ...mockPatientSameClinic,
      clinicId: null,
    });
    const { GET } = await import("@/app/api/doctor/patients/[id]/route");
    const res = await GET(new Request("http://localhost") as any, {
      params: Promise.resolve({ id: "patient-1" }),
    });
    expect(res.status).toBe(404);
    // Must NOT have called patient.update (no auto-assign)
    const { prisma: p } = await import("@/lib/prisma");
    expect(p.patient.update).not.toHaveBeenCalled();
  });

  it("returns 404 for cross-clinic patient", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.patient.findUnique).mockResolvedValueOnce({
      ...mockPatientSameClinic,
      clinicId: CLINIC_B,
    });
    const { GET } = await import("@/app/api/doctor/patients/[id]/route");
    const res = await GET(new Request("http://localhost") as any, {
      params: Promise.resolve({ id: "patient-1" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 for patient in same clinic", async () => {
    const { GET } = await import("@/app/api/doctor/patients/[id]/route");
    const res = await GET(new Request("http://localhost") as any, {
      params: Promise.resolve({ id: "patient-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("patient-1");
    // clinicId must not be exposed in response
    expect(body.clinicId).toBeUndefined();
  });
});

// ─── GET /api/doctor/consultations/[id] ──────────────────────────────────────

describe("GET /api/doctor/consultations/[id]", () => {
  beforeEach(() => vi.resetModules());

  it("returns 403 when doctor has no clinic", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.doctor.findFirst).mockResolvedValueOnce({
      ...mockDoctor,
      clinicId: null,
    });
    const { GET } = await import("@/app/api/doctor/consultations/[id]/route");
    const res = await GET(new Request("http://localhost") as any, {
      params: Promise.resolve({ id: "consult-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 for unassigned patient (regression: was auto-assign)", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.consultation.findUnique).mockResolvedValueOnce({
      ...mockConsultationSameClinic,
      patient: { clinicId: null },
    });
    const { GET } = await import("@/app/api/doctor/consultations/[id]/route");
    const res = await GET(new Request("http://localhost") as any, {
      params: Promise.resolve({ id: "consult-1" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 for cross-clinic patient", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.consultation.findUnique).mockResolvedValueOnce({
      ...mockConsultationSameClinic,
      patient: { clinicId: CLINIC_B },
    });
    const { GET } = await import("@/app/api/doctor/consultations/[id]/route");
    const res = await GET(new Request("http://localhost") as any, {
      params: Promise.resolve({ id: "consult-1" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 for consultation in same clinic", async () => {
    const { GET } = await import("@/app/api/doctor/consultations/[id]/route");
    const res = await GET(new Request("http://localhost") as any, {
      params: Promise.resolve({ id: "consult-1" }),
    });
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/doctor/referral/token ─────────────────────────────────────────

describe("POST /api/doctor/referral/token", () => {
  beforeEach(() => vi.resetModules());

  const makeRequest = () =>
    new Request("http://localhost/api/doctor/referral/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultationId: "consult-1" }),
    });

  it("returns 403 when doctor has no clinic", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.doctor.findFirst).mockResolvedValueOnce({
      ...mockDoctor,
      clinicId: null,
    });
    const { POST } = await import("@/app/api/doctor/referral/token/route");
    const res = await POST(makeRequest() as any);
    expect(res.status).toBe(403);
  });

  it("returns 404 for unassigned patient (regression: was auto-assign)", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.consultation.findUnique).mockResolvedValueOnce({
      ...mockConsultationSameClinic,
      patient: { clinicId: null },
    });
    const { POST } = await import("@/app/api/doctor/referral/token/route");
    const res = await POST(makeRequest() as any);
    expect(res.status).toBe(404);
  });

  it("returns 404 for cross-clinic patient", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.consultation.findUnique).mockResolvedValueOnce({
      ...mockConsultationSameClinic,
      patient: { clinicId: CLINIC_B },
    });
    const { POST } = await import("@/app/api/doctor/referral/token/route");
    const res = await POST(makeRequest() as any);
    expect(res.status).toBe(404);
  });

  it("returns 200 for same-clinic consultation", async () => {
    const { POST } = await import("@/app/api/doctor/referral/token/route");
    const res = await POST(makeRequest() as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe("tok-123");
  });
});

// ─── POST /api/doctor/notes/generate ─────────────────────────────────────────

describe("POST /api/doctor/notes/generate", () => {
  beforeEach(() => vi.resetModules());

  const makeRequest = () =>
    new Request("http://localhost/api/doctor/notes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultationId: "consult-1" }),
    });

  it("returns 403 when doctor has no clinic", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.doctor.findFirst).mockResolvedValueOnce({
      ...mockDoctor,
      clinicId: null,
    });
    const { POST } = await import("@/app/api/doctor/notes/generate/route");
    const res = await POST(makeRequest() as any);
    expect(res.status).toBe(403);
  });

  it("returns 404 for unassigned patient (regression: was auto-assign)", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.consultation.findUnique).mockResolvedValueOnce({
      ...mockConsultationSameClinic,
      patient: { clinicId: null },
    });
    const { POST } = await import("@/app/api/doctor/notes/generate/route");
    const res = await POST(makeRequest() as any);
    expect(res.status).toBe(404);
  });

  it("returns 404 for cross-clinic patient", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.consultation.findUnique).mockResolvedValueOnce({
      ...mockConsultationSameClinic,
      patient: { clinicId: CLINIC_B },
    });
    const { POST } = await import("@/app/api/doctor/notes/generate/route");
    const res = await POST(makeRequest() as any);
    expect(res.status).toBe(404);
  });
});

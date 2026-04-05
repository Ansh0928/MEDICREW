// Tests: /api/doctors and /api/doctor/monitoring validation
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDoctor = {
  id: "doctor-1",
  name: "Dr Smith",
  email: "smith@test.com",
  specialty: "GP",
  clerkUserId: "user-1",
  clinicId: "clinic-1",
  createdAt: new Date(),
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    doctor: {
      findMany: vi.fn().mockResolvedValue([mockDoctor]),
      create: vi.fn().mockResolvedValue({
        id: "d2",
        name: "Dr Jones",
        email: "jones@test.com",
        specialty: "Cardiology",
      }),
      upsert: vi.fn().mockResolvedValue({
        id: "d2",
        name: "Dr Jones",
        email: "jones@test.com",
        specialty: "Cardiology",
      }),
      findUnique: vi.fn().mockResolvedValue(mockDoctor),
      findFirst: vi.fn().mockResolvedValue(mockDoctor),
    },
    patient: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

describe("GET /api/doctors", () => {
  beforeEach(() => vi.resetModules());

  it("returns 410 deprecated", async () => {
    const { GET } = await import("@/app/api/doctors/route");
    const res = await GET();
    expect(res.status).toBe(410);
  });
});

describe("POST /api/doctors", () => {
  beforeEach(() => vi.resetModules());

  it("returns 410 deprecated", async () => {
    const { POST } = await import("@/app/api/doctors/route");
    const res = await POST(
      new Request("http://localhost/api/doctors", {
        method: "POST",
        body: JSON.stringify({
          name: "Dr Jones",
          email: "jones@test.com",
          specialty: "Cardiology",
        }),
        headers: { "Content-Type": "application/json" },
      }) as any,
    );
    expect(res.status).toBe(410);
  });
});

describe("GET /api/doctor/monitoring", () => {
  beforeEach(() => vi.resetModules());

  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);
    const { GET } = await import("@/app/api/doctor/monitoring/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no Doctor record in DB", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: "non-doctor-user" } as any);
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.doctor.findFirst).mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/doctor/monitoring/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 200 with patient array for authenticated doctor with clinic", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({
      userId: "user-1",
      sessionClaims: { publicMetadata: { role: "doctor" } },
    } as any);
    const { GET } = await import("@/app/api/doctor/monitoring/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 403 when doctor has no clinic assigned", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({
      userId: "user-1",
      sessionClaims: { publicMetadata: { role: "doctor" } },
    } as any);
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.doctor.findFirst).mockResolvedValueOnce({
      ...mockDoctor,
      clinicId: null,
    });
    const { GET } = await import("@/app/api/doctor/monitoring/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });
});

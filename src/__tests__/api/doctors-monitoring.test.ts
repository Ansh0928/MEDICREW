// Tests: /api/doctors and /api/doctor/monitoring validation
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    doctor: {
      findMany: vi.fn().mockResolvedValue([
        { id: "d1", name: "Dr Smith", email: "smith@test.com", specialty: "GP" },
      ]),
      create: vi.fn().mockResolvedValue({ id: "d2", name: "Dr Jones", email: "jones@test.com", specialty: "Cardiology" }),
      upsert: vi.fn().mockResolvedValue({ id: "d2", name: "Dr Jones", email: "jones@test.com", specialty: "Cardiology" }),
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
    const res = await POST(new Request("http://localhost/api/doctors", {
      method: "POST",
      body: JSON.stringify({ name: "Dr Jones", email: "jones@test.com", specialty: "Cardiology" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
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

  it("returns 200 with patient array (monitoring dashboard) for authenticated user", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({ userId: "doctor-1" } as any);
    const { GET } = await import("@/app/api/doctor/monitoring/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

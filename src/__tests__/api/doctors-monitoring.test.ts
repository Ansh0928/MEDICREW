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

describe("GET /api/doctors", () => {
  beforeEach(() => vi.resetModules());

  it("returns 200 with doctor array", async () => {
    const { GET } = await import("@/app/api/doctors/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].name).toBe("Dr Smith");
  });
});

describe("POST /api/doctors", () => {
  beforeEach(() => vi.resetModules());

  it("returns 400 when name is missing", async () => {
    const { POST } = await import("@/app/api/doctors/route");
    const res = await POST(new Request("http://localhost/api/doctors", {
      method: "POST",
      body: JSON.stringify({ email: "jones@test.com", specialty: "Cardiology" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Name|email|specialty/i);
  });

  it("returns 400 when specialty is missing", async () => {
    const { POST } = await import("@/app/api/doctors/route");
    const res = await POST(new Request("http://localhost/api/doctors", {
      method: "POST",
      body: JSON.stringify({ name: "Dr Jones", email: "jones@test.com" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 200/201 with created doctor on valid input", async () => {
    const { POST } = await import("@/app/api/doctors/route");
    const res = await POST(new Request("http://localhost/api/doctors", {
      method: "POST",
      body: JSON.stringify({ name: "Dr Jones", email: "jones@test.com", specialty: "Cardiology" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect([200, 201]).toContain(res.status);
    const body = await res.json();
    expect(body.name).toBe("Dr Jones");
  });
});

describe("GET /api/doctor/monitoring", () => {
  beforeEach(() => vi.resetModules());

  it("returns 200 with patient array (monitoring dashboard)", async () => {
    const { GET } = await import("@/app/api/doctor/monitoring/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

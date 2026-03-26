// Tests: /api/consultations and /api/patients — validation guards
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    consultation: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "c-1", patientId: "p1", symptoms: "headache", createdAt: new Date().toISOString() }),
    },
    patient: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({ id: "p1", email: "alice@test.com", name: "Alice" }),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: "p1", name: "Alice Updated" }),
    },
  },
}));

describe("GET /api/consultations", () => {
  beforeEach(() => vi.resetModules());

  it("returns 400 when patientId is missing", async () => {
    const { GET } = await import("@/app/api/consultations/route");
    const res = await GET(new Request("http://localhost/api/consultations") as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Patient ID/i);
  });

  it("returns 200 with array for valid patientId", async () => {
    const { GET } = await import("@/app/api/consultations/route");
    const res = await GET(new Request("http://localhost/api/consultations?patientId=p1") as any);
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});

describe("POST /api/consultations", () => {
  beforeEach(() => vi.resetModules());

  it("returns 400 when patientId is missing", async () => {
    const { POST } = await import("@/app/api/consultations/route");
    const res = await POST(new Request("http://localhost/api/consultations", {
      method: "POST",
      body: JSON.stringify({ symptoms: "headache" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when symptoms is missing", async () => {
    const { POST } = await import("@/app/api/consultations/route");
    const res = await POST(new Request("http://localhost/api/consultations", {
      method: "POST",
      body: JSON.stringify({ patientId: "p1" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 200/201 with consultation on valid input", async () => {
    const { POST } = await import("@/app/api/consultations/route");
    const res = await POST(new Request("http://localhost/api/consultations", {
      method: "POST",
      body: JSON.stringify({ patientId: "p1", symptoms: "headache for 3 days" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect([200, 201]).toContain(res.status);
    const body = await res.json();
    expect(body.id).toBe("c-1");
  });
});

describe("GET /api/patients", () => {
  beforeEach(() => vi.resetModules());

  it("returns 200 with patient array", async () => {
    const { GET } = await import("@/app/api/patients/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});

describe("POST /api/patients", () => {
  beforeEach(() => vi.resetModules());

  it("returns 400 when email is missing", async () => {
    const { POST } = await import("@/app/api/patients/route");
    const res = await POST(new Request("http://localhost/api/patients", {
      method: "POST",
      body: JSON.stringify({ name: "Alice" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Email/i);
  });

  it("returns 400 when name is missing", async () => {
    const { POST } = await import("@/app/api/patients/route");
    const res = await POST(new Request("http://localhost/api/patients", {
      method: "POST",
      body: JSON.stringify({ email: "alice@test.com" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 200/201 on valid patient upsert", async () => {
    const { POST } = await import("@/app/api/patients/route");
    const res = await POST(new Request("http://localhost/api/patients", {
      method: "POST",
      body: JSON.stringify({ email: "alice@test.com", name: "Alice" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect([200, 201]).toContain(res.status);
    const body = await res.json();
    expect(body.email).toBe("alice@test.com");
  });
});

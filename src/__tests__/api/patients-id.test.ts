// Tests: /api/patients/[id] GET and PATCH
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPatient = {
  id: "p1",
  email: "alice@test.com",
  name: "Alice",
  consultations: [],
  notifications: [],
  careTeamStatus: [],
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findUnique: vi.fn().mockResolvedValue(mockPatient),
      update: vi.fn().mockResolvedValue({ ...mockPatient, name: "Alice Updated" }),
    },
  },
}));

describe("GET /api/patients/[id]", () => {
  beforeEach(() => vi.resetModules());

  it("returns 200 with patient when found", async () => {
    const { GET } = await import("@/app/api/patients/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/patients/p1") as any,
      { params: Promise.resolve({ id: "p1" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("p1");
  });

  it("returns 404 when patient not found", async () => {
    const { prisma } = await import("@/lib/prisma");
    (prisma.patient.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/patients/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/patients/nonexistent") as any,
      { params: Promise.resolve({ id: "nonexistent" }) }
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });
});


import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      update: vi.fn(),
      findUnique: vi.fn(),
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

beforeEach(() => {
  vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
});

describe("COMP-05b: Account deletion", () => {
  test("soft delete sets deletedAt and anonymises email", async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
      id: "p1",
      email: "original@example.com",
    } as any);

    vi.mocked(prisma.patient.update).mockResolvedValue({
      id: "p1",
      email: "deleted-p1@medicrew.au",
      deletedAt: new Date(),
    } as any);

    const { DELETE } = await import("@/app/api/patient/route");
    const req = new Request("http://localhost/api/patient", {
      method: "DELETE",
    });
    const res = await DELETE(req as any);
    expect(res.status).toBe(200);

    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({
          email: "deleted-p1@medicrew.au",
        }),
      }),
    );
  });

  test("delete returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_NONE as any);
    const { DELETE } = await import("@/app/api/patient/route");
    const req = new Request("http://localhost/api/patient", {
      method: "DELETE",
    });
    const res = await DELETE(req as any);
    expect(res.status).toBe(401);
  });
});

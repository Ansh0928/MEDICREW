import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    careTeamStatus: {
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

describe("DASH-01: Care team status API", () => {
  it("GET /api/patient/care-team-status returns per-agent status messages", async () => {
    vi.mocked(prisma.careTeamStatus.findUnique).mockResolvedValue({
      statuses: {
        gp: {
          agentName: "Alex AI — GP",
          message: "Reviewed your symptoms",
          updatedAt: new Date().toISOString(),
        },
        cardiology: {
          agentName: "Sarah AI — Cardiology",
          message: "No cardiac concerns",
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date(),
    } as any);

    const { GET } = await import("@/app/api/patient/care-team-status/route");
    const req = new Request("http://localhost/api/patient/care-team-status");
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.statuses).toHaveProperty("gp");
    expect(body.statuses.gp).toHaveProperty("agentName", "Alex AI — GP");
  });

  it("GET /api/patient/care-team-status returns 401 without authentication", async () => {
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_NONE as any);
    const { GET } = await import("@/app/api/patient/care-team-status/route");
    const req = new Request("http://localhost/api/patient/care-team-status");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("GET /api/patient/care-team-status returns empty statuses for new patient", async () => {
    vi.mocked(getAuthenticatedPatient).mockResolvedValue({
      patient: { id: "new-patient" },
      error: null,
    } as any);
    vi.mocked(prisma.careTeamStatus.findUnique).mockResolvedValue(null);

    const { GET } = await import("@/app/api/patient/care-team-status/route");
    const req = new Request("http://localhost/api/patient/care-team-status");
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.statuses).toEqual({});
  });
});

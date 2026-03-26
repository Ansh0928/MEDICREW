import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getAuthenticatedPatient: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

const AUTH_P1 = { patient: { id: 'p1' }, error: null };
const AUTH_NONE = {
  patient: null,
  error: new Response(JSON.stringify({ error: 'Authentication required' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  }),
};

beforeEach(() => {
  vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
});

describe("COMP-05a: Patient data export", () => {
  test("export includes patient, consultations, notifications, and consents", async () => {
    const mockPatient = {
      id: "p1",
      name: "Test User",
      email: "test@example.com",
      consultations: [{ id: "c1", symptoms: "headache" }],
      notifications: [{ id: "n1", title: "Check-in" }],
      consents: [{ id: "consent1", consentVersion: "1.0" }],
    };
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(mockPatient as any);

    const { GET } = await import("@/app/api/patient/export/route");
    const req = new Request("http://localhost/api/patient/export");
    const res = await GET(req as any);
    const data = await res.json();

    expect(data).toHaveProperty("patient");
    expect(data).toHaveProperty("consultations");
    expect(data).toHaveProperty("notifications");
    expect(data).toHaveProperty("consents");
  });

  test("export returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_NONE as any);
    const { GET } = await import("@/app/api/patient/export/route");
    const req = new Request("http://localhost/api/patient/export");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });
});

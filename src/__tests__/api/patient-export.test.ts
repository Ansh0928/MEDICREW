import { describe, test, expect, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

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

    // Import the handler dynamically to pick up mocks
    const { GET } = await import("@/app/api/patient/export/route");
    const req = new Request("http://localhost/api/patient/export", {
      headers: { "x-patient-id": "p1" },
    });
    const res = await GET(req as any);
    const data = await res.json();

    expect(data).toHaveProperty("patient");
    expect(data).toHaveProperty("consultations");
    expect(data).toHaveProperty("notifications");
    expect(data).toHaveProperty("consents");
  });

  test("export returns 401 when no patient ID", async () => {
    const { GET } = await import("@/app/api/patient/export/route");
    const req = new Request("http://localhost/api/patient/export");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });
});

import { describe, test, expect, vi } from "vitest";
import { checkConsent } from "@/lib/consent-check";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    patientConsent: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("COMP-04: Consent gate", () => {
  test("checkConsent returns false when no PatientConsent record exists", async () => {
    vi.mocked(prisma.patientConsent.findFirst).mockResolvedValue(null);
    const result = await checkConsent("patient-123");
    expect(result).toBe(false);
  });

  test("checkConsent returns true when valid PatientConsent record exists", async () => {
    vi.mocked(prisma.patientConsent.findFirst).mockResolvedValue({
      id: "consent-1",
      patientId: "patient-123",
      consentedAt: new Date(),
      consentVersion: "1.0",
      dataCategories: {},
      createdAt: new Date(),
    } as any);
    const result = await checkConsent("patient-123");
    expect(result).toBe(true);
  });

  test("checkConsent queries for consentVersion 1.0", async () => {
    vi.mocked(prisma.patientConsent.findFirst).mockResolvedValue(null);
    await checkConsent("patient-123");
    expect(prisma.patientConsent.findFirst).toHaveBeenCalledWith({
      where: { patientId: "patient-123", consentVersion: "1.0" },
    });
  });
});

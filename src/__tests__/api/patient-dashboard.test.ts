import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    consultation: { findMany: vi.fn() },
    careTeamStatus: { findUnique: vi.fn() },
    notification: { findMany: vi.fn() },
    checkIn: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  getAuthenticatedPatient: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

const AUTHED = {
  patient: { id: "pat-1" },
  needsOnboarding: false,
  error: null,
};

const UNAUTHED = {
  patient: null,
  needsOnboarding: false,
  error: new Response(JSON.stringify({ error: "Authentication required" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  }),
};

const NEEDS_ONBOARDING = {
  patient: null,
  needsOnboarding: true,
  error: null,
};

const PROFILE = {
  id: "pat-1",
  name: "Jane Smith",
  gender: "female",
  knownConditions: "none",
  onboardingComplete: true,
  subscriptionPlan: "free",
  subscriptionStatus: "active",
  stripeCustomerId: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTHED as never);
  vi.mocked(prisma.patient.findUnique).mockResolvedValue(PROFILE as never);
  vi.mocked(prisma.consultation.findMany).mockResolvedValue([]);
  vi.mocked(prisma.careTeamStatus.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
  vi.mocked(prisma.checkIn.findMany).mockResolvedValue([]);
});

describe("GET /api/patient/dashboard", () => {
  test("returns all dashboard data in a single response", async () => {
    const consultations = [
      {
        id: "c1",
        symptoms: "headache",
        urgencyLevel: "routine",
        recommendation: null,
        createdAt: new Date().toISOString(),
      },
    ];
    const notifications = [
      {
        id: "n1",
        title: "Check-in due",
        message: "How are you?",
        type: "checkin",
        read: false,
        createdAt: new Date().toISOString(),
        doctor: { id: "doc-1", name: "Dr. Alex AI" },
      },
    ];
    const checkIns = [{ id: "ci1", notificationId: "n1", status: "pending" }];

    vi.mocked(prisma.consultation.findMany).mockResolvedValue(
      consultations as never,
    );
    vi.mocked(prisma.notification.findMany).mockResolvedValue(
      notifications as never,
    );
    vi.mocked(prisma.checkIn.findMany).mockResolvedValue(checkIns as never);

    const { GET } = await import("@/app/api/patient/dashboard/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.profile.id).toBe("pat-1");
    expect(body.profile.name).toBe("Jane Smith");
    expect(body.consultations).toHaveLength(1);
    expect(body.consultations[0].id).toBe("c1");
    expect(body.notifications).toHaveLength(1);
    expect(body.notifications[0].id).toBe("n1");
    expect(body.checkIns).toHaveLength(1);
    expect(body.careTeamStatus.statuses).toEqual({});
  });

  test("returns 401 when unauthenticated", async () => {
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(UNAUTHED as never);
    const { GET } = await import("@/app/api/patient/dashboard/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  test("returns 403 with redirect when onboarding is required", async () => {
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(
      NEEDS_ONBOARDING as never,
    );
    const { GET } = await import("@/app/api/patient/dashboard/route");
    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.redirect).toBe("/onboarding");
  });

  test("returns 404 when patient record not in DB", async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null);
    const { GET } = await import("@/app/api/patient/dashboard/route");
    const res = await GET();
    expect(res.status).toBe(404);
  });

  test("returns empty arrays when patient has no consultations or notifications", async () => {
    const { GET } = await import("@/app/api/patient/dashboard/route");
    const res = await GET();
    const body = await res.json();
    expect(body.consultations).toEqual([]);
    expect(body.notifications).toEqual([]);
    expect(body.checkIns).toEqual([]);
    expect(body.careTeamStatus.statuses).toEqual({});
  });

  test("returns care team statuses when they exist", async () => {
    const statuses = {
      gp: {
        agentName: "Dr. Alex AI",
        message: "Reviewed",
        updatedAt: new Date().toISOString(),
      },
    };
    vi.mocked(prisma.careTeamStatus.findUnique).mockResolvedValue({
      statuses,
      updatedAt: new Date(),
    } as never);

    const { GET } = await import("@/app/api/patient/dashboard/route");
    const res = await GET();
    const body = await res.json();
    expect(body.careTeamStatus.statuses).toEqual(statuses);
  });

  test("runs all 5 Prisma queries for a single authenticated request", async () => {
    const { GET } = await import("@/app/api/patient/dashboard/route");
    await GET();

    expect(prisma.patient.findUnique).toHaveBeenCalledOnce();
    expect(prisma.consultation.findMany).toHaveBeenCalledOnce();
    expect(prisma.careTeamStatus.findUnique).toHaveBeenCalledOnce();
    expect(prisma.notification.findMany).toHaveBeenCalledOnce();
    expect(prisma.checkIn.findMany).toHaveBeenCalledOnce();
  });

  test("returns 500 when a DB query throws (Neon connection failure)", async () => {
    vi.mocked(prisma.consultation.findMany).mockRejectedValue(
      new Error("Connection timeout"),
    );
    const { GET } = await import("@/app/api/patient/dashboard/route");
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to load dashboard data");
  });

  test("notifications are limited to 50 and use select (not include)", async () => {
    const { GET } = await import("@/app/api/patient/dashboard/route");
    await GET();
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        select: expect.objectContaining({
          id: true,
          doctor: expect.objectContaining({ select: { id: true, name: true } }),
        }),
      }),
    );
  });

  test("checkIns are limited to 20", async () => {
    const { GET } = await import("@/app/api/patient/dashboard/route");
    await GET();
    expect(prisma.checkIn.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    );
  });
});

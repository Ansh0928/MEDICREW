// Tests: /api/checkin and /api/checkin/respond validation
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    checkIn: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    patient: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    notification: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock("@/lib/email/resend", () => ({
  sendEscalationEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@upstash/redis", () => {
  class Redis { static fromEnv() { return new Redis(); } }
  return { Redis };
});
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    limit = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
    static slidingWindow = vi.fn().mockReturnValue({ type: "sliding" });
  }
  return { Ratelimit };
});

describe("GET /api/checkin", () => {
  beforeEach(() => vi.resetModules());

  it("returns 400 when patientId is missing", async () => {
    const { GET } = await import("@/app/api/checkin/route");
    const res = await GET(new Request("http://localhost/api/checkin") as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/patientId/);
  });

  it("returns 200 with array when patientId present", async () => {
    const { prisma } = await import("@/lib/prisma");
    (prisma.checkIn.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "ci-1", notificationId: "n-1", status: "pending" },
    ]);
    const { GET } = await import("@/app/api/checkin/route");
    const res = await GET(new Request("http://localhost/api/checkin?patientId=p1") as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("POST /api/checkin/respond", () => {
  beforeEach(() => vi.resetModules());

  it("returns 401 when x-patient-id header is missing", async () => {
    const { POST } = await import("@/app/api/checkin/respond/route");
    const res = await POST(new Request("http://localhost/api/checkin/respond", {
      method: "POST",
      body: JSON.stringify({ checkInId: "ci-1", response: "better" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(401);
  });

  it("returns 400 when checkInId is missing", async () => {
    const { POST } = await import("@/app/api/checkin/respond/route");
    const res = await POST(new Request("http://localhost/api/checkin/respond", {
      method: "POST",
      body: JSON.stringify({ response: "better" }),
      headers: { "Content-Type": "application/json", "x-patient-id": "p1" },
    }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/checkInId/);
  });

  it("returns 400 for invalid response value", async () => {
    const { POST } = await import("@/app/api/checkin/respond/route");
    const res = await POST(new Request("http://localhost/api/checkin/respond", {
      method: "POST",
      body: JSON.stringify({ checkInId: "ci-1", response: "excellent" }),
      headers: { "Content-Type": "application/json", "x-patient-id": "p1" },
    }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/better.*same.*worse/i);
  });

  it("returns 404 when check-in not found or wrong patient", async () => {
    const { POST } = await import("@/app/api/checkin/respond/route");
    const res = await POST(new Request("http://localhost/api/checkin/respond", {
      method: "POST",
      body: JSON.stringify({ checkInId: "nonexistent", response: "better" }),
      headers: { "Content-Type": "application/json", "x-patient-id": "p1" },
    }) as any);
    expect(res.status).toBe(404);
  });
});

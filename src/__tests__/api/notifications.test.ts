// Tests: /api/notifications validation
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: vi.fn().mockResolvedValue([
        { id: "n-1", patientId: "p1", title: "Check-in", message: "How are you?", type: "check-in" },
      ]),
      create: vi.fn().mockResolvedValue({ id: "n-2", patientId: "p1", title: "Alert", message: "Test", type: "info" }),
    },
  },
}));

describe("GET /api/notifications", () => {
  beforeEach(() => vi.resetModules());

  it("returns 400 when patientId is missing", async () => {
    const { GET } = await import("@/app/api/notifications/route");
    const res = await GET(new Request("http://localhost/api/notifications") as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Patient ID/i);
  });

  it("returns 200 with notifications for valid patientId", async () => {
    const { GET } = await import("@/app/api/notifications/route");
    const res = await GET(new Request("http://localhost/api/notifications?patientId=p1") as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("POST /api/notifications", () => {
  beforeEach(() => vi.resetModules());

  it("returns 400 when patientId is missing", async () => {
    const { POST } = await import("@/app/api/notifications/route");
    const res = await POST(new Request("http://localhost/api/notifications", {
      method: "POST",
      body: JSON.stringify({ title: "Alert", message: "Test" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Patient ID/i);
  });

  it("returns 400 when title is missing", async () => {
    const { POST } = await import("@/app/api/notifications/route");
    const res = await POST(new Request("http://localhost/api/notifications", {
      method: "POST",
      body: JSON.stringify({ patientId: "p1", message: "Test" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 201 or 200 with notification on valid input", async () => {
    const { POST } = await import("@/app/api/notifications/route");
    const res = await POST(new Request("http://localhost/api/notifications", {
      method: "POST",
      body: JSON.stringify({ patientId: "p1", title: "Alert", message: "How are you?" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect([200, 201]).toContain(res.status);
    const body = await res.json();
    expect(body.id).toBe("n-2");
  });
});

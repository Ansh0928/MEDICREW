// Tests: /api/notifications validation
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: vi.fn().mockResolvedValue([
        { id: "n-1", patientId: "p1", title: "Check-in", message: "How are you?", type: "check-in" },
      ]),
      create: vi.fn().mockResolvedValue({ id: "n-2", patientId: "p1", title: "Alert", message: "Test", type: "info" }),
      findUnique: vi.fn().mockResolvedValue({ id: "n-1", patientId: "p1" }),
      update: vi.fn().mockResolvedValue({ id: "n-1", read: true }),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getAuthenticatedPatient: vi.fn(),
}));

const AUTH_P1 = { patient: { id: "p1" }, error: null };
const AUTH_NONE = {
  patient: null,
  error: new Response(JSON.stringify({ error: "Authentication required" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  }),
};

describe("GET /api/notifications", () => {
  beforeEach(() => vi.resetModules());

  it("returns 401 when unauthenticated", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_NONE as any);
    const { GET } = await import("@/app/api/notifications/route");
    const res = await GET(new Request("http://localhost/api/notifications") as any);
    expect(res.status).toBe(401);
  });

  it("returns 200 with notifications for authenticated patient", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
    const { GET } = await import("@/app/api/notifications/route");
    const res = await GET(new Request("http://localhost/api/notifications") as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("POST /api/notifications", () => {
  beforeEach(() => vi.resetModules());

  it("returns 401 when unauthenticated", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_NONE as any);
    const { POST } = await import("@/app/api/notifications/route");
    const res = await POST(new Request("http://localhost/api/notifications", {
      method: "POST",
      body: JSON.stringify({ patientId: "p1", title: "Alert", message: "Test" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(401);
  });

  it("returns 403 when patientId does not match authenticated patient", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
    const { POST } = await import("@/app/api/notifications/route");
    const res = await POST(new Request("http://localhost/api/notifications", {
      method: "POST",
      body: JSON.stringify({ patientId: "p2", title: "Alert", message: "Test" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(403);
  });

  it("returns 400 when title is missing", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
    const { POST } = await import("@/app/api/notifications/route");
    const res = await POST(new Request("http://localhost/api/notifications", {
      method: "POST",
      body: JSON.stringify({ patientId: "p1", message: "Test" }),
      headers: { "Content-Type": "application/json" },
    }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 201 or 200 with notification on valid input", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
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

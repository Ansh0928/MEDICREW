import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedPatient: vi.fn(),
}));

vi.mock("@/lib/consent-check", () => ({
  checkConsent: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/config", () => ({
  createJsonModel: vi.fn(),
  createFastModel: vi.fn(),
}));

vi.mock("@/agents/swarm", () => ({
  streamSwarm: vi.fn(),
}));

const AUTH_P1 = { patient: { id: "p1" }, error: null, needsOnboarding: false };
const AUTH_NONE = {
  patient: null,
  error: new Response(JSON.stringify({ error: "Authentication required" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  }),
  needsOnboarding: false,
};

function makeReq(body: unknown, ip = "1.2.3.4") {
  return new Request("http://localhost/api/swarm/followup", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
  });
}

describe("POST /api/swarm/followup", () => {
  beforeEach(async () => {
    vi.resetModules();
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    const { checkConsent } = await import("@/lib/consent-check");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const { prisma } = await import("@/lib/prisma");
    const { createJsonModel, createFastModel } =
      await import("@/lib/ai/config");
    const { streamSwarm } = await import("@/agents/swarm");

    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_P1 as any);
    vi.mocked(checkConsent).mockResolvedValue(true);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true } as any);
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
      id: "p1",
      age: 31,
      gender: "female",
      knownConditions: "asthma",
      medications: ["salbutamol"],
      allergies: [],
    } as any);
    vi.mocked(createJsonModel).mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({ type: "simple", relevantResidentRoles: [] }),
      }),
    } as any);
    vi.mocked(createFastModel).mockReturnValue({
      invoke: vi
        .fn()
        .mockResolvedValue({ content: "Rest and monitor symptoms." }),
    } as any);
    vi.mocked(streamSwarm).mockReturnValue(
      (async function* () {
        yield {
          type: "synthesis_complete",
          data: {
            primaryRecommendation: "Book a GP review",
            nextSteps: ["Book within 24h"],
          },
        };
        yield { type: "done" };
      })() as any,
    );
  });

  it("returns 401 when unauthenticated", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValue(AUTH_NONE as any);
    const { POST } = await import("@/app/api/swarm/followup/route");
    const res = await POST(
      makeReq({ sessionId: "abc", question: "what now?" }) as any,
    );
    expect(res.status).toBe(401);
  });

  it("rejects missing question", async () => {
    const { POST } = await import("@/app/api/swarm/followup/route");
    const res = await POST(makeReq({ sessionId: "abc" }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/question/);
  });

  it("rejects missing sessionId", async () => {
    const { POST } = await import("@/app/api/swarm/followup/route");
    const res = await POST(
      makeReq({ question: "how long should I rest?" }) as any,
    );
    expect(res.status).toBe(400);
  });

  it("streams quick gatekeeper answer for simple follow-up", async () => {
    const { POST } = await import("@/app/api/swarm/followup/route");
    const res = await POST(
      makeReq({ sessionId: "abc", question: "can I exercise today?" }) as any,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    const body = await res.text();
    expect(body).toContain('"type":"followup_routed"');
    expect(body).toContain('"type":"followup_answer"');
    expect(body).toContain('"type":"done"');
  });

  it("re-enters swarm cycle for complex follow-up", async () => {
    const { createJsonModel } = await import("@/lib/ai/config");
    vi.mocked(createJsonModel).mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          type: "complex",
          relevantResidentRoles: ["investigative"],
        }),
      }),
    } as any);

    const { POST } = await import("@/app/api/swarm/followup/route");
    const res = await POST(
      makeReq({
        sessionId: "abc",
        question: "my nausea is worse despite rest",
      }) as any,
    );
    const body = await res.text();
    expect(body).toContain('"type":"synthesis_complete"');
    expect(body).toContain('"type":"followup_answer"');
  });
});

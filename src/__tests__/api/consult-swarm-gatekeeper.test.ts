import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedPatient: vi.fn(),
}));

vi.mock("@/lib/consent-check", () => ({
  checkConsent: vi.fn(),
}));

vi.mock("@/agents/swarm", () => ({
  streamSwarm: vi.fn(),
}));

vi.mock("@/agents/orchestrator", () => ({
  runConsultation: vi.fn(),
  streamConsultation: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    consultation: { create: vi.fn(), count: vi.fn().mockResolvedValue(0) },
  },
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: vi.fn() },
}));

describe("POST /api/consult swarm gatekeeper lifecycle", () => {
  beforeEach(async () => {
    vi.resetModules();
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    const { checkConsent } = await import("@/lib/consent-check");
    const { streamSwarm } = await import("@/agents/swarm");
    const { prisma } = await import("@/lib/prisma");
    const { inngest } = await import("@/lib/inngest/client");

    vi.mocked(getAuthenticatedPatient).mockResolvedValue({
      patient: { id: "p1" },
      needsOnboarding: false,
      error: null,
    } as any);
    vi.mocked(checkConsent).mockResolvedValue(true);
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
      id: "p1",
      name: "Test User",
      age: 31,
      gender: "female",
      knownConditions: "asthma",
      medications: ["salbutamol"],
      allergies: ["penicillin"],
    } as any);
    vi.mocked(prisma.consultation.create).mockResolvedValue({
      id: "c1",
    } as any);
    vi.mocked(inngest.send).mockResolvedValue({} as any);
    vi.mocked(streamSwarm).mockReturnValue(
      (async function* () {
        yield {
          type: "triage_complete",
          data: { urgency: "routine", relevantDoctors: ["gp"], redFlags: [] },
        };
        yield {
          type: "gatekeeper_review",
          decision: "approved",
          rationale: "safe",
          changed: false,
          approvedUrgency: "routine",
        };
        yield {
          type: "synthesis_complete",
          data: {
            urgency: "routine",
            primaryRecommendation: "Book GP review",
            nextSteps: ["Hydrate"],
            bookingNeeded: true,
            disclaimer: "AI guidance",
          },
        };
        yield { type: "done" };
      })() as any,
    );
  });

  it("streams gatekeeper review events and synthesis output", async () => {
    const { POST } = await import("@/app/api/consult/route");
    const res = await POST(
      new Request("http://localhost/api/consult", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symptoms: "persistent nausea",
          stream: true,
          swarm: true,
        }),
      }) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('"type":"gatekeeper_review"');
    expect(body).toContain('"type":"synthesis_complete"');
  });

  it("builds canonical swarm patient info from profile context", async () => {
    const { POST } = await import("@/app/api/consult/route");
    const { streamSwarm } = await import("@/agents/swarm");

    await POST(
      new Request("http://localhost/api/consult", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symptoms: "persistent nausea",
          stream: true,
          swarm: true,
        }),
      }) as any,
    );

    expect(streamSwarm).toHaveBeenCalledWith(
      "persistent nausea",
      expect.objectContaining({
        age: "31",
        gender: "female",
        knownConditions: "asthma",
        medications: ["salbutamol"],
        allergies: ["penicillin"],
      }),
    );
  });
});

// Tests: POST /api/swarm/answer input validation
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Upstash Redis — no real network calls
vi.mock("@upstash/redis", () => {
  class Redis {
    set = vi.fn().mockResolvedValue("OK");
    static fromEnv() { return new Redis(); }
  }
  return { Redis };
});

function makeReq(body: unknown) {
  return new Request("http://localhost/api/swarm/answer", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/swarm/answer input validation", () => {
  beforeEach(() => vi.resetModules());

  it("rejects missing clarificationId", async () => {
    const { POST } = await import("@/app/api/swarm/answer/route");
    const res = await POST(makeReq({ answer: "yes" }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/clarificationId/);
  });

  it("rejects missing answer", async () => {
    const { POST } = await import("@/app/api/swarm/answer/route");
    const res = await POST(makeReq({ clarificationId: "abc-123" }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/answer/);
  });

  it("returns ok:true on valid input", async () => {
    const { POST } = await import("@/app/api/swarm/answer/route");
    const res = await POST(makeReq({ clarificationId: "abc-123", answer: "yes, for 3 days" }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

// Tests: POST /api/swarm/start input validation
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Upstash Redis and Ratelimit so no real network calls happen
vi.mock("@upstash/redis", () => {
  class Redis {
    static fromEnv() { return new Redis(); }
  }
  return { Redis };
});

vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    limit = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
    static slidingWindow = vi.fn().mockReturnValue({ type: "sliding" });
  }
  return { Ratelimit };
});

// Mock streamSwarm so the stream never opens a real LLM connection
vi.mock("@/agents/swarm", () => ({
  streamSwarm: vi.fn(async function* () {
    yield { type: "done" };
  }),
}));

function makeReq(body: unknown, ip = "1.2.3.4") {
  return new Request("http://localhost/api/swarm/start", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
  });
}

describe("POST /api/swarm/start input validation", () => {
  beforeEach(() => vi.resetModules());

  it("rejects missing symptoms", async () => {
    const { POST } = await import("@/app/api/swarm/start/route");
    const res = await POST(makeReq({ patientInfo: { age: "30s", gender: "male" } }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/symptoms/i);
  });

  it("rejects symptoms that are not a string", async () => {
    const { POST } = await import("@/app/api/swarm/start/route");
    const res = await POST(makeReq({ symptoms: 42, patientInfo: { age: "30s", gender: "male" } }) as any);
    expect(res.status).toBe(400);
  });

  it("rejects symptoms over 2000 characters", async () => {
    const { POST } = await import("@/app/api/swarm/start/route");
    const res = await POST(
      makeReq({ symptoms: "a".repeat(2001), patientInfo: { age: "30s", gender: "male" } }) as any
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/2000/);
  });

  it("rejects missing patientInfo.age", async () => {
    const { POST } = await import("@/app/api/swarm/start/route");
    const res = await POST(makeReq({ symptoms: "headache", patientInfo: { gender: "male" } }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/age/i);
  });

  it("rejects missing patientInfo.gender", async () => {
    const { POST } = await import("@/app/api/swarm/start/route");
    const res = await POST(makeReq({ symptoms: "headache", patientInfo: { age: "30s" } }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/gender/i);
  });

  it("returns SSE stream on valid input", async () => {
    const { POST } = await import("@/app/api/swarm/start/route");
    const res = await POST(
      makeReq({ symptoms: "headache for 3 days", patientInfo: { age: "30s", gender: "male" } }) as any
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
  });
});

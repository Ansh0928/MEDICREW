// Tests: /api/patients/[id] deprecated route
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("GET /api/patients/[id]", () => {
  beforeEach(() => vi.resetModules());

  it("returns 410 deprecated", async () => {
    const { GET } = await import("@/app/api/patients/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/patients/p1") as any,
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(res.status).toBe(410);
  });
});

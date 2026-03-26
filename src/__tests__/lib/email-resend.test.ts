// Tests: email/resend — no-API-key guard and graceful degradation
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("sendCheckInEmail — no RESEND_API_KEY", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    vi.resetModules();
  });
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("returns success:false when RESEND_API_KEY is absent", async () => {
    const { sendCheckInEmail } = await import("@/lib/email/resend");
    const result = await sendCheckInEmail("patient@test.com", "Alice", "How are you feeling?");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/RESEND_API_KEY/i);
  });

  it("returns success:false for sendEscalationEmail when RESEND_API_KEY is absent", async () => {
    const { sendEscalationEmail } = await import("@/lib/email/resend");
    const result = await sendEscalationEmail("patient@test.com", "Alice", "Alert", "Escalation body");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/RESEND_API_KEY/i);
  });
});

describe("sendCheckInEmail — with mocked Resend client", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
    vi.resetModules();
  });
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("returns success:true when Resend sends successfully", async () => {
    vi.doMock("resend", () => ({
      Resend: class {
        emails = { send: vi.fn().mockResolvedValue({ id: "email-123" }) };
      },
    }));
    const { sendCheckInEmail } = await import("@/lib/email/resend");
    const result = await sendCheckInEmail("patient@test.com", "Alice", "How are you feeling?");
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns success:false when Resend throws", async () => {
    vi.doMock("resend", () => ({
      Resend: class {
        emails = { send: vi.fn().mockRejectedValue(new Error("network failure")) };
      },
    }));
    const { sendCheckInEmail } = await import("@/lib/email/resend");
    const result = await sendCheckInEmail("patient@test.com", "Alice", "Check-in");
    expect(result.success).toBe(false);
    expect(result.error).toContain("network failure");
  });
});

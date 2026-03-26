// Tests: /api/auth/webhook — Clerk webhook handler
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      create: vi.fn().mockResolvedValue({ id: "p1" }),
    },
  },
}));

vi.mock("svix", () => {
  const verify = vi.fn().mockImplementation((body: string) => JSON.parse(body));
  class Webhook {
    verify = verify;
  }
  return { Webhook };
});

import { prisma } from "@/lib/prisma";

const VALID_USER_CREATED_EVENT = {
  type: "user.created",
  data: {
    id: "user_clerk123",
    email_addresses: [
      { email_address: "jane@example.com", id: "email_1" },
    ],
    primary_email_address_id: "email_1",
    first_name: "Jane",
    last_name: "Doe",
  },
};

function makeWebhookRequest(body: object) {
  return new Request("http://localhost/api/auth/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": "test-id",
      "svix-timestamp": "12345",
      "svix-signature": "test-sig",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CLERK_WEBHOOK_SECRET = "whsec_test123";
  vi.mocked(prisma.patient.create).mockResolvedValue({ id: "p1" } as any);
});

afterEach(() => {
  delete process.env.CLERK_WEBHOOK_SECRET;
});

describe("POST /api/auth/webhook", () => {
  it("creates Patient record on user.created event", async () => {
    const { POST } = await import("@/app/api/auth/webhook/route");
    const res = await POST(makeWebhookRequest(VALID_USER_CREATED_EVENT) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(prisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clerkUserId: "user_clerk123",
          email: "jane@example.com",
          name: "Jane Doe",
        }),
      })
    );
  });

  it("returns 200 without creating patient for non-user.created events", async () => {
    const { POST } = await import("@/app/api/auth/webhook/route");
    const res = await POST(makeWebhookRequest({ type: "user.updated", data: {} }) as any);
    expect(res.status).toBe(200);
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  it("returns 500 when CLERK_WEBHOOK_SECRET is not set", async () => {
    delete process.env.CLERK_WEBHOOK_SECRET;
    const { POST } = await import("@/app/api/auth/webhook/route");
    const res = await POST(makeWebhookRequest(VALID_USER_CREATED_EVENT) as any);
    expect(res.status).toBe(500);
  });

  it("falls back to email as name when first_name and last_name are null", async () => {
    const { POST } = await import("@/app/api/auth/webhook/route");
    const event = {
      ...VALID_USER_CREATED_EVENT,
      data: { ...VALID_USER_CREATED_EVENT.data, first_name: null, last_name: null },
    };
    const res = await POST(makeWebhookRequest(event) as any);
    expect(res.status).toBe(200);
    expect(prisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "jane@example.com" }),
      })
    );
  });
});

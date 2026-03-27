import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

interface ClerkUserCreatedEvent {
  type: "user.created";
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export async function POST(request: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  const body = await request.text();

  let event: ClerkUserCreatedEvent;

  if (!webhookSecret) {
    // Dev fallback: no secret configured — trust the request and parse JSON
    // directly. Logs a warning so it's obvious in production this should be set.
    console.warn(
      "[webhook] CLERK_WEBHOOK_SECRET is not set — skipping signature verification (dev mode only)"
    );
    try {
      event = JSON.parse(body) as ClerkUserCreatedEvent;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  } else {
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
    }

    try {
      const wh = new Webhook(webhookSecret);
      event = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ClerkUserCreatedEvent;
    } catch {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }
  }

  if (event.type !== "user.created") {
    return NextResponse.json({ received: true });
  }

  const { id: clerkUserId, email_addresses, primary_email_address_id, first_name, last_name } = event.data;

  const primaryEmail = email_addresses.find((e) => e.id === primary_email_address_id);
  if (!primaryEmail) {
    return NextResponse.json({ error: "No primary email found" }, { status: 400 });
  }

  const name = [first_name, last_name].filter(Boolean).join(" ") || primaryEmail.email_address;

  await prisma.patient.create({
    data: {
      clerkUserId,
      email: primaryEmail.email_address,
      name,
    },
  });

  return NextResponse.json({ received: true });
}

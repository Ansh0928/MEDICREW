import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedPatient } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  const { patient, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (!patient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let customerId = patient.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: patient.email,
      name: patient.name,
      metadata: { patientId: patient.id },
    });
    customerId = customer.id;
    await prisma.patient.update({
      where: { id: patient.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/patient?upgraded=true`,
    cancel_url: `${appUrl}/pricing`,
    subscription_data: {
      metadata: { patientId: patient.id },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}

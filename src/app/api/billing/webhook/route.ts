import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const patientId = sub.metadata?.patientId;
        if (!patientId) break;

        const plan =
          sub.status === "active" || sub.status === "trialing" ? "pro" : "free";
        // In Stripe API 2026-03-25.dahlia, current_period_end is on each
        // SubscriptionItem. Use the first item's period end for display.
        const firstItem = sub.items?.data?.[0];
        const periodEnd = firstItem?.current_period_end
          ? new Date(firstItem.current_period_end * 1000)
          : null;

        await prisma.patient.update({
          where: { id: patientId },
          data: {
            stripeSubscriptionId: sub.id,
            subscriptionPlan: plan,
            subscriptionStatus: sub.status,
            subscriptionPeriodEnd: periodEnd,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const patientId = sub.metadata?.patientId;
        if (!patientId) break;

        await prisma.patient.update({
          where: { id: patientId },
          data: {
            stripeSubscriptionId: null,
            subscriptionPlan: "free",
            subscriptionStatus: "canceled",
            subscriptionPeriodEnd: null,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : ((invoice.customer as Stripe.Customer | null)?.id ?? null);
        if (!customerId) break;

        await prisma.patient.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: "past_due" },
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

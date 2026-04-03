import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedPatient } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  const { patient, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (!patient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!patient.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found. Subscribe first." },
      { status: 400 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: patient.stripeCustomerId,
    return_url: `${appUrl}/patient`,
  });

  return NextResponse.json({ url: session.url });
}

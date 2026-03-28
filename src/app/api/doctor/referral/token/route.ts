import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDoctorAuth } from "@/lib/auth";

// POST /api/doctor/referral/token
// Body: { consultationId: string }
// Returns: { token: string; url: string; expiresAt: string }
export async function POST(request: NextRequest) {
  const { error } = await getDoctorAuth();
  if (error) return error;

  let consultationId: string;
  try {
    const body = await request.json();
    consultationId = body.consultationId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!consultationId || typeof consultationId !== "string") {
    return NextResponse.json({ error: "consultationId is required" }, { status: 400 });
  }

  const exists = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
  }

  // 30-day expiry
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const referralToken = await prisma.referralToken.create({
    data: { consultationId, expiresAt },
  });

  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = `${origin}/referral/${referralToken.token}`;

  return NextResponse.json({ token: referralToken.token, url, expiresAt: expiresAt.toISOString() });
}

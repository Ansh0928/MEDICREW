import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/referral/[token]
// Public endpoint — no auth required. Gated by REFERRAL_SHARING_ENABLED env var.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!process.env.REFERRAL_SHARING_ENABLED) {
    return NextResponse.json({ error: "Referral sharing is not enabled" }, { status: 403 });
  }

  const { token } = await params;

  const referralToken = await prisma.referralToken.findUnique({
    where: { token },
  });

  if (!referralToken) {
    return NextResponse.json({ error: "Invalid or expired referral link" }, { status: 404 });
  }

  if (referralToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "This referral link has expired" }, { status: 410 });
  }

  const consultation = await prisma.consultation.findUnique({
    where: { id: referralToken.consultationId },
    select: {
      id: true,
      patientId: true,
      symptoms: true,
      urgencyLevel: true,
      redFlags: true,
      recommendation: true,
      createdAt: true,
      patient: {
        select: {
          name: true,
          dateOfBirth: true,
          gender: true,
          email: true,
          knownConditions: true,
          medications: true,
          allergies: true,
        },
      },
    },
  });

  if (!consultation) {
    return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
  }

  let redFlags: string[] = [];
  if (consultation.redFlags) {
    try {
      const parsed = JSON.parse(consultation.redFlags);
      redFlags = Array.isArray(parsed) ? parsed : [];
    } catch {
      redFlags = [];
    }
  }

  return NextResponse.json({
    consultation: {
      id: consultation.id,
      symptoms: consultation.symptoms,
      urgencyLevel: consultation.urgencyLevel,
      redFlags,
      recommendation: consultation.recommendation,
      createdAt: consultation.createdAt.toISOString(),
    },
    patient: consultation.patient,
    expiresAt: referralToken.expiresAt.toISOString(),
  });
}

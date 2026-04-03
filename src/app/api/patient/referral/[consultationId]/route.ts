import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ consultationId: string }> },
) {
  const { patient, needsOnboarding, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (needsOnboarding) {
    return NextResponse.json(
      { error: "Onboarding required", redirect: "/onboarding" },
      { status: 403 },
    );
  }

  const { consultationId } = await params;
  const patientId = patient!.id;

  const consultation = await prisma.consultation.findFirst({
    where: { id: consultationId, patientId },
    select: {
      referralLetter: true,
      referralLetterAt: true,
    },
  });

  if (!consultation) {
    return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
  }

  if (!consultation.referralLetter) {
    return NextResponse.json({ letter: null, generatedAt: null });
  }

  return NextResponse.json({
    letter: consultation.referralLetter,
    generatedAt: consultation.referralLetterAt,
  });
}

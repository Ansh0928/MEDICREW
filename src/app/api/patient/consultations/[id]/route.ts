import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { patient, needsOnboarding, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (needsOnboarding)
    return NextResponse.json(
      { error: "Onboarding required", redirect: "/onboarding" },
      { status: 403 },
    );

  const { id } = await params;
  const patientId = patient!.id;

  const consultation = await prisma.consultation.findFirst({
    where: { id, patientId },
    select: {
      id: true,
      symptoms: true,
      urgencyLevel: true,
      redFlags: true,
      recommendation: true,
      triageResponse: true,
      gpResponse: true,
      specialistResponse: true,
      createdAt: true,
    },
  });

  if (!consultation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Parse redFlags — stored as a JSON string array
  let redFlags: string[] = [];
  if (consultation.redFlags) {
    try {
      const parsed = JSON.parse(consultation.redFlags);
      if (Array.isArray(parsed)) redFlags = parsed;
    } catch {
      redFlags = [];
    }
  }

  return NextResponse.json({
    id: consultation.id,
    symptoms: consultation.symptoms,
    urgencyLevel: consultation.urgencyLevel,
    redFlags,
    recommendation: consultation.recommendation,
    createdAt: consultation.createdAt,
  });
}

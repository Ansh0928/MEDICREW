import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { patient, needsOnboarding, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (needsOnboarding) return NextResponse.json({ error: "Onboarding required", redirect: "/onboarding" }, { status: 403 });
  const patientId = patient!.id;

  const body = await request.json();
  const { consentVersion, dataCategories } = body;

  if (!consentVersion || !dataCategories) {
    return NextResponse.json(
      { error: "consentVersion and dataCategories are required" },
      { status: 400 }
    );
  }

  const consent = await prisma.patientConsent.create({
    data: {
      patientId,
      consentVersion,
      dataCategories,
    },
  });

  return NextResponse.json(
    { id: consent.id, consentedAt: consent.consentedAt },
    { status: 201 }
  );
}

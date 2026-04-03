import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const {
    patient: authPatient,
    needsOnboarding,
    error,
  } = await getAuthenticatedPatient();
  if (error) return error;
  if (needsOnboarding)
    return NextResponse.json(
      { error: "Onboarding required", redirect: "/onboarding" },
      { status: 403 },
    );
  const patientId = authPatient!.id;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      consultations: true,
      notifications: true,
      consents: true,
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // APP 12 compliant data export — all personal data in one response
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    patient: {
      id: patient.id,
      name: patient.name,
      email: patient.email,
      age: patient.age,
      gender: patient.gender,
      knownConditions: patient.knownConditions,
      createdAt: patient.createdAt,
    },
    consultations: patient.consultations,
    notifications: patient.notifications,
    consents: patient.consents,
  });
}

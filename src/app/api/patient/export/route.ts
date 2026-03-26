import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  // TODO: Replace with Supabase Auth session in Phase 2
  const patientId = request.headers.get("x-patient-id");
  if (!patientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

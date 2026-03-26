import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export async function DELETE(_request: NextRequest) {
  const { patient: authPatient, error } = await getAuthenticatedPatient();
  if (error) return error;
  const patientId = authPatient.id;

  // Fetch current email to preserve for 30-day recovery window
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { email: true },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Soft delete: anonymise email, set deletedAt
  // 30-day grace period — a scheduled job (Phase 3) will hard delete after 30 days
  const now = new Date();
  await prisma.patient.update({
    where: { id: patientId },
    data: {
      deletedEmail: patient.email, // Preserve original for 30-day recovery
      email: `deleted-${patientId}@medicrew.au`,
      name: "Deleted User",
      deletedAt: now,
      knownConditions: null,
      age: null,
      gender: null,
    },
  });

  return NextResponse.json({
    message:
      "Account scheduled for deletion. Data will be permanently removed after 30 days.",
    deletedAt: now.toISOString(),
  });
}

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDoctorAuth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { doctor, error } = await getDoctorAuth();
  if (error) return error;

  if (!doctor!.clinicId) {
    return NextResponse.json(
      { error: "Doctor not assigned to a clinic" },
      { status: 403 },
    );
  }

  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      dateOfBirth: true,
      gender: true,
      knownConditions: true,
      medications: true,
      allergies: true,
      onboardingComplete: true,
      clinicId: true,
      consultations: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          symptoms: true,
          urgencyLevel: true,
          redFlags: true,
          recommendation: true,
          createdAt: true,
        },
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Reject if patient is unassigned or belongs to a different clinic
  if (!patient.clinicId || patient.clinicId !== doctor!.clinicId) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { clinicId: _clinicId, ...patientData } = patient;
  return NextResponse.json(patientData);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDoctorAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    select: {
      id: true,
      patientId: true,
      symptoms: true,
      urgencyLevel: true,
      redFlags: true,
      recommendation: true,
      createdAt: true,
      patient: { select: { clinicId: true } },
    },
  });

  if (!consultation) {
    return NextResponse.json(
      { error: "Consultation not found" },
      { status: 404 },
    );
  }

  const patientClinicId = consultation.patient.clinicId;

  // Reject if patient is unassigned or belongs to a different clinic
  if (!patientClinicId || patientClinicId !== doctor!.clinicId) {
    return NextResponse.json(
      { error: "Consultation not found" },
      { status: 404 },
    );
  }

  // Parse redFlags from stored JSON string to array
  let redFlags: string[] = [];
  if (consultation.redFlags) {
    try {
      const parsed = JSON.parse(consultation.redFlags);
      redFlags = Array.isArray(parsed) ? parsed : [];
    } catch {
      redFlags = [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { patient: _patient, ...consultationData } = consultation;
  return NextResponse.json({
    ...consultationData,
    redFlags,
    createdAt: consultation.createdAt.toISOString(),
  });
}

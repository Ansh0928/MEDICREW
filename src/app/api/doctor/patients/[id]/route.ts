import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDoctorAuth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await getDoctorAuth();
  if (error) return error;

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

  return NextResponse.json(patient);
}

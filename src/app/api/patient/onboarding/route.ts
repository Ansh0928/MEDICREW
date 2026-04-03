import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export const dynamic = "force-dynamic";

const onboardingSchema = z.object({
  dateOfBirth: z.string().min(1, "dateOfBirth is required"),
  gender: z.string().min(1, "gender is required"),
  knownConditions: z.string().optional(),
  medications: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    })
    .optional(),
  gpDetails: z
    .object({
      name: z.string(),
      practice: z.string(),
      phone: z.string(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const { patient, needsOnboarding, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (needsOnboarding)
    return NextResponse.json(
      { error: "Onboarding required", redirect: "/onboarding" },
      { status: 403 },
    );
  const patientId = patient!.id;

  const body = await request.json();
  const result = onboardingSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 },
    );
  }

  const {
    dateOfBirth,
    gender,
    knownConditions,
    medications,
    allergies,
    emergencyContact,
    gpDetails,
  } = result.data;

  const updatedPatient = await prisma.patient.update({
    where: { id: patientId },
    data: {
      dateOfBirth: new Date(dateOfBirth),
      gender,
      knownConditions,
      medications: JSON.stringify(medications),
      allergies: JSON.stringify(allergies),
      emergencyContact:
        emergencyContact !== undefined
          ? (emergencyContact as Prisma.InputJsonValue)
          : Prisma.DbNull,
      gpDetails:
        gpDetails !== undefined
          ? (gpDetails as Prisma.InputJsonValue)
          : Prisma.DbNull,
      onboardingComplete: true,
    },
  });

  return NextResponse.json(updatedPatient, { status: 200 });
}

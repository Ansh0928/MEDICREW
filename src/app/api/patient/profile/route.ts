import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const patientId = request.headers.get("x-patient-id");
  if (!patientId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      name: true,
      dateOfBirth: true,
      gender: true,
      knownConditions: true,
      medications: true,
      allergies: true,
      emergencyContact: true,
      gpDetails: true,
      onboardingComplete: true,
      checkInsOptOut: true,
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json(patient);
}

export async function PATCH(request: NextRequest) {
  const patientId = request.headers.get("x-patient-id");
  if (!patientId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    knownConditions,
    medications,
    allergies,
    emergencyContact,
    gpDetails,
    checkInsOptOut,
  } = body as {
    knownConditions?: string;
    medications?: string[];
    allergies?: string[];
    emergencyContact?: unknown;
    gpDetails?: unknown;
    checkInsOptOut?: boolean;
  };

  // Validate medications and allergies are arrays if provided
  if (medications !== undefined && !Array.isArray(medications)) {
    return NextResponse.json(
      { error: "medications must be an array of strings" },
      { status: 400 }
    );
  }
  if (allergies !== undefined && !Array.isArray(allergies)) {
    return NextResponse.json(
      { error: "allergies must be an array of strings" },
      { status: 400 }
    );
  }

  const updated = await prisma.patient.update({
    where: { id: patientId },
    data: {
      ...(knownConditions !== undefined && { knownConditions }),
      ...(medications !== undefined && { medications }),
      ...(allergies !== undefined && { allergies }),
      ...(emergencyContact !== undefined && {
        emergencyContact: emergencyContact as Parameters<typeof prisma.patient.update>[0]["data"]["emergencyContact"],
      }),
      ...(gpDetails !== undefined && {
        gpDetails: gpDetails as Parameters<typeof prisma.patient.update>[0]["data"]["gpDetails"],
      }),
      ...(typeof checkInsOptOut === "boolean" && { checkInsOptOut }),
    },
    select: {
      id: true,
      name: true,
      dateOfBirth: true,
      gender: true,
      knownConditions: true,
      medications: true,
      allergies: true,
      emergencyContact: true,
      gpDetails: true,
      onboardingComplete: true,
      checkInsOptOut: true,
    },
  });

  return NextResponse.json(updated);
}

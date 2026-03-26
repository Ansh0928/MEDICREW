import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { patient, error } = await getAuthenticatedPatient();
  if (error) return error;
  const patientId = patient.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { severity, notes } = body as { severity?: unknown; notes?: unknown };

  if (
    severity === undefined ||
    typeof severity !== "number" ||
    !Number.isInteger(severity) ||
    severity < 1 ||
    severity > 5
  ) {
    return NextResponse.json(
      { error: "severity must be an integer 1-5" },
      { status: 400 }
    );
  }

  const entry = await prisma.symptomJournal.create({
    data: {
      patientId,
      severity,
      notes: typeof notes === "string" ? notes || null : null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function GET(_request: NextRequest) {
  const { patient: authPatient, error: authError } = await getAuthenticatedPatient();
  if (authError) return authError;
  const patientId = authPatient.id;

  const entries = await prisma.symptomJournal.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json(entries);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  const { patient, error } = await getAuthenticatedPatient();
  if (error) return error;
  const patientId = patient.id;

  const record = await prisma.careTeamStatus.findUnique({
    where: { patientId },
    select: { statuses: true, updatedAt: true },
  });

  return NextResponse.json({
    statuses: record?.statuses ?? {},
    updatedAt: record?.updatedAt ?? null,
  });
}

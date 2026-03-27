import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  const { patient, needsOnboarding, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (needsOnboarding) return NextResponse.json({ error: "Onboarding required", redirect: "/onboarding" }, { status: 403 });
  const patientId = patient!.id;

  const record = await prisma.careTeamStatus.findUnique({
    where: { patientId },
    select: { statuses: true, updatedAt: true },
  });

  return NextResponse.json({
    statuses: record?.statuses ?? {},
    updatedAt: record?.updatedAt ?? null,
  });
}

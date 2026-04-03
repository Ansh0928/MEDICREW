import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const { patient, needsOnboarding, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (needsOnboarding)
    return NextResponse.json(
      { error: "Onboarding required", redirect: "/onboarding" },
      { status: 403 },
    );
  const patientId = patient!.id;

  const entries = await prisma.symptomJournal.findMany({
    where: { patientId },
    orderBy: { createdAt: "asc" },
    take: 90,
  });

  const data = entries.map((entry) => ({
    date: entry.createdAt.toISOString(),
    severity: entry.severity,
    notes: entry.notes ?? null,
  }));

  return NextResponse.json(data);
}

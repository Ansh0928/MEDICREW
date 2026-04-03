import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const {
    patient,
    needsOnboarding,
    error: authError,
  } = await getAuthenticatedPatient();
  if (authError) return authError;
  if (needsOnboarding)
    return NextResponse.json(
      { error: "Onboarding required", redirect: "/onboarding" },
      { status: 403 },
    );
  const patientId = patient!.id;

  const checkIns = await prisma.checkIn.findMany({
    where: { patientId },
    select: { id: true, notificationId: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(checkIns);
}

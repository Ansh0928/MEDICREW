import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function getAuthenticatedPatient() {
  const { userId } = await auth();
  if (!userId) {
    return {
      patient: null,
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  const patient = await prisma.patient.findUnique({
    where: { clerkUserId: userId },
  });

  if (!patient) {
    return {
      patient: null,
      error: NextResponse.json({ error: "Patient record not found. Complete onboarding." }, { status: 404 }),
    };
  }

  return { patient, error: null };
}

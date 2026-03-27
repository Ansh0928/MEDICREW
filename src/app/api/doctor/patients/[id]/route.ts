import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const role = (sessionClaims?.publicMetadata as Record<string, string> | undefined)?.role;
  if (role !== "doctor") {
    return NextResponse.json({ error: "Doctor access required" }, { status: 403 });
  }

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

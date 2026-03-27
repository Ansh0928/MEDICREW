import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  // Only doctors may access this endpoint
  const role = (sessionClaims?.publicMetadata as Record<string, string> | undefined)?.role;
  if (role !== "doctor") {
    return NextResponse.json({ error: "Doctor access required" }, { status: 403 });
  }

  const patients = await prisma.patient.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      knownConditions: true,
      createdAt: true,
      consultations: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          symptoms: true,
          urgencyLevel: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json(
    patients.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      knownConditions: p.knownConditions,
      latestConsultation: p.consultations[0] ?? null,
    }))
  );
}

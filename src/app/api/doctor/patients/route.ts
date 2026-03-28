import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDoctorAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { error } = await getDoctorAuth();
  if (error) return error;

  const url = new URL(request.url);
  const take = Math.min(parseInt(url.searchParams.get("take") ?? "50", 10), 100);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10), 0);

  const patients = await prisma.patient.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take,
    skip,
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

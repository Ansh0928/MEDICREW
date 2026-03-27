import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { patient, needsOnboarding, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (needsOnboarding) return NextResponse.json({ error: "Onboarding required", redirect: "/onboarding" }, { status: 403 });
  const patientId = patient!.id;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
  const skip = (page - 1) * limit;

  const [total, consultations] = await Promise.all([
    prisma.consultation.count({ where: { patientId } }),
    prisma.consultation.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        symptoms: true,
        urgencyLevel: true,
        recommendation: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({ consultations, total, page, limit });
}

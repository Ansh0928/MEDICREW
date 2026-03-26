import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const patientId = request.headers.get("x-patient-id");
  if (!patientId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

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

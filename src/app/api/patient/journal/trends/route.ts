import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const patientId = request.headers.get("x-patient-id");
  if (!patientId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

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

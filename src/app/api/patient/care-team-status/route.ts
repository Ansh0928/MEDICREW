import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const patientId = request.headers.get("x-patient-id");
  if (!patientId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  const record = await prisma.careTeamStatus.findUnique({
    where: { patientId },
    select: { statuses: true, updatedAt: true },
  });

  return NextResponse.json({
    statuses: record?.statuses ?? {},
    updatedAt: record?.updatedAt ?? null,
  });
}

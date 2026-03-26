import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }
  const checkIns = await prisma.checkIn.findMany({
    where: { patientId },
    select: { id: true, notificationId: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(checkIns);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const patientId = request.headers.get("x-patient-id");
  if (!patientId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  const { agentRole, agentName, message } = await request.json();

  if (!agentRole || !agentName || !message) {
    return NextResponse.json(
      { error: "agentRole, agentName, and message are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.careTeamStatus.findUnique({ where: { patientId } });
  const currentStatuses = (existing?.statuses as Record<string, unknown>) || {};

  const updatedStatuses = {
    ...currentStatuses,
    [agentRole]: { agentName, message, updatedAt: new Date().toISOString() },
  };

  const result = await prisma.careTeamStatus.upsert({
    where: { patientId },
    create: { patientId, statuses: updatedStatuses },
    update: { statuses: updatedStatuses },
  });

  return NextResponse.json(result);
}

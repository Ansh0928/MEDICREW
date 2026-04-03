import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const { patient, needsOnboarding, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (needsOnboarding)
    return NextResponse.json(
      { error: "Onboarding required", redirect: "/onboarding" },
      { status: 403 },
    );
  const patientId = patient!.id;

  const { agentRole, agentName, message } = await request.json();

  if (!agentRole || !agentName || !message) {
    return NextResponse.json(
      { error: "agentRole, agentName, and message are required" },
      { status: 400 },
    );
  }

  const existing = await prisma.careTeamStatus.findUnique({
    where: { patientId },
  });
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

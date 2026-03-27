import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  const { patient, needsOnboarding, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (needsOnboarding) return NextResponse.json({ error: "Onboarding required", redirect: "/onboarding" }, { status: 403 });
  const patientId = patient!.id;

  // Query in parallel: latest consultation, next pending check-in, recent check-ins, care team status
  const [latestConsultation, nextCheckIn, recentCheckIns, careTeamStatus] =
    await Promise.all([
      prisma.consultation.findFirst({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          urgencyLevel: true,
          recommendation: true,
          createdAt: true,
        },
      }),
      prisma.checkIn.findFirst({
        where: { patientId, status: "pending" },
        orderBy: { scheduledFor: "asc" },
        select: {
          id: true,
          scheduledFor: true,
          status: true,
        },
      }),
      prisma.checkIn.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          response: true,
          respondedAt: true,
          createdAt: true,
        },
      }),
      prisma.careTeamStatus.findUnique({
        where: { patientId },
        select: {
          statuses: true,
          updatedAt: true,
        },
      }),
    ]);

  // Derive monitoring status: active if there is a pending check-in OR a consultation within the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const hasRecentConsultation =
    latestConsultation !== null &&
    new Date(latestConsultation.createdAt) > sevenDaysAgo;
  const monitoringStatus =
    nextCheckIn !== null || hasRecentConsultation ? "active" : "inactive";

  // Extract action items from latest consultation recommendation (nextSteps array)
  let actionItems: string[] = [];
  if (latestConsultation?.recommendation) {
    const rec = latestConsultation.recommendation as {
      nextSteps?: unknown;
      urgency?: string;
      summary?: string;
      questionsForDoctor?: string[];
      timeframe?: string;
    };
    if (Array.isArray(rec.nextSteps)) {
      actionItems = rec.nextSteps.filter(
        (item): item is string => typeof item === "string"
      );
    }
  }

  // Find most recent agent activity from CareTeamStatus
  let lastAgentActivity: {
    agentName: string;
    message: string;
    updatedAt: string;
  } | null = null;
  if (careTeamStatus?.statuses) {
    const statuses = careTeamStatus.statuses as Record<
      string,
      { agentName: string; message: string; updatedAt: string }
    >;
    const sorted = Object.values(statuses).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    if (sorted.length > 0) {
      lastAgentActivity = {
        agentName: sorted[0].agentName,
        message: sorted[0].message,
        updatedAt: sorted[0].updatedAt,
      };
    }
  }

  return NextResponse.json({
    monitoringStatus,
    nextCheckIn: nextCheckIn
      ? {
          scheduledFor: nextCheckIn.scheduledFor,
          status: nextCheckIn.status,
        }
      : null,
    latestConsultation: latestConsultation
      ? {
          id: latestConsultation.id,
          urgencyLevel: latestConsultation.urgencyLevel,
          createdAt: latestConsultation.createdAt,
          primaryRecommendation: (() => {
            const rec = latestConsultation.recommendation as { primaryRecommendation?: string } | null;
            return rec?.primaryRecommendation ?? null;
          })(),
          bookingNeeded: (() => {
            const rec = latestConsultation.recommendation as { bookingNeeded?: boolean } | null;
            return rec?.bookingNeeded ?? false;
          })(),
        }
      : null,
    actionItems,
    recentCheckIns: recentCheckIns.map((c) => ({
      status: c.status,
      response: c.response,
      respondedAt: c.respondedAt,
    })),
    lastAgentActivity,
  });
}

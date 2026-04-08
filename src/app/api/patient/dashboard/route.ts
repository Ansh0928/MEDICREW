import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Combined dashboard endpoint — replaces 5 sequential API calls with 1 Prisma query batch.
// Called by the patient portal on load via SWR.
export async function GET() {
  const {
    patient: authPatient,
    needsOnboarding,
    error,
  } = await getAuthenticatedPatient();
  if (error) return error;
  if (needsOnboarding)
    return NextResponse.json(
      { error: "Onboarding required", redirect: "/onboarding" },
      { status: 403 },
    );
  const patientId = authPatient!.id;

  let queryResults: Awaited<ReturnType<typeof runQueries>>;
  try {
    queryResults = await runQueries(patientId);
  } catch (err) {
    console.error("[dashboard] DB query failed", { patientId, err });
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 },
    );
  }

  const {
    profile,
    consultationResult,
    careTeamStatus,
    notifications,
    checkIns,
  } = queryResults;

  if (!profile) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json({
    profile,
    consultations: consultationResult,
    careTeamStatus: {
      statuses: careTeamStatus?.statuses ?? {},
      updatedAt: careTeamStatus?.updatedAt ?? null,
    },
    notifications,
    checkIns,
  });
}

async function runQueries(patientId: string) {
  const [profile, consultationResult, careTeamStatus, notifications, checkIns] =
    await Promise.all([
      prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          name: true,
          gender: true,
          knownConditions: true,
          onboardingComplete: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          stripeCustomerId: true,
        },
      }),
      prisma.consultation.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          symptoms: true,
          urgencyLevel: true,
          recommendation: true,
          createdAt: true,
        },
      }),
      prisma.careTeamStatus.findUnique({
        where: { patientId },
        select: { statuses: true, updatedAt: true },
      }),
      prisma.notification.findMany({
        where: { patientId },
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          read: true,
          createdAt: true,
          doctor: { select: { id: true, name: true } },
        },
      }),
      prisma.checkIn.findMany({
        where: { patientId },
        take: 20,
        select: { id: true, notificationId: true, status: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  return {
    profile,
    consultationResult,
    careTeamStatus,
    notifications,
    checkIns,
  };
}

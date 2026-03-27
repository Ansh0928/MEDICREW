import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateCheckInResponse, CheckInResponse } from "@/lib/escalation-rules";
import { sendEscalationEmail } from "@/lib/email/resend";
import { getAuthenticatedPatient } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { patient: authPatient, needsOnboarding, error: authError } = await getAuthenticatedPatient();
  if (authError) return authError;
  if (needsOnboarding) return NextResponse.json({ error: "Onboarding required", redirect: "/onboarding" }, { status: 403 });
  const patientId = authPatient!.id;

  const body = await request.json();
  const { checkInId, response, freeText = "" } = body;

  if (!checkInId || !response) {
    return NextResponse.json(
      { error: "checkInId and response are required" },
      { status: 400 }
    );
  }

  const validResponses: CheckInResponse[] = ["better", "same", "worse"];
  if (!validResponses.includes(response)) {
    return NextResponse.json(
      { error: "response must be 'better', 'same', or 'worse'" },
      { status: 400 }
    );
  }

  // Find the check-in and verify ownership
  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    include: { patient: { select: { id: true, name: true } } },
  });

  if (!checkIn || checkIn.patientId !== patientId) {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  }

  if (checkIn.status !== "pending") {
    return NextResponse.json(
      { error: "Check-in already responded to" },
      { status: 409 }
    );
  }

  // Evaluate escalation
  const escalation = evaluateCheckInResponse(response as CheckInResponse, freeText);

  // Update check-in record
  await prisma.checkIn.update({
    where: { id: checkInId },
    data: {
      status: "responded",
      response,
      responseText: freeText || null,
      respondedAt: new Date(),
    },
  });

  // Handle escalation
  if (escalation.escalate) {
    // Create high-priority notification for emergency, standard for urgent
    const notificationType = escalation.newUrgencyTier === "emergency" ? "emergency" : "escalation";
    const title =
      escalation.newUrgencyTier === "emergency"
        ? "EMERGENCY: Immediate medical attention required"
        : "Care team alert: Your symptoms need attention";
    const message = escalation.emergency
      ? escalation.emergency.response!.message
      : "Your care team has been notified about your worsening symptoms. A specialist will review your case.";

    await prisma.notification.create({
      data: {
        patientId,
        title,
        message,
        type: notificationType,
      },
    });

    // Update CareTeamStatus with specialist notification (Sarah AI — Cardiology as default specialist)
    if (escalation.notifySpecialist && escalation.specialistMessage) {
      const existing = await prisma.careTeamStatus.findUnique({ where: { patientId } });
      const currentStatuses = (existing?.statuses as Record<string, unknown>) || {};
      const updatedStatuses = {
        ...currentStatuses,
        cardiology: {
          agentName: "Sarah AI \u2014 Cardiology",
          message: escalation.specialistMessage,
          updatedAt: new Date().toISOString(),
        },
      };
      await prisma.careTeamStatus.upsert({
        where: { patientId },
        create: { patientId, statuses: updatedStatuses },
        update: { statuses: updatedStatuses },
      });
    }

    // Send escalation email via Resend
    const patientData = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { email: true, name: true },
    });
    if (patientData?.email) {
      await sendEscalationEmail(
        patientData.email,
        patientData.name,
        title,
        message
      );
    }
  }

  return NextResponse.json({
    checkInId,
    response,
    escalation: {
      escalated: escalation.escalate,
      urgencyTier: escalation.newUrgencyTier,
      emergency: escalation.emergency?.isEmergency ?? false,
    },
  });
}

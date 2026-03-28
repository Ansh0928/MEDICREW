import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDoctorAuth } from "@/lib/auth";

export async function GET() {
  const { doctor, error } = await getDoctorAuth();
  if (error) return error;

  if (!doctor!.clinicId) {
    return NextResponse.json({ error: "Doctor not assigned to a clinic" }, { status: 403 });
  }

  // Fetch active patients scoped to this doctor's clinic
  const patients = await prisma.patient.findMany({
    where: { deletedAt: null, clinicId: doctor!.clinicId },
    select: {
      id: true,
      name: true,
      email: true,
      knownConditions: true,
      checkIns: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          response: true,
          respondedAt: true,
          createdAt: true,
        },
      },
      consultations: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          urgencyLevel: true,
          symptoms: true,
          createdAt: true,
        },
      },
      careTeamStatus: {
        select: {
          statuses: true,
          updatedAt: true,
        },
      },
    },
  });

  // Transform and sort: escalated patients first, then by last activity
  const monitoringData = patients
    .map((p) => {
      const lastCheckIn = p.checkIns[0] ?? null;
      const lastConsultation = p.consultations[0] ?? null;
      const urgencyLevel = lastConsultation?.urgencyLevel ?? "routine";

      // Determine effective urgency: if last check-in response was "worse", treat as "urgent"
      let effectiveUrgency = urgencyLevel;
      if (lastCheckIn?.response === "worse") {
        effectiveUrgency = "urgent";
      }

      // Compute urgency trend from last 5 check-ins (responded only)
      const responseScore: Record<string, number> = { better: -1, same: 0, worse: 1 };
      const respondedCheckIns = p.checkIns.filter((c) => c.response !== null);
      let urgencyTrend: "improving" | "stable" | "worsening" | "insufficient_data";
      if (respondedCheckIns.length < 2) {
        urgencyTrend = "insufficient_data";
      } else {
        const avgScore =
          respondedCheckIns.reduce((sum, c) => sum + (responseScore[c.response!] ?? 0), 0) /
          respondedCheckIns.length;
        if (avgScore <= -0.3) {
          urgencyTrend = "improving";
        } else if (avgScore >= 0.3) {
          urgencyTrend = "worsening";
        } else {
          urgencyTrend = "stable";
        }
      }

      // Find last agent activity from CareTeamStatus
      const statuses =
        (p.careTeamStatus?.statuses as Record<
          string,
          { agentName: string; message: string; updatedAt: string }
        >) ?? {};
      const lastAgentActivity =
        Object.values(statuses).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0] ?? null;

      return {
        id: p.id,
        name: p.name,
        email: p.email,
        knownConditions: p.knownConditions,
        lastCheckIn: lastCheckIn
          ? {
              status: lastCheckIn.status,
              response: lastCheckIn.response,
              respondedAt: lastCheckIn.respondedAt,
              createdAt: lastCheckIn.createdAt,
            }
          : null,
        lastConsultation: lastConsultation
          ? {
              urgencyLevel: lastConsultation.urgencyLevel,
              symptoms: lastConsultation.symptoms?.substring(0, 80),
              createdAt: lastConsultation.createdAt,
            }
          : null,
        effectiveUrgency,
        urgencyTrend,
        lastAgentActivity: lastAgentActivity
          ? {
              agentName: lastAgentActivity.agentName,
              message: lastAgentActivity.message,
              updatedAt: lastAgentActivity.updatedAt,
            }
          : null,
      };
    })
    .sort((a, b) => {
      // Sort order: emergency > urgent > routine > self_care > no-data
      const urgencyOrder: Record<string, number> = {
        emergency: 0,
        urgent: 1,
        routine: 2,
        self_care: 3,
      };
      const aOrder = urgencyOrder[a.effectiveUrgency] ?? 4;
      const bOrder = urgencyOrder[b.effectiveUrgency] ?? 4;
      return aOrder - bOrder;
    });

  return NextResponse.json(monitoringData);
}

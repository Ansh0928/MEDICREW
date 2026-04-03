import { prisma } from "@/lib/prisma";

const FREE_CONSULTATION_LIMIT = 3;

async function getMonthlyConsultationCount(patientId: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  return prisma.consultation.count({
    where: {
      patientId,
      createdAt: { gte: start },
    },
  });
}

/**
 * Checks if the patient can start a new consultation.
 * Pro/partner users with active subscriptions have unlimited access.
 * Free users are limited to 3 consultations per calendar month.
 */
export async function canStartConsultation(
  patientId: string,
): Promise<
  { allowed: true } | { allowed: false; reason: string; upgradeUrl: string }
> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { subscriptionPlan: true, subscriptionStatus: true },
  });

  if (!patient) return { allowed: true }; // fail open — shouldn't happen

  const plan = patient.subscriptionPlan ?? "free";
  const status = patient.subscriptionStatus ?? "active";

  if (
    (plan === "pro" || plan === "partner") &&
    (status === "active" || status === "trialing")
  ) {
    return { allowed: true };
  }

  const count = await getMonthlyConsultationCount(patientId);
  if (count >= FREE_CONSULTATION_LIMIT) {
    return {
      allowed: false,
      reason: `Free accounts are limited to ${FREE_CONSULTATION_LIMIT} consultations per month. You have used all ${FREE_CONSULTATION_LIMIT}. Upgrade to Pro for unlimited access.`,
      upgradeUrl: "/pricing",
    };
  }

  return { allowed: true };
}

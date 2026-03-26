import { prisma } from "@/lib/prisma";

export async function checkConsent(patientId: string): Promise<boolean> {
  const consent = await prisma.patientConsent.findFirst({
    where: {
      patientId,
      consentVersion: "1.0",
    },
  });
  return consent !== null;
}

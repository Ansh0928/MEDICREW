import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function getDoctorAuth(): Promise<{
  userId: string | null;
  error: NextResponse | null;
}> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  const role = (sessionClaims?.publicMetadata as Record<string, string> | undefined)?.role;
  if (role !== "doctor") {
    return {
      userId: null,
      error: NextResponse.json({ error: "Doctor access required" }, { status: 403 }),
    };
  }
  return { userId, error: null };
}

export async function getAuthenticatedPatient() {
  const { userId } = await auth();
  if (!userId) {
    return {
      patient: null,
      needsOnboarding: false,
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  let patient = await prisma.patient.findUnique({
    where: { clerkUserId: userId },
  });

  if (!patient) {
    // Belt-and-suspenders: webhook may have missed — auto-create the Patient row
    // on the first authenticated request so the user is never stuck.
    const clerkUser = await currentUser();
    if (clerkUser) {
      const name =
        `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
        (clerkUser.emailAddresses[0]?.emailAddress ?? "Patient");
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

      try {
        patient = await prisma.patient.create({
          data: {
            clerkUserId: userId,
            name,
            email,
          },
        });
      } catch {
        // Race condition: another request created the row between our findUnique
        // and create — fetch it now.
        patient = await prisma.patient.findUnique({
          where: { clerkUserId: userId },
        });
      }
    }
  }

  if (!patient) {
    // Clerk user exists but we still have no Patient row — send to onboarding.
    return {
      patient: null,
      needsOnboarding: true,
      error: null,
    };
  }

  return { patient, needsOnboarding: false, error: null };
}

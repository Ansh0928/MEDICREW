import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Doctor, Patient } from "@prisma/client";

// Local development demo users
const DEMO_DOCTOR = {
  id: "demo-doc-123",
  name: "Dr. Demo (Local)",
  email: "doctor@demo.com",
  specialty: "General Practice",
  clerkUserId: "demo-user-id",
  createdAt: new Date(),
  clinicId: null,
} as unknown as Doctor;

const DEMO_PATIENT = {
  id: "demo-pat-456",
  name: "John Smith (Local)",
  email: "patient@demo.com",
  age: 35,
  gender: "male",
  knownConditions: "none",
  deletedAt: null,
  deletedEmail: null,
  clerkUserId: "demo-user-id",
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Patient;

export async function getDoctorAuth(): Promise<{
  doctor: Doctor | null;
  error: NextResponse | null;
}> {
  // Local development bypass
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return { doctor: DEMO_DOCTOR as Doctor, error: null };
  }

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return {
      doctor: null,
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }
  const role = (
    sessionClaims?.publicMetadata as Record<string, string> | undefined
  )?.role;
  if (role !== "doctor") {
    return {
      doctor: null,
      error: NextResponse.json(
        { error: "Doctor access required" },
        { status: 403 },
      ),
    };
  }
  const doctor = await prisma.doctor.findFirst({
    where: { clerkUserId: userId },
  });
  if (!doctor) {
    return {
      doctor: null,
      error: NextResponse.json(
        { error: "Doctor profile not found" },
        { status: 403 },
      ),
    };
  }
  return { doctor, error: null };
}

export async function getAuthenticatedPatient(): Promise<{
  patient: Patient | null;
  needsOnboarding: boolean;
  error: NextResponse | null;
}> {
  // Local development bypass
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return { patient: DEMO_PATIENT, needsOnboarding: false, error: null };
  }

  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (err) {
    console.error("[auth] auth() threw:", err);
    return {
      patient: null,
      needsOnboarding: false,
      error: NextResponse.json(
        { error: "Authentication error" },
        { status: 500 },
      ),
    };
  }

  if (!userId) {
    return {
      patient: null,
      needsOnboarding: false,
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  let patient: Patient | null = null;
  try {
    patient = await prisma.patient.findFirst({
      where: { clerkUserId: userId },
    });
  } catch (err) {
    console.error("[auth] prisma.patient.findFirst threw:", err);
    return {
      patient: null,
      needsOnboarding: false,
      error: NextResponse.json({ error: "Database error" }, { status: 500 }),
    };
  }

  if (!patient) {
    // Belt-and-suspenders: webhook may have missed — auto-create the Patient row
    // on the first authenticated request so the user is never stuck.
    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const name =
          `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
          (clerkUser.emailAddresses[0]?.emailAddress ?? "Patient");
        const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

        try {
          patient = await prisma.patient.create({
            data: { clerkUserId: userId, name, email },
          });
        } catch (createErr) {
          console.error("[auth] prisma.patient.create threw:", createErr);
          // Race condition or email conflict — try fetching by userId
          patient = await prisma.patient.findFirst({
            where: { clerkUserId: userId },
          });
        }
      }
    } catch (err) {
      console.error("[auth] currentUser() or create flow threw:", err);
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

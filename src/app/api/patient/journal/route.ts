import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { patient, needsOnboarding, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (needsOnboarding) return NextResponse.json({ error: "Onboarding required", redirect: "/onboarding" }, { status: 403 });
  const patientId = patient!.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { severity, notes } = body as { severity?: unknown; notes?: unknown };

  if (
    severity === undefined ||
    typeof severity !== "number" ||
    !Number.isInteger(severity) ||
    severity < 1 ||
    severity > 5
  ) {
    return NextResponse.json(
      { error: "severity must be an integer 1-5" },
      { status: 400 }
    );
  }

  // Server-side AEST today-guard: one entry per calendar day
  const todayAEST = new Date().toLocaleDateString("en-AU", { timeZone: "Australia/Sydney" });
  const latestEntry = await prisma.symptomJournal.findFirst({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (latestEntry) {
    const latestAEST = new Date(latestEntry.createdAt).toLocaleDateString("en-AU", {
      timeZone: "Australia/Sydney",
    });
    if (latestAEST === todayAEST) {
      return NextResponse.json({ error: "Only one journal entry per day is allowed" }, { status: 409 });
    }
  }

  const entry = await prisma.symptomJournal.create({
    data: {
      patientId,
      severity,
      notes: typeof notes === "string" ? notes || null : null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function GET(_request: NextRequest) {
  const { patient: authPatient, needsOnboarding: needsOnboarding2, error: authError } = await getAuthenticatedPatient();
  if (authError) return authError;
  if (needsOnboarding2) return NextResponse.json({ error: "Onboarding required", redirect: "/onboarding" }, { status: 403 });
  const patientId = authPatient!.id;

  const entries = await prisma.symptomJournal.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json(entries);
}

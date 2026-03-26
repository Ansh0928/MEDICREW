import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const patientId = request.headers.get("x-patient-id");
  if (!patientId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

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

  const entry = await prisma.symptomJournal.create({
    data: {
      patientId,
      severity,
      notes: typeof notes === "string" ? notes || null : null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function GET(request: NextRequest) {
  const patientId = request.headers.get("x-patient-id");
  if (!patientId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  const entries = await prisma.symptomJournal.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json(entries);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const patientId = request.headers.get("x-patient-id");
  if (!patientId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json();
  const { consentVersion, dataCategories } = body;

  if (!consentVersion || !dataCategories) {
    return NextResponse.json(
      { error: "consentVersion and dataCategories are required" },
      { status: 400 }
    );
  }

  const consent = await prisma.patientConsent.create({
    data: {
      patientId,
      consentVersion,
      dataCategories,
    },
  });

  return NextResponse.json(
    { id: consent.id, consentedAt: consent.consentedAt },
    { status: 201 }
  );
}

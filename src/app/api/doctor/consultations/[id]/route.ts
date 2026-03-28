import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDoctorAuth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await getDoctorAuth();
  if (error) return error;

  const { id } = await params;

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    select: {
      id: true,
      patientId: true,
      symptoms: true,
      urgencyLevel: true,
      redFlags: true,
      recommendation: true,
      createdAt: true,
    },
  });

  if (!consultation) {
    return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
  }

  // Parse redFlags from stored JSON string to array
  let redFlags: string[] = [];
  if (consultation.redFlags) {
    try {
      const parsed = JSON.parse(consultation.redFlags);
      redFlags = Array.isArray(parsed) ? parsed : [];
    } catch {
      redFlags = [];
    }
  }

  return NextResponse.json({
    ...consultation,
    redFlags,
    createdAt: consultation.createdAt.toISOString(),
  });
}

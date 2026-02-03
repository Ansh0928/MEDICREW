import { NextRequest, NextResponse } from "next/server";
import {
  getAllSymptomChecks,
  getSymptomChecksByPatient,
} from "@/lib/doctors-patients-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    if (patientId) {
      const checks = getSymptomChecksByPatient(patientId);
      return NextResponse.json(checks);
    }
    const checks = getAllSymptomChecks();
    return NextResponse.json(checks);
  } catch (error) {
    console.error("Symptom checks fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch symptom checks" },
      { status: 500 }
    );
  }
}

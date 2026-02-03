import { NextRequest, NextResponse } from "next/server";
import { analyzeSymptoms } from "@/lib/ai/doctors-patients-ai";
import { addSymptomCheck } from "@/lib/doctors-patients-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patientId,
      patientName,
      symptoms,
      duration,
      additionalInfo = "",
    } = body;

    if (
      !patientId ||
      !patientName ||
      !Array.isArray(symptoms) ||
      symptoms.length === 0 ||
      !duration
    ) {
      return NextResponse.json(
        { error: "patientId, patientName, symptoms (array), and duration are required" },
        { status: 400 }
      );
    }

    const assessment = await analyzeSymptoms(
      symptoms,
      duration,
      typeof additionalInfo === "string" ? additionalInfo : ""
    );
    const symptomCheck = addSymptomCheck({
      patientId,
      patientName,
      symptoms,
      duration,
      additionalInfo: typeof additionalInfo === "string" ? additionalInfo : "",
      aiAssessment: assessment,
      status: "pending",
    });

    return NextResponse.json({ assessment, symptomCheck });
  } catch (error) {
    console.error("Symptom check error:", error);
    return NextResponse.json(
      { error: "Failed to process symptom check" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  generateDoctorInsights,
  generateTreatmentPlan,
} from "@/lib/ai/doctors-patients-ai";
import { getSymptomCheckById, updateSymptomCheckStatus } from "@/lib/doctors-patients-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symptomCheckId, doctorId } = body;

    if (!symptomCheckId) {
      return NextResponse.json(
        { error: "symptomCheckId is required" },
        { status: 400 }
      );
    }

    const symptomCheck = getSymptomCheckById(symptomCheckId);
    if (!symptomCheck) {
      return NextResponse.json(
        { error: "Symptom check not found" },
        { status: 404 }
      );
    }

    if (doctorId) {
      updateSymptomCheckStatus(symptomCheckId, "in-review", doctorId);
    }

    const [insights, treatmentPlan] = await Promise.all([
      generateDoctorInsights(symptomCheck),
      generateTreatmentPlan(
        symptomCheck.aiAssessment.possibleConditions[0] ?? "Further evaluation",
        symptomCheck.symptoms
      ),
    ]);

    return NextResponse.json({ insights, treatmentPlan });
  } catch (error) {
    console.error("Case insights error:", error);
    return NextResponse.json(
      { error: "Failed to generate case insights" },
      { status: 500 }
    );
  }
}

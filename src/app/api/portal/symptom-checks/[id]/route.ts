import { NextRequest, NextResponse } from "next/server";
import { getSymptomCheckById } from "@/lib/doctors-patients-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const check = getSymptomCheckById(id);
    if (!check) {
      return NextResponse.json({ error: "Symptom check not found" }, { status: 404 });
    }
    return NextResponse.json(check);
  } catch (error) {
    console.error("Symptom check fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch symptom check" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { addDoctorNote } from "@/lib/doctors-patients-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symptomCheckId, doctorId, doctorName, diagnosis, treatment = "", notes = "" } = body;

    if (!symptomCheckId || !doctorId || !doctorName || !diagnosis) {
      return NextResponse.json(
        { error: "symptomCheckId, doctorId, doctorName, and diagnosis are required" },
        { status: 400 }
      );
    }

    const note = addDoctorNote({
      symptomCheckId,
      doctorId,
      doctorName,
      diagnosis,
      treatment: typeof treatment === "string" ? treatment : "",
      notes: typeof notes === "string" ? notes : "",
    });
    return NextResponse.json(note);
  } catch (error) {
    console.error("Doctor note error:", error);
    return NextResponse.json(
      { error: "Failed to submit doctor note" },
      { status: 500 }
    );
  }
}

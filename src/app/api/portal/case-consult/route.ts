import { NextRequest, NextResponse } from "next/server";
import { streamDoctorConsultation } from "@/agents/doctorConsultation";
import { getSymptomCheckById } from "@/lib/doctors-patients-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symptomCheckId } = body;

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

    // Return streaming response (SSE)
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamDoctorConsultation(symptomCheck)) {
            const data = JSON.stringify(event) + "\n";
            controller.enqueue(encoder.encode(`data: ${data}\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Doctor consultation streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Doctor consultation error:", error);
    return NextResponse.json(
      { error: "Failed to process doctor consultation" },
      { status: 500 }
    );
  }
}

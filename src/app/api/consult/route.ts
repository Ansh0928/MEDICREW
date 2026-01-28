import { NextRequest, NextResponse } from "next/server";
import { runConsultation, streamConsultation } from "@/agents/orchestrator";

export async function POST(request: NextRequest) {
  try {
    const { symptoms, stream = false } = await request.json();

    if (!symptoms || typeof symptoms !== "string") {
      return NextResponse.json(
        { error: "Symptoms are required" },
        { status: 400 }
      );
    }

    if (stream) {
      // Return streaming response
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of streamConsultation(symptoms)) {
              const data = JSON.stringify(event) + "\n";
              controller.enqueue(encoder.encode(`data: ${data}\n`));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            console.error("Streaming error:", error);
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
    }

    // Non-streaming response
    const result = await runConsultation(symptoms);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Consultation error:", error);
    return NextResponse.json(
      { error: "Failed to process consultation" },
      { status: 500 }
    );
  }
}

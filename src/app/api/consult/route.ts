import { NextRequest, NextResponse } from "next/server";
import { runConsultation, streamConsultation } from "@/agents/orchestrator";

interface APIError extends Error {
  status?: number;
  statusText?: string;
}

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
            const err = error as APIError;
            console.error("Streaming error:", err);

            // Send error event to client
            let errorMessage = "Something went wrong. Please try again.";
            if (err.status === 429 || err.message?.includes("429") || err.message?.includes("quota")) {
              errorMessage = "Our AI doctors are very busy right now. Please wait 30 seconds and try again.";
            } else if (err.message?.includes("API key")) {
              errorMessage = "Service configuration error. Please contact support.";
            }

            const errorEvent = JSON.stringify({
              error: true,
              message: errorMessage,
              retryAfter: err.status === 429 ? 30 : undefined
            });
            controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
            controller.close();
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
    const err = error as APIError;
    console.error("Consultation error:", err);

    // Determine user-friendly error message
    let errorMessage = "Something went wrong. Please try again.";
    let statusCode = 500;

    if (err.status === 429 || err.message?.includes("429") || err.message?.includes("quota")) {
      errorMessage = "Our AI doctors are very busy right now. Please wait 30 seconds and try again.";
      statusCode = 429;
    } else if (err.message?.includes("API key")) {
      errorMessage = "Service configuration error. Please contact support.";
      statusCode = 503;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}


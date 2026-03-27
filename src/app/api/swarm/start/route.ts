// src/app/api/swarm/start/route.ts
import { NextRequest } from "next/server";
import { streamSwarm } from "@/agents/swarm";
import { checkRateLimit } from "@/lib/rate-limit";
import { SwarmEvent } from "@/agents/swarm-types";
import { detectEmergency } from "@/lib/emergency-rules";
import { ConsultationPatientInfoSchema } from "@/lib/consultation-intake";

// 300s max — full consultation: triage + parallel doctors + debate + synthesis
// Plus up to 2min clarification wait. Vercel Pro/Enterprise supports 300s.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateCheck = await checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests", retryAfter: rateCheck.retryAfter }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await request.json();
  const { symptoms, patientInfo } = body;

  if (!symptoms || typeof symptoms !== "string") {
    return new Response(JSON.stringify({ error: "symptoms required" }), { status: 400 });
  }
  if (symptoms.length > 2000) {
    return new Response(JSON.stringify({ error: "symptoms must be under 2000 characters" }), { status: 400 });
  }

  // C1: Emergency detection MUST run before any LLM call (AHPRA compliance rule)
  const emergency = detectEmergency(symptoms);
  if (emergency.isEmergency) {
    return new Response(JSON.stringify(emergency.response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate patientInfo using canonical consultation schema
  const patientInfoResult = ConsultationPatientInfoSchema.safeParse(patientInfo);
  if (!patientInfoResult.success) {
    const firstIssue = patientInfoResult.error.issues[0];
    const path = firstIssue?.path?.join(".");
    const prefix = path ? `${path}: ` : "";
    return new Response(JSON.stringify({ error: `${prefix}${firstIssue?.message ?? "Invalid patientInfo"}` }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SwarmEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of streamSwarm(symptoms, patientInfoResult.data)) {
          send(event);
        }
      } catch (err) {
        send({ type: "error", message: "Consultation failed. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

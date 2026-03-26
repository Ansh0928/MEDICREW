// src/app/api/swarm/start/route.ts
import { NextRequest } from "next/server";
import { streamSwarm } from "@/agents/swarm";
import { checkRateLimit } from "@/lib/rate-limit";
import { SwarmEvent } from "@/agents/swarm-types";

// 300s max — full consultation: triage + parallel doctors + debate + synthesis
// Plus up to 2min clarification wait. Vercel Pro/Enterprise supports 300s.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateCheck = checkRateLimit(ip);
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

  // Validate patientInfo
  const age = patientInfo?.age;
  const gender = patientInfo?.gender;
  if (!age || typeof age !== "string" || age.trim() === "") {
    return new Response(JSON.stringify({ error: "patientInfo.age is required" }), { status: 400 });
  }
  if (!gender || typeof gender !== "string" || gender.trim() === "") {
    return new Response(JSON.stringify({ error: "patientInfo.gender is required" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SwarmEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of streamSwarm(symptoms, patientInfo)) {
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

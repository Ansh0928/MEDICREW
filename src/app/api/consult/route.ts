import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedPatient } from "@/lib/auth";
import { runConsultation, streamConsultation } from "@/agents/orchestrator";
import { detectEmergency } from "@/lib/emergency-rules";
import { checkConsent } from "@/lib/consent-check";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";
import { Prisma } from "@prisma/client";
import { AgentMessage } from "@/agents/types";

interface APIError extends Error {
  status?: number;
  statusText?: string;
}

// Build CareTeamStatus JSONB from agent messages
function buildCareTeamStatuses(
  messages: AgentMessage[],
  symptoms: string
): Record<string, { agentName: string; message: string; updatedAt: string }> {
  const statuses: Record<string, { agentName: string; message: string; updatedAt: string }> = {};
  const seen = new Set<string>();

  for (const msg of messages) {
    // Skip orchestrator/triage duplicates — only include named care-team agents
    if (msg.role === "orchestrator" || seen.has(msg.role)) continue;
    seen.add(msg.role);
    statuses[msg.role] = {
      agentName: msg.agentName,
      message: `Reviewed your symptoms: ${symptoms.substring(0, 50)}...`,
      updatedAt: new Date().toISOString(),
    };
  }

  return statuses;
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

    // Emergency detection — MUST run before any LLM processing
    const emergency = detectEmergency(symptoms);
    if (emergency.isEmergency) {
      return NextResponse.json(emergency.response, { status: 200 });
    }

    // Consent gate — must have valid consent before processing health data
    const { patient: authPatient, error: authError } = await getAuthenticatedPatient();
    if (authError) return authError;
    const patientId = authPatient.id;
    const hasConsent = await checkConsent(patientId);
    if (!hasConsent) {
      return NextResponse.json(
        { error: "Consent required", redirectTo: "/consent" },
        { status: 403 }
      );
    }

    if (stream) {
      // Return streaming response
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const allMessages: AgentMessage[] = [];
            let finalResult: { urgencyLevel?: string; recommendation?: unknown } = {};

            // Fetch patient profile for context injection (PROF-02)
            const patient = await prisma.patient.findUnique({
              where: { id: patientId },
              select: { knownConditions: true, medications: true, age: true, gender: true, allergies: true, name: true },
            });

            const patientContext = patient
              ? `Patient profile: Age ${patient.age ?? 'unknown'}, ${patient.gender ?? 'unknown'}. Known conditions: ${patient.knownConditions ?? 'none'}. Medications: ${(patient.medications as string[] | null ?? []).join(', ') || 'none'}. Allergies: ${(patient.allergies as string[] | null ?? []).join(', ') || 'none'}.`
              : '';

            for await (const event of streamConsultation(symptoms, undefined, undefined, patientContext)) {
              const data = JSON.stringify(event) + "\n";
              controller.enqueue(encoder.encode(`data: ${data}\n`));

              // Collect messages and result data for post-stream CareTeamStatus write
              if (event.data.messages) {
                allMessages.push(...(event.data.messages as AgentMessage[]));
              }
              if (event.data.urgencyLevel) {
                finalResult.urgencyLevel = event.data.urgencyLevel as string;
              }
              if (event.data.recommendation) {
                finalResult.recommendation = event.data.recommendation;
              }
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();

            // Write CareTeamStatus and Consultation after stream completes
            // NOTE: CareTeamStatus table requires REPLICA IDENTITY FULL for Supabase Realtime
            // Run: ALTER TABLE "CareTeamStatus" REPLICA IDENTITY FULL;
            if (allMessages.length > 0) {
              const statuses = buildCareTeamStatuses(allMessages, symptoms);
              await prisma.careTeamStatus.upsert({
                where: { patientId },
                create: { patientId, statuses },
                update: { statuses },
              });
            }

            const consultation = await prisma.consultation.create({
              data: {
                patientId,
                symptoms,
                urgencyLevel: finalResult.urgencyLevel ?? null,
                recommendation: finalResult.recommendation !== undefined
                  ? (finalResult.recommendation as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
              },
            });

            // Fire Inngest check-in event — 48h durable delay (Phase 3)
            await inngest.send({
              name: "consultation/completed",
              data: {
                patientId,
                consultationId: consultation.id,
                patientName: patient?.name ?? "there",
              },
            });
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

    // Write CareTeamStatus after non-streaming consultation completes
    // NOTE: CareTeamStatus table requires REPLICA IDENTITY FULL for Supabase Realtime
    // Run: ALTER TABLE "CareTeamStatus" REPLICA IDENTITY FULL;
    if (result.messages && result.messages.length > 0) {
      const statuses = buildCareTeamStatuses(result.messages, symptoms);
      await prisma.careTeamStatus.upsert({
        where: { patientId },
        create: { patientId, statuses },
        update: { statuses },
      });
    }

    const nonStreamingPatient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { name: true },
    });

    const nonStreamingConsultation = await prisma.consultation.create({
      data: {
        patientId,
        symptoms,
        urgencyLevel: result.urgencyLevel ?? null,
        recommendation: result.recommendation !== undefined
          ? (result.recommendation as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    // Fire Inngest check-in event — 48h durable delay (Phase 3)
    await inngest.send({
      name: "consultation/completed",
      data: {
        patientId,
        consultationId: nonStreamingConsultation.id,
        patientName: nonStreamingPatient?.name ?? "there",
      },
    });

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

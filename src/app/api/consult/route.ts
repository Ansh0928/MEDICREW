import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedPatient } from "@/lib/auth";
import { runConsultation, streamConsultation } from "@/agents/orchestrator";
import { streamSwarm } from "@/agents/swarm";
import { detectEmergency } from "@/lib/emergency-rules";
import { checkConsent } from "@/lib/consent-check";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";
import { Prisma } from "@prisma/client";
import { AgentMessage } from "@/agents/types";
import { SwarmEvent, SwarmSynthesis } from "@/agents/swarm-types";
import {
  ConsultationInputSchema,
  buildPatientContext,
  resolveConsultationPatientInfo,
} from "@/lib/consultation-intake";
import { canStartConsultation } from "@/lib/subscription";

export const dynamic = "force-dynamic";

interface APIError extends Error {
  status?: number;
  statusText?: string;
}

// Build CareTeamStatus JSONB from agent messages
function buildCareTeamStatuses(
  messages: AgentMessage[],
  symptoms: string,
): Record<string, { agentName: string; message: string; updatedAt: string }> {
  const statuses: Record<
    string,
    { agentName: string; message: string; updatedAt: string }
  > = {};
  const seen = new Set<string>();

  for (const msg of messages) {
    // Skip orchestrator/triage duplicates — only include named care-team agents
    if (msg.role === "orchestrator" || seen.has(msg.role)) continue;
    seen.add(msg.role);
    statuses[msg.role] = {
      agentName: msg.agentName,
      message: msg.content.substring(0, 200),
      updatedAt: new Date().toISOString(),
    };
  }

  return statuses;
}

export async function POST(request: NextRequest) {
  try {
    const payloadResult = ConsultationInputSchema.safeParse(
      await request.json(),
    );
    if (!payloadResult.success) {
      return NextResponse.json(
        { error: payloadResult.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    const {
      symptoms,
      stream = false,
      swarm = false,
      patientInfo,
    } = payloadResult.data;

    // Emergency detection — MUST run before any LLM processing
    const emergency = detectEmergency(symptoms);
    if (emergency.isEmergency) {
      return NextResponse.json(emergency.response, { status: 200 });
    }

    // Consent gate — must have valid consent before processing health data
    const {
      patient: authPatient,
      needsOnboarding,
      error: authError,
    } = await getAuthenticatedPatient();
    if (authError) return authError;
    if (needsOnboarding)
      return NextResponse.json(
        { error: "Onboarding required", redirect: "/onboarding" },
        { status: 403 },
      );
    const patientId = authPatient!.id;
    const hasConsent = await checkConsent(patientId);
    if (!hasConsent) {
      return NextResponse.json(
        { error: "Consent required", redirectTo: "/consent" },
        { status: 403 },
      );
    }

    // Subscription quota gate — Free tier is limited to 3 consultations/month
    const quotaCheck = await canStartConsultation(patientId);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.reason,
          upgradeUrl: quotaCheck.upgradeUrl,
          limitReached: true,
        },
        { status: 402 },
      );
    }

    // Canonical patient context for all consultation pathways.
    const patientProfile = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        name: true,
        knownConditions: true,
        medications: true,
        age: true,
        gender: true,
        allergies: true,
      },
    });
    const resolvedPatientInfo = resolveConsultationPatientInfo(
      patientProfile,
      patientInfo,
    );
    const patientContext = buildPatientContext(resolvedPatientInfo);

    // Swarm streaming path — proxies SwarmEvent SSE from streamSwarm() with auth + DB coverage.
    // HuddleRoom calls this instead of /api/swarm/start so every consultation is persisted
    // and the 48h Inngest check-in is scheduled. patientInfo (age/gender) forwarded from client.
    if (stream && swarm) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let synthesis: SwarmSynthesis | null = null;
          try {
            for await (const event of streamSwarm(
              symptoms,
              resolvedPatientInfo,
            )) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
              );
              if ((event as SwarmEvent).type === "synthesis_complete") {
                synthesis =
                  (event as Extract<SwarmEvent, { type: "synthesis_complete" }>)
                    .data ?? null;
              }
            }
          } catch (err) {
            const errorEvent: SwarmEvent = {
              type: "error",
              message: "Consultation failed. Please try again.",
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`),
            );
          } finally {
            controller.close();
          }

          // Persist consultation record after stream completes
          try {
            const consultation = await prisma.consultation.create({
              data: {
                patientId,
                symptoms,
                urgencyLevel: synthesis?.urgency ?? null,
                recommendation:
                  synthesis !== null
                    ? (synthesis as unknown as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
              },
            });
            await inngest.send({
              name: "consultation/completed",
              data: {
                patientId,
                consultationId: consultation.id,
                patientName: patientProfile?.name ?? "there",
              },
            });
          } catch (dbErr) {
            console.error("[consult/swarm] DB write failed:", dbErr);
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

    if (stream) {
      // Return streaming response
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const allMessages: AgentMessage[] = [];
            let finalResult: {
              urgencyLevel?: string;
              recommendation?: unknown;
            } = {};

            for await (const event of streamConsultation(
              symptoms,
              undefined,
              undefined,
              patientContext,
            )) {
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
                recommendation:
                  finalResult.recommendation !== undefined
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
                patientName: patientProfile?.name ?? "there",
              },
            });
          } catch (error) {
            const err = error as APIError;
            console.error("Streaming error:", err);

            // Send error event to client
            let errorMessage = "Something went wrong. Please try again.";
            if (
              err.status === 429 ||
              err.message?.includes("429") ||
              err.message?.includes("quota")
            ) {
              errorMessage =
                "Our AI doctors are very busy right now. Please wait 30 seconds and try again.";
            } else if (err.message?.includes("API key")) {
              errorMessage =
                "Service configuration error. Please contact support.";
            }

            const errorEvent = JSON.stringify({
              error: true,
              message: errorMessage,
              retryAfter: err.status === 429 ? 30 : undefined,
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

    const result = await runConsultation(
      symptoms,
      undefined,
      undefined,
      patientContext,
    );

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

    const nonStreamingConsultation = await prisma.consultation.create({
      data: {
        patientId,
        symptoms,
        urgencyLevel: result.urgencyLevel ?? null,
        recommendation:
          result.recommendation !== undefined
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
        patientName: patientProfile?.name ?? "there",
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const err = error as APIError;
    console.error("Consultation error:", err);

    // Determine user-friendly error message
    let errorMessage = "Something went wrong. Please try again.";
    let statusCode = 500;

    if (
      err.status === 429 ||
      err.message?.includes("429") ||
      err.message?.includes("quota")
    ) {
      errorMessage =
        "Our AI doctors are very busy right now. Please wait 30 seconds and try again.";
      statusCode = 429;
    } else if (err.message?.includes("API key")) {
      errorMessage = "Service configuration error. Please contact support.";
      statusCode = 503;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

import { NextRequest } from "next/server";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createJsonModel, createFastModel } from "@/lib/ai/config";
import { RESIDENT_ROLES, SwarmEvent, ResidentRole } from "@/agents/swarm-types";
import { streamSwarm } from "@/agents/swarm";
import { getAuthenticatedPatient } from "@/lib/auth";
import { checkConsent } from "@/lib/consent-check";
import { detectEmergency } from "@/lib/emergency-rules";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { AGENT_COMPLIANCE_RULE } from "@/lib/compliance";
import { buildPatientContext, resolveConsultationPatientInfo } from "@/lib/consultation-intake";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { patient: authPatient, needsOnboarding, error: authError } = await getAuthenticatedPatient();
  if (authError) return authError;
  if (needsOnboarding) return Response.json({ error: "Onboarding required", redirect: "/onboarding" }, { status: 403 });
  const patientId = authPatient!.id;
  const hasConsent = await checkConsent(patientId);
  if (!hasConsent) {
    return Response.json({ error: "Consent required", redirectTo: "/consent" }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateCheck = await checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return Response.json({ error: "Too many requests", retryAfter: rateCheck.retryAfter }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const { sessionId, question, synthesisContext } = body;

  if (!sessionId || typeof sessionId !== "string") {
    return Response.json({ error: "sessionId required" }, { status: 400 });
  }
  if (!question || typeof question !== "string" || question.trim() === "") {
    return Response.json({ error: "question required" }, { status: 400 });
  }
  if (question.length > 500) {
    return Response.json({ error: "question must be under 500 characters" }, { status: 400 });
  }

  const emergency = detectEmergency(`${question}\n${typeof synthesisContext === "string" ? synthesisContext : ""}`);
  if (emergency.isEmergency) {
    return Response.json(emergency.response, { status: 200 });
  }

  const patientProfile = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { age: true, gender: true, knownConditions: true, medications: true, allergies: true },
  });
  const resolvedPatientInfo = resolveConsultationPatientInfo(patientProfile, undefined);
  const patientContext = buildPatientContext(resolvedPatientInfo);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SwarmEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        // Classify: simple or complex?
        const classifier = createJsonModel();
        const classifyResponse = await classifier.invoke([
          new SystemMessage(`Classify this follow-up question as simple or complex.
Simple: factual, single-answer, no new symptoms (e.g. "how long to use heat pack?")
Complex: involves new symptoms, contradicts recommendation, or needs clinical re-evaluation

Respond ONLY with valid JSON: { "type": "simple" | "complex", "relevantResidentRoles": ["conservative" | "pharmacological" | "investigative" | "red-flag"] }
relevantResidentRoles is only populated for complex questions.`),
          new HumanMessage(`Follow-up question: "${question}"\nContext: ${synthesisContext ?? "General consultation"}`),
        ]);

        let questionType: "simple" | "complex" = "simple";
        let relevantResidentRoles: ResidentRole[] = [];

        try {
          const parsed = JSON.parse((classifyResponse.content as string).replace(/```json\n?|\n?```/g, ""));
          questionType = parsed.type ?? "simple";
          // Validate roles against known RESIDENT_ROLES
          const rawRoles: string[] = parsed.relevantResidentRoles ?? [];
          relevantResidentRoles = rawRoles.filter((r): r is ResidentRole =>
            RESIDENT_ROLES.includes(r as ResidentRole)
          );
          // Default to all roles if complex but none specified
          if (questionType === "complex" && relevantResidentRoles.length === 0) {
            relevantResidentRoles = [...RESIDENT_ROLES];
          }
        } catch (e) {
          console.error("[followup] classify parse failed:", e);
        }

        send({
          type: "followup_routed",
          questionType,
          activatedRoles: questionType === "simple" ? ["lead"] : relevantResidentRoles,
        });

        if (questionType === "complex" && relevantResidentRoles.length > 0) {
          // Complex follow-up re-enters the full swarm cycle.
          const followUpSymptoms = `${patientContext}\n\nPrevious recommendation context:\n${synthesisContext ?? "Not provided"}\n\nFollow-up question:\n${question}`;
          let finalSynthesis: { primaryRecommendation: string; nextSteps: string[] } | null = null;
          for await (const event of streamSwarm(followUpSymptoms, resolvedPatientInfo)) {
            if (event.type === "synthesis_complete") {
              finalSynthesis = {
                primaryRecommendation: event.data.primaryRecommendation,
                nextSteps: event.data.nextSteps,
              };
            }
            if (event.type === "done") continue;
            send(event);
          }
          if (finalSynthesis) {
            const nextStepsText = finalSynthesis.nextSteps.length > 0
              ? ` Next steps: ${finalSynthesis.nextSteps.join("; ")}`
              : "";
            send({
              type: "followup_answer",
              answer: `${finalSynthesis.primaryRecommendation}${nextStepsText} Please consult a healthcare provider for personalised advice.`,
            });
          }
        } else {
          // ── Simple path: gatekeeper quick answer ─────────────────────────────
          const llm = createFastModel();
          const answer = await llm.invoke([
            new SystemMessage(`You are Alex AI — GP, the gatekeeper for follow-up questions.
${AGENT_COMPLIANCE_RULE}
Answer follow-up questions concisely and clearly in under 150 words.
Use cautious language, avoid diagnosis claims, and always include a reminder to consult a qualified healthcare provider.`),
            new HumanMessage(`Patient context:
${patientContext}

Prior recommendation context:
${synthesisContext ?? "Not provided"}

Follow-up question:
${question}`),
          ]);

          send({ type: "followup_answer", answer: answer.content as string });
        }

        send({ type: "done" });
      } catch (err) {
        console.error("[followup] error:", err);
        send({ type: "error", message: "Follow-up failed. Please try again." });
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

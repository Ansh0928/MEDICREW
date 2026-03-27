import { NextRequest } from "next/server";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createJsonModel, createFastModel } from "@/lib/ai/config";
import { SwarmEvent, ResidentRole, RESIDENT_ROLES, createInitialSwarmState } from "@/agents/swarm-types";
import { buildResidentPrompt, runResident } from "@/agents/swarm";
import crypto from "crypto";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
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
          // ── Complex path: run residents then synthesise their input ──────────
          // Build a minimal state for the follow-up context.
          // symptoms = original synthesis context + new question
          const followUpSymptoms = `${synthesisContext ?? ""}\nFollow-up: ${question}`;
          const followUpState = createInitialSwarmState(
            crypto.randomUUID(),
            followUpSymptoms,
            { age: "unknown", gender: "unknown" }
          );

          // Pre-initialise the gp lead entry so runResident can push to it.
          const specialtyRole = "gp" as const;
          followUpState.leadSwarms[specialtyRole] = {
            status: "running",
            hypotheses: [],
            residentDebate: [],
            rectification: null,
          };

          // Run each relevant resident in parallel
          await Promise.all(
            relevantResidentRoles.map((residentRole) =>
              runResident(residentRole, specialtyRole, followUpState, send)
            )
          );

          // Collect resident hypotheses for synthesis prompt
          const residentSummary = (followUpState.leadSwarms[specialtyRole]?.hypotheses ?? [])
            .map((h) => `[${h.residentRole}] "${h.name}" (${h.confidence}%) — ${h.reasoning}`)
            .join("\n");

          // Synthesise resident views into a final follow-up answer
          const llm = createFastModel();
          const answer = await llm.invoke([
            new SystemMessage(`You are a helpful AI health navigator. You have received clinical assessments from ${relevantResidentRoles.length} resident perspectives below.
Synthesise their input to answer the follow-up question clearly and concisely.
Keep your answer under 200 words.
Always end with a reminder to consult a healthcare provider for personalised advice.`),
            new HumanMessage(`Follow-up question: "${question}"\nOriginal context: ${synthesisContext ?? ""}

Resident assessments:
${residentSummary || "No resident input available."}`),
          ]);

          send({ type: "followup_answer", answer: answer.content as string });
        } else {
          // ── Simple path: single LLM call ─────────────────────────────────────
          const llm = createFastModel();
          const answer = await llm.invoke([
            new SystemMessage(`You are a helpful AI health navigator. Answer this follow-up question concisely and clearly.
Provide practical guidance. Keep answer under 150 words.
Always end with a reminder to consult a healthcare provider for personalised advice.`),
            new HumanMessage(`Question: "${question}"\nContext: ${synthesisContext ?? ""}`),
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

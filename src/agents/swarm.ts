// src/agents/swarm.ts
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createJsonModel, createFastModel } from "@/lib/ai/config";
import { agentRegistry } from "./definitions";
import {
  SwarmState, SwarmEvent, DoctorRole, SwarmHypothesis,
  SwarmSynthesis, answerStore
} from "./swarm-types";
import { UrgencyLevel } from "./types";
import crypto from "crypto";

const SCOPE_BOUNDARY = `

## Scope Boundaries
You provide health navigation guidance only — not medical diagnoses or prescriptions.
Never state a definitive diagnosis. Use language like "may suggest", "could indicate", "worth investigating".
If you cannot assess confidently, say so explicitly.
Always recommend discussing findings with a qualified healthcare provider.`;

// ── L1: Triage ─────────────────────────────────────────────────────────────

async function runTriage(
  state: SwarmState,
  emit: (event: SwarmEvent) => void
): Promise<void> {
  const llm = createJsonModel();
  const response = await llm.invoke([
    new SystemMessage(`You are an emergency triage specialist. Assess symptom urgency and determine which specialists should review this case.
Respond ONLY with valid JSON matching this schema exactly:
{
  "urgency": "emergency" | "urgent" | "routine" | "self_care",
  "relevantDoctors": ["gp", "cardiology", "mental_health", "dermatology", "orthopedic", "gastro", "physiotherapy"],
  "redFlags": ["string"]
}
${SCOPE_BOUNDARY}`),
    new HumanMessage(`Patient: ${state.patientInfo.age}y ${state.patientInfo.gender}${state.patientInfo.knownConditions ? `, conditions: ${state.patientInfo.knownConditions}` : ""}
Symptoms: ${state.symptoms}`),
  ]);

  let urgency: UrgencyLevel = "urgent"; // fail-safe default
  let relevantDoctors: DoctorRole[] = ["gp"];
  let redFlags: string[] = [];

  try {
    const content = response.content as string;
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ""));
    urgency = parsed.urgency ?? "urgent";
    relevantDoctors = parsed.relevantDoctors ?? ["gp"];
    redFlags = parsed.redFlags ?? [];
  } catch (e) {
    console.error("[swarm] triage parse failed, defaulting to urgent:", e);
  }

  state.triage = { urgency, relevantDoctors, redFlags };
  state.currentPhase = "swarm";

  emit({ type: "triage_complete", data: state.triage });
  emit({ type: "phase_changed", phase: "swarm" });

  // Emergency: emit synthesis immediately before swarm runs
  if (urgency === "emergency") {
    state.synthesis = {
      urgency: "emergency",
      rankedHypotheses: [],
      nextSteps: ["Call 000 (Australian Emergency) immediately", "Do not drive yourself", "Stay calm and wait for help"],
      questionsForDoctor: [],
      timeframe: "Immediately",
      disclaimer: "This is health navigation guidance only. Call emergency services now.",
    };
    state.currentPhase = "complete";
    emit({ type: "synthesis_complete", data: state.synthesis });
    emit({ type: "done" });
  }
}

// ── L3: Sub-agent hypothesis explorer ──────────────────────────────────────

async function runHypothesisSubAgent(
  hypothesis: string,
  doctorRole: DoctorRole,
  symptoms: string,
  patientInfo: SwarmState["patientInfo"],
  emit: (event: SwarmEvent) => void
): Promise<SwarmHypothesis & { needsClarification?: string }> {
  const llm = createFastModel();
  const agent = agentRegistry[doctorRole];
  const hypothesisId = crypto.randomUUID();

  let tokenBuffer = "";
  const stream = await llm.stream([
    new SystemMessage(`${agent.systemPrompt}
You are evaluating ONE specific hypothesis. Be concise — max 150 words.
Respond with JSON: { "confidence": 0-100, "reasoning": "brief reasoning", "needsClarification": "question or null" }`),
    new HumanMessage(`Patient: ${patientInfo.age}y ${patientInfo.gender}
Symptoms: ${symptoms}
Evaluate hypothesis: "${hypothesis}"
If you need one specific piece of patient history to refine confidence, set needsClarification. Otherwise null.`),
  ]);

  for await (const chunk of stream) {
    const token = (chunk.content as string) || "";
    tokenBuffer += token;
    emit({ type: "doctor_token", doctorRole, token });
  }

  let confidence = 30;
  let reasoning = tokenBuffer;
  let needsClarification: string | undefined;

  try {
    const cleaned = tokenBuffer.replace(/```json\n?|\n?```/g, "");
    const parsed = JSON.parse(cleaned);
    confidence = Math.min(100, Math.max(0, parsed.confidence ?? 30));
    reasoning = parsed.reasoning ?? tokenBuffer;
    needsClarification = parsed.needsClarification || undefined;
  } catch {
    // use defaults
  }

  return { id: hypothesisId, name: hypothesis, confidence, reasoning, needsClarification };
}

// ── L2: Doctor swarm ────────────────────────────────────────────────────────

const HYPOTHESES_BY_ROLE: Partial<Record<DoctorRole, string[]>> = {
  cardiology: ["Acute coronary syndrome / ACS", "Unstable angina", "Aortic dissection", "Pericarditis / myocarditis"],
  mental_health: ["Panic attack / acute anxiety", "Somatic symptom disorder", "Major depressive episode"],
  dermatology: ["Contact dermatitis / allergic reaction", "Eczema", "Psoriasis", "Cellulitis"],
  orthopedic: ["Musculoskeletal strain", "Herniated disc", "Stress fracture", "Tendinopathy"],
  gastro: ["Gastroesophageal reflux (GERD)", "Peptic ulcer disease", "Irritable bowel syndrome", "Inflammatory bowel disease"],
  physiotherapy: ["Postural dysfunction", "Repetitive strain injury", "Sports injury", "Nerve impingement"],
  gp: ["Viral / bacterial infection", "Metabolic / endocrine cause", "Medication side effect", "Non-specific systemic illness"],
};

async function runDoctorSwarm(
  doctorRole: DoctorRole,
  state: SwarmState,
  emit: (event: SwarmEvent) => void
): Promise<void> {
  const agent = agentRegistry[doctorRole];
  if (!agent) return;

  emit({ type: "doctor_activated", doctorRole, doctorName: agent.name });
  state.doctorSwarms[doctorRole] = { status: "running", hypotheses: [] };

  const hypotheses = HYPOTHESES_BY_ROLE[doctorRole] ?? ["General assessment"];
  const snapshot = state.symptoms;
  const pi = state.patientInfo;

  // Run all hypotheses in parallel
  const results = await Promise.all(
    hypotheses.slice(0, 4).map((h) =>
      runHypothesisSubAgent(h, doctorRole, snapshot, pi, emit)
    )
  );

  for (const result of results) {
    state.doctorSwarms[doctorRole]!.hypotheses.push({
      id: result.id,
      name: result.name,
      confidence: result.confidence,
      reasoning: result.reasoning,
    });

    emit({
      type: "hypothesis_found",
      doctorRole,
      hypothesisId: result.id,
      name: result.name,
      confidence: result.confidence,
    });

    // Queue clarification question if sub-agent needs one
    if (result.needsClarification && state.clarifications.length < 4) {
      const clarId = result.id;
      state.clarifications.push({
        id: clarId,
        doctorRole,
        question: result.needsClarification,
        status: "pending",
      });

      if (state.activeClarificationIds.length < 2) {
        state.activeClarificationIds.push(clarId);
        emit({ type: "question_ready", clarificationId: clarId, doctorRole, question: result.needsClarification });
      }
    }
  }

  state.doctorSwarms[doctorRole]!.status = "complete";
  emit({ type: "doctor_complete", doctorRole });
}

// ── L4: Debate ──────────────────────────────────────────────────────────────

async function runDebate(
  state: SwarmState,
  emit: (event: SwarmEvent) => void
): Promise<void> {
  state.currentPhase = "debate";
  emit({ type: "phase_changed", phase: "debate" });

  const allHypotheses = Object.entries(state.doctorSwarms)
    .flatMap(([role, swarm]) =>
      (swarm?.hypotheses ?? []).map((h) => `${role}: ${h.name} (${h.confidence}%)`)
    )
    .join("\n");

  const relevantDoctors = state.triage?.relevantDoctors ?? ["gp"];

  await Promise.all(
    relevantDoctors.map(async (doctorRole) => {
      const agent = agentRegistry[doctorRole];
      if (!agent) return;

      const llm = createFastModel();
      const response = await llm.invoke([
        new SystemMessage(`${agent.systemPrompt}
You are in a multidisciplinary team (MDT) meeting. Read all hypotheses and respond with ONE of: agree, challenge, or add_context.
Be concise — max 100 words. Respond as JSON: { "type": "agree"|"challenge"|"add_context", "content": "your message", "referencingHypothesis": "hypothesis name or null" }`),
        new HumanMessage(`All team hypotheses:\n${allHypotheses}\n\nPatient: ${state.patientInfo.age}y ${state.patientInfo.gender}, symptoms: ${state.symptoms}`),
      ]);

      try {
        const parsed = JSON.parse((response.content as string).replace(/```json\n?|\n?```/g, ""));
        state.debate.push({
          doctorRole,
          type: parsed.type ?? "add_context",
          content: parsed.content ?? "",
          referencingHypothesis: parsed.referencingHypothesis,
        });
        emit({
          type: "debate_message",
          doctorRole,
          messageType: parsed.type ?? "add_context",
          content: parsed.content ?? "",
        });
      } catch {
        // skip failed debate parse
      }
    })
  );
}

// ── L5: Synthesis ───────────────────────────────────────────────────────────

async function runSynthesis(
  state: SwarmState,
  emit: (event: SwarmEvent) => void
): Promise<void> {
  state.currentPhase = "synthesis";
  emit({ type: "phase_changed", phase: "synthesis" });

  const llm = createJsonModel();

  const allHypotheses = Object.entries(state.doctorSwarms)
    .flatMap(([role, swarm]) =>
      (swarm?.hypotheses ?? []).map((h) => ({ ...h, doctorRole: role as DoctorRole }))
    )
    .sort((a, b) => b.confidence - a.confidence);

  const debateSummary = state.debate
    .map((d) => `${d.doctorRole} (${d.type}): ${d.content}`)
    .join("\n");

  // NOTE: The LLM prompt only asks for urgency/nextSteps/questionsForDoctor/timeframe.
  // rankedHypotheses is intentionally pre-computed from allHypotheses (not LLM-generated).
  // disclaimer is intentionally hardcoded (not LLM-generated — fixed compliance text).
  // The merge { ...synthesis, ...parsed } applies LLM output on top of the pre-computed defaults.
  const response = await llm.invoke([
    new SystemMessage(`You are the MediCrew coordinator synthesizing a multidisciplinary team consultation.
Respond ONLY with valid JSON:
{
  "urgency": "emergency"|"urgent"|"routine"|"self_care",
  "nextSteps": ["step 1", "step 2"],
  "questionsForDoctor": ["question 1"],
  "timeframe": "when to seek care"
}
${SCOPE_BOUNDARY}`),
    new HumanMessage(`Patient: ${state.patientInfo.age}y ${state.patientInfo.gender}, symptoms: ${state.symptoms}
Initial triage: ${state.triage?.urgency}
Red flags: ${state.triage?.redFlags.join(", ") || "none"}

Top hypotheses:
${allHypotheses.slice(0, 5).map((h) => `- ${h.name} (${h.confidence}%, ${h.doctorRole})`).join("\n")}

Team debate:
${debateSummary || "No debate messages"}`),
  ]);

  let synthesis: SwarmSynthesis = {
    urgency: state.triage?.urgency ?? "routine",
    rankedHypotheses: allHypotheses.slice(0, 5).map((h) => ({
      name: h.name,
      confidence: h.confidence,
      doctorRole: h.doctorRole,
    })),
    nextSteps: ["Consult your GP for a full assessment"],
    questionsForDoctor: [],
    timeframe: "As soon as possible",
    disclaimer:
      "This guidance is for health navigation only and does not constitute medical advice. Always consult a qualified healthcare provider.",
  };

  try {
    const parsed = JSON.parse((response.content as string).replace(/```json\n?|\n?```/g, ""));
    synthesis = { ...synthesis, ...parsed };
  } catch (e) {
    console.error("[swarm] synthesis parse failed:", e);
  }

  state.synthesis = synthesis;
  state.currentPhase = "complete";

  emit({ type: "synthesis_complete", data: synthesis });
  emit({ type: "done" });
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function* streamSwarm(
  symptoms: string,
  patientInfo: SwarmState["patientInfo"],
  sessionId?: string
): AsyncGenerator<SwarmEvent> {
  const events: SwarmEvent[] = [];
  const emit = (event: SwarmEvent) => events.push(event);

  const state: SwarmState = {
    sessionId: sessionId ?? crypto.randomUUID(),
    symptoms,
    patientInfo,
    triage: null,
    doctorSwarms: {},
    clarifications: [],
    activeClarificationIds: [],
    debate: [],
    synthesis: null,
    currentPhase: "triage",
  };

  // Helper to flush queued events
  const flush = function* () {
    while (events.length > 0) yield events.shift()!;
  };

  // L1 Triage
  await runTriage(state, emit);
  yield* flush();
  if (state.currentPhase === "complete") return;

  // L2+L3 All doctors in parallel
  const relevantDoctors = state.triage?.relevantDoctors ?? ["gp"];
  await Promise.all(relevantDoctors.map((role) => runDoctorSwarm(role, state, emit)));
  yield* flush();

  // Wait for any pending clarifications (poll answerStore)
  if (state.activeClarificationIds.length > 0) {
    state.currentPhase = "awaiting_patient";
    emit({ type: "phase_changed", phase: "awaiting_patient" });
    yield* flush();

    const timeout = Date.now() + 120_000; // 2 min max wait
    while (state.activeClarificationIds.length > 0 && Date.now() < timeout) {
      await new Promise((r) => setTimeout(r, 500));
      for (const clarId of [...state.activeClarificationIds]) {
        const answer = answerStore.get(clarId);
        if (answer) {
          const clar = state.clarifications.find((c) => c.id === clarId);
          if (clar) { clar.answer = answer; clar.status = "answered"; }
          state.activeClarificationIds = state.activeClarificationIds.filter((id) => id !== clarId);
          answerStore.delete(clarId);
        }
      }
      yield* flush();
    }
  }

  // L4 Debate
  await runDebate(state, emit);
  yield* flush();

  // L5 Synthesis
  await runSynthesis(state, emit);
  yield* flush();
}

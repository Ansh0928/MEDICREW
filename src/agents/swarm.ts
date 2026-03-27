// src/agents/swarm.ts
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createJsonModel, createFastModel } from "@/lib/ai/config";
import { agentRegistry } from "./definitions";
import { residentDefinitions } from "./definitions/residents";
import {
  SwarmState,
  SwarmEvent,
  SwarmLeadState,
  DoctorRole,
  ResidentRole,
  RESIDENT_ROLES,
  createInitialSwarmState,
} from "./swarm-types";
import { UrgencyLevel } from "./types";
import crypto from "crypto";
import { retrieveMedicalContext } from "@/lib/rag/retrieve";

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Selects the primary lead doctor based on highest average resident confidence.
 * Exported for testing.
 */
export function selectPrimaryLead(
  leadSwarms: SwarmState["leadSwarms"]
): DoctorRole {
  let best: DoctorRole | null = null;
  let bestAvg = -1;
  for (const [role, lead] of Object.entries(leadSwarms) as [DoctorRole, SwarmLeadState][]) {
    if (!lead || lead.hypotheses.length === 0) continue;
    const avg = lead.hypotheses.reduce((sum, h) => sum + h.confidence, 0) / lead.hypotheses.length;
    if (avg > bestAvg) { bestAvg = avg; best = role; }
  }
  return best ?? (Object.keys(leadSwarms)[0] as DoctorRole);
}

/**
 * Injects specialty + patient context into a resident's base system prompt.
 * Exported for testing.
 */
export function buildResidentPrompt(
  residentRole: ResidentRole,
  specialtyRole: DoctorRole,
  symptoms: string,
  patientInfo: SwarmState["patientInfo"],
  ragChunks: string[] = []
): string {
  const base = residentDefinitions[residentRole].systemPrompt;
  const context = `\n\n## Specialty Context\nYou are embedded in the ${specialtyRole} specialty team.\nPatient: ${patientInfo.age}y ${patientInfo.gender}${patientInfo.knownConditions ? `, conditions: ${patientInfo.knownConditions}` : ""}\nSymptoms: ${symptoms}`;
  const ragSection = ragChunks.length > 0
    ? `\n\n## Relevant Medical Reference\n${ragChunks.join("\n\n---\n\n")}`
    : "";
  return base + context + ragSection;
}

const SCOPE_BOUNDARY = `\n\n## Scope Boundaries\nYou provide health navigation guidance only — not medical diagnoses or prescriptions.\nNever state a definitive diagnosis. Use language like "may suggest", "could indicate", "worth investigating".\nIf you cannot assess confidently, say so explicitly.\nAlways recommend discussing findings with a qualified healthcare provider.`;

// ── L1: Triage ───────────────────────────────────────────────────────────────

async function runTriage(
  state: SwarmState,
  emit: (e: SwarmEvent) => void
): Promise<void> {
  const llm = createJsonModel();
  const response = await llm.invoke([
    new SystemMessage(`You are an emergency triage specialist. Assess symptom urgency and determine which specialists should review this case.
Respond ONLY with valid JSON:
{
  "urgency": "emergency" | "urgent" | "routine" | "self_care",
  "relevantDoctors": ["gp", "cardiology", "mental_health", "dermatology", "orthopedic", "gastro", "physiotherapy"],
  "redFlags": ["string"]
}${SCOPE_BOUNDARY}`),
    new HumanMessage(`Patient: ${state.patientInfo.age}y ${state.patientInfo.gender}${state.patientInfo.knownConditions ? `, conditions: ${state.patientInfo.knownConditions}` : ""}
Symptoms: ${state.symptoms}`),
  ]);

  let urgency: UrgencyLevel = "urgent";
  let relevantDoctors: DoctorRole[] = ["gp"];
  let redFlags: string[] = [];

  try {
    const content = response.content as string;
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ""));
    urgency = parsed.urgency ?? "urgent";
    relevantDoctors = parsed.relevantDoctors ?? ["gp"];
    redFlags = parsed.redFlags ?? [];
  } catch (e) {
    console.error("[swarm-v2] triage parse failed, defaulting to urgent:", e);
  }

  state.triage = { urgency, relevantDoctors, redFlags };
  state.currentPhase = "swarm";

  emit({ type: "triage_complete", data: state.triage });
  emit({ type: "phase_changed", phase: "swarm" });

  if (urgency === "emergency") {
    state.synthesis = {
      urgency: "emergency",
      primaryRecommendation: "This may be a medical emergency. Call 000 (Australia) or your local emergency number immediately.",
      nextSteps: ["Call emergency services now", "Do not drive yourself"],
      bookingNeeded: false,
      disclaimer: "This is AI-generated health navigation guidance. Always call emergency services in an emergency.",
    };
    emit({ type: "synthesis_complete", data: state.synthesis });
    emit({ type: "done" });
    state.currentPhase = "complete";
  }
}

// ── L3: Resident sub-agents ──────────────────────────────────────────────────

export async function runResident(
  residentRole: ResidentRole,
  specialtyRole: DoctorRole,
  state: SwarmState,
  emit: (e: SwarmEvent) => void,
  ragChunks: string[] = []
): Promise<void> {
  const llm = createFastModel();
  const systemPrompt = buildResidentPrompt(residentRole, specialtyRole, state.symptoms, state.patientInfo, ragChunks);

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(`Assess the patient's symptoms from your ${residentRole} perspective. Return ONLY JSON.`),
  ]);

  let hypothesis = `${residentRole} assessment`;
  let confidence = 50;
  let reasoning = "";

  try {
    const content = response.content as string;
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ""));
    hypothesis = parsed.hypothesis ?? hypothesis;
    confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 50));
    reasoning = parsed.reasoning ?? "";
  } catch (e) {
    console.error(`[swarm-v2] resident ${residentRole}/${specialtyRole} parse failed:`, e);
  }

  const hypothesisId = crypto.randomUUID();
  state.leadSwarms[specialtyRole]!.hypotheses.push({
    id: hypothesisId,
    name: hypothesis,
    confidence,
    reasoning,
    residentRole,
  });

  emit({
    type: "hypothesis_found",
    role: specialtyRole,
    residentRole,
    hypothesisId,
    name: hypothesis,
    confidence,
  });
}

// ── L4: Resident debate ──────────────────────────────────────────────────────

async function runResidentDebate(
  specialtyRole: DoctorRole,
  state: SwarmState,
  emit: (e: SwarmEvent) => void
): Promise<void> {
  const leadState = state.leadSwarms[specialtyRole]!;
  const hypothesesSummary = leadState.hypotheses
    .map((h) => `[${h.residentRole}] "${h.name}" (confidence: ${h.confidence}) — ${h.reasoning}`)
    .join("\n");

  const llm = createFastModel();

  for (const residentRole of RESIDENT_ROLES) {
    const myHypothesis = leadState.hypotheses.find((h) => h.residentRole === residentRole);
    if (!myHypothesis) continue;

    const response = await llm.invoke([
      new SystemMessage(`You are the ${residentRole} resident in a ${specialtyRole} team debate. Review all residents' hypotheses and respond with your position.
Respond ONLY with valid JSON:
{
  "type": "agree" | "challenge" | "add_context",
  "content": "<max 2 sentences>",
  "referencingHypothesisId": "<id of hypothesis you are challenging or agreeing with, or omit>"
}`),
      new HumanMessage(`All resident hypotheses:\n${hypothesesSummary}\n\nYour hypothesis: "${myHypothesis.name}" (id: ${myHypothesis.id})\nProvide your debate response.`),
    ]);

    let type: "agree" | "challenge" | "add_context" = "add_context";
    let content = "";
    let referencingHypothesisId: string | undefined;

    try {
      const parsed = JSON.parse((response.content as string).replace(/```json\n?|\n?```/g, ""));
      type = parsed.type ?? "add_context";
      content = parsed.content ?? "";
      referencingHypothesisId = parsed.referencingHypothesisId;
    } catch (e) {
      console.error(`[swarm-v2] debate parse failed ${residentRole}/${specialtyRole}:`, e);
      continue;
    }

    const msg = { doctorRole: specialtyRole, residentRole, type, content, referencingHypothesisId };
    leadState.residentDebate.push(msg);
    emit({ type: "debate_message", role: specialtyRole, residentRole, messageType: type, content, referencingHypothesisId });
  }
}

// ── L5: Lead rectification ───────────────────────────────────────────────────

async function runLeadRectification(
  specialtyRole: DoctorRole,
  state: SwarmState,
  emit: (e: SwarmEvent) => void
): Promise<void> {
  const leadState = state.leadSwarms[specialtyRole]!;
  const leadDef = agentRegistry[specialtyRole];
  const hypothesesSummary = leadState.hypotheses
    .map((h) => `${h.residentRole}: "${h.name}" (${h.confidence}%) — ${h.reasoning}`)
    .join("\n");
  const debateSummary = leadState.residentDebate
    .map((d) => `${d.residentRole} [${d.type}]: ${d.content}`)
    .join("\n");

  const llm = createFastModel();
  const response = await llm.invoke([
    new SystemMessage(`${leadDef?.systemPrompt ?? ""}\n\nYou are the lead ${specialtyRole} specialist. You have received input from 4 resident sub-agents and their debate. Synthesise their views into a single rectified recommendation for this patient.
Respond ONLY with valid JSON:
{
  "summary": "<2-3 sentences: your rectified recommendation, noting which residents you agree with and any you overrule>"
}`),
    new HumanMessage(`Resident hypotheses:\n${hypothesesSummary}\n\nResident debate:\n${debateSummary}\n\nPatient symptoms: ${state.symptoms}`),
  ]);

  let summary = `${leadDef?.name ?? specialtyRole} reviewed all resident input.`;
  try {
    const parsed = JSON.parse((response.content as string).replace(/```json\n?|\n?```/g, ""));
    summary = parsed.summary ?? summary;
  } catch (e) {
    console.error(`[swarm-v2] rectification parse failed ${specialtyRole}:`, e);
  }

  leadState.rectification = { doctorRole: specialtyRole, summary };
  leadState.status = "complete";
  emit({ type: "rectification_complete", role: specialtyRole, summary });
  emit({ type: "doctor_complete", role: specialtyRole });
}

// ── L2 + L3 + L4 + L5: Full lead swarm ──────────────────────────────────────

async function runLeadSwarm(
  specialtyRole: DoctorRole,
  state: SwarmState,
  emit: (e: SwarmEvent) => void,
  ragChunks: string[] = []
): Promise<void> {
  const leadDef = agentRegistry[specialtyRole];
  state.leadSwarms[specialtyRole] = {
    status: "running",
    hypotheses: [],
    residentDebate: [],
    rectification: null,
  };

  emit({ type: "doctor_activated", role: specialtyRole, name: leadDef?.name ?? specialtyRole });

  // L3: residents run in parallel
  await Promise.all(
    RESIDENT_ROLES.map((residentRole) =>
      runResident(residentRole, specialtyRole, state, emit, ragChunks)
    )
  );

  // L4: debate (sequential within specialty)
  await runResidentDebate(specialtyRole, state, emit);

  // L5: lead rectifies
  state.leadSwarms[specialtyRole]!.status = "rectifying";
  await runLeadRectification(specialtyRole, state, emit);
}

// ── L6: MDT cross-consult ────────────────────────────────────────────────────

async function runMdt(
  state: SwarmState,
  emit: (e: SwarmEvent) => void
): Promise<void> {
  const activatedLeads = Object.keys(state.leadSwarms) as DoctorRole[];
  if (activatedLeads.length < 2) return;

  emit({ type: "phase_changed", phase: "mdt" });

  const rectificationsSummary = activatedLeads
    .map((role) => {
      const r = state.leadSwarms[role]?.rectification;
      return r ? `${agentRegistry[role]?.name ?? role}: ${r.summary}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

  const llm = createFastModel();

  for (const role of activatedLeads) {
    const leadDef = agentRegistry[role];
    const response = await llm.invoke([
      new SystemMessage(`You are ${leadDef?.name ?? role}, a lead specialist in an MDT (multi-disciplinary team) meeting. Review all specialists' rectified recommendations and provide your MDT response.
Respond ONLY with valid JSON:
{
  "type": "agree" | "note" | "escalate",
  "content": "<max 2 sentences>"
}
Use "escalate" ONLY if you believe urgency should be raised based on another specialist's finding.`),
      new HumanMessage(`MDT rectified recommendations:\n${rectificationsSummary}\n\nPatient: ${state.patientInfo.age}y ${state.patientInfo.gender}\nSymptoms: ${state.symptoms}`),
    ]);

    let type: "agree" | "note" | "escalate" = "agree";
    let content = "";

    try {
      const parsed = JSON.parse((response.content as string).replace(/```json\n?|\n?```/g, ""));
      type = parsed.type ?? "agree";
      content = parsed.content ?? "";
    } catch (e) {
      console.error(`[swarm-v2] MDT parse failed ${role}:`, e);
      continue;
    }

    state.mdtMessages.push({ doctorRole: role, type, content });
    emit({ type: "mdt_message", role, messageType: type, content });
  }
}

// ── L7: Synthesis ────────────────────────────────────────────────────────────

async function runSynthesis(
  state: SwarmState,
  emit: (e: SwarmEvent) => void
): Promise<void> {
  emit({ type: "phase_changed", phase: "synthesis" });

  const rectSummary = (Object.keys(state.leadSwarms) as DoctorRole[])
    .map((role) => state.leadSwarms[role]?.rectification?.summary)
    .filter(Boolean)
    .join("\n\n");

  const mdtSummary = state.mdtMessages
    .map((m) => `${m.doctorRole} [${m.type}]: ${m.content}`)
    .join("\n");

  const llm = createJsonModel();
  const response = await llm.invoke([
    new SystemMessage(`You are a senior synthesis AI. Produce a final patient-facing recommendation from the specialist team's input.
Respond ONLY with valid JSON:
{
  "urgency": "emergency" | "urgent" | "routine" | "self_care",
  "primaryRecommendation": "<1-2 sentences: main recommendation for the patient>",
  "nextSteps": ["<step 1>", "<step 2>", "<step 3>"],
  "bookingNeeded": true | false,
  "disclaimer": "This is AI-generated health navigation guidance. Always consult a qualified healthcare provider."
}${SCOPE_BOUNDARY}`),
    new HumanMessage(`Specialist rectified recommendations:\n${rectSummary}\n\nMDT discussion:\n${mdtSummary}\n\nOriginal triage urgency: ${state.triage?.urgency}`),
  ]);

  let synthesis = state.synthesis ?? {
    urgency: state.triage?.urgency ?? "routine" as UrgencyLevel,
    primaryRecommendation: "Please consult a healthcare provider.",
    nextSteps: [],
    bookingNeeded: true,
    disclaimer: "This is AI-generated health navigation guidance. Always consult a qualified healthcare provider.",
  };

  try {
    const parsed = JSON.parse((response.content as string).replace(/```json\n?|\n?```/g, ""));
    synthesis = {
      urgency: parsed.urgency ?? synthesis.urgency,
      primaryRecommendation: parsed.primaryRecommendation ?? synthesis.primaryRecommendation,
      nextSteps: parsed.nextSteps ?? [],
      bookingNeeded: parsed.bookingNeeded ?? true,
      disclaimer: parsed.disclaimer ?? synthesis.disclaimer,
    };
  } catch (e) {
    console.error("[swarm-v2] synthesis parse failed:", e);
  }

  state.synthesis = synthesis;
  state.primaryLeadRole = selectPrimaryLead(state.leadSwarms);
  state.currentPhase = "complete";

  emit({ type: "synthesis_complete", data: synthesis });
  emit({ type: "done" });
}

// ── Async event queue ────────────────────────────────────────────────────────

/**
 * A lightweight async queue that allows concurrent producers to push events
 * while a single consumer yields them immediately.
 *
 * Usage:
 *   const q = createEventQueue<SwarmEvent>();
 *   // producers call q.push(event)
 *   // when all producers are done: q.done()
 *   // consumer: for await (const e of q) { yield e; }
 */
function createEventQueue<T>() {
  const pending: T[] = [];
  const waiters: Array<(value: IteratorResult<T>) => void> = [];
  let finished = false;

  function push(value: T): void {
    if (waiters.length > 0) {
      // A consumer is waiting — hand it the value directly.
      waiters.shift()!({ value, done: false });
    } else {
      pending.push(value);
    }
  }

  function done(): void {
    finished = true;
    // Drain any waiting consumers.
    while (waiters.length > 0) {
      waiters.shift()!({ value: undefined as unknown as T, done: true });
    }
  }

  const iterator: AsyncIterableIterator<T> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    next(): Promise<IteratorResult<T>> {
      if (pending.length > 0) {
        return Promise.resolve({ value: pending.shift()!, done: false });
      }
      if (finished) {
        return Promise.resolve({ value: undefined as unknown as T, done: true });
      }
      return new Promise<IteratorResult<T>>((resolve) => {
        waiters.push(resolve);
      });
    },
  };

  return { push, done, iterator };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function* streamSwarm(
  symptoms: string,
  patientInfo: SwarmState["patientInfo"]
): AsyncGenerator<SwarmEvent> {
  const sessionId = crypto.randomUUID();
  const state = createInitialSwarmState(sessionId, symptoms, patientInfo);

  // ── L1: Triage (sequential — must complete before fan-out) ────────────────
  // Use a simple local queue so events from triage are yielded immediately.
  {
    const q = createEventQueue<SwarmEvent>();
    const triagePromise = runTriage(state, q.push).then(() => q.done());
    for await (const event of q.iterator) {
      yield event;
      triagePromise; // keep reference to avoid GC
    }
    await triagePromise;
  }

  if (state.currentPhase === "complete") return;

  // ── RAG retrieval (parallel, best-effort) ────────────────────────────────
  const relevantDoctors = state.triage!.relevantDoctors;
  let ragContext: Partial<Record<DoctorRole, string[]>> = {};
  try {
    ragContext = await retrieveMedicalContext(state.symptoms, relevantDoctors);
  } catch (err) {
    console.error("[RAG] retrieval failed, proceeding without context:", err);
  }

  // ── L2–L5: Lead swarms (parallel fan-out, immediate event delivery) ───────
  {
    const q = createEventQueue<SwarmEvent>();
    const fanOut = Promise.all(
      relevantDoctors.map((role) =>
        runLeadSwarm(role, state, q.push, ragContext[role] ?? [])
      )
    ).then(() => q.done());

    for await (const event of q.iterator) {
      yield event;
    }
    await fanOut;
  }

  // ── L6: MDT (sequential, immediate delivery) ──────────────────────────────
  {
    const q = createEventQueue<SwarmEvent>();
    const mdtPromise = runMdt(state, q.push).then(() => q.done());
    for await (const event of q.iterator) {
      yield event;
    }
    await mdtPromise;
  }

  // ── L7: Synthesis (sequential, immediate delivery) ────────────────────────
  {
    const q = createEventQueue<SwarmEvent>();
    const synthPromise = runSynthesis(state, q.push).then(() => q.done());
    for await (const event of q.iterator) {
      yield event;
    }
    await synthPromise;
  }
}

# MediCrew Swarm Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the linear LangGraph consultation pipeline with a 5-layer parallel swarm — 7 doctors fire simultaneously, each spawning hypothesis sub-agents, doctors debate, then synthesize — with a simple patient UI (avatar orbs + live feed) and full swarm visibility in the doctor portal.

**Architecture:** Plain `async/await` + `Promise.all` swarm in `src/agents/swarm.ts`. SSE stream held open for the duration of the consultation. Patient state managed client-side in `SwarmChat.tsx`. LangGraph removed entirely from the new flow.

**Tech Stack:** Next.js 14 App Router, TypeScript, Groq (`llama-3.3-70b-versatile`), `@langchain/groq` for streaming, Tailwind CSS, Framer Motion, shadcn/ui components.

**Spec:** `docs/superpowers/specs/2026-03-26-medicrew-swarm-design.md`
**Agent issues being fixed:** All 14 from `docs/agent-review.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/agents/swarm-types.ts` | CREATE | All swarm types: SwarmState, SwarmEvent, DoctorRole, etc. |
| `src/agents/swarm.ts` | CREATE | Core swarm engine: runSwarm() + streamSwarm() |
| `src/lib/ai/config.ts` | MODIFY | Add createJsonModel() for triage JSON mode |
| `src/lib/rate-limit.ts` | CREATE | In-memory IP rate limiter |
| `src/app/api/swarm/start/route.ts` | CREATE | SSE endpoint — starts swarm, streams events |
| `src/app/api/swarm/answer/route.ts` | CREATE | Accepts patient answers to clarification questions |
| `src/app/api/portal/case-consult/route.ts` | MODIFY | Fix controller.error → structured SSE error event |
| `src/agents/definitions/*.ts` (6 files) | MODIFY | Add scope boundary guardrails to all specialist prompts |
| `src/agents/definitions/index.ts` | MODIFY | Replace keyword routing with LLM-based routing |
| `src/components/consult/DoctorOrbRow.tsx` | CREATE | Avatar orbs row — lights up per doctor activation |
| `src/components/consult/LiveFeedLine.tsx` | CREATE | Single-line live text feed beneath orbs |
| `src/components/consult/ClarificationBubble.tsx` | CREATE | Doctor asks patient a question inline |
| `src/components/consult/SynthesisCard.tsx` | CREATE | Final output: urgency badge + next steps |
| `src/components/consult/SwarmChat.tsx` | CREATE | Root patient consultation component (replaces ConsultationFlow) |
| `src/components/doctor/SwarmDebugPanel.tsx` | CREATE | Doctor view: hypothesis bars + debate transcript |
| `src/app/consult/page.tsx` | MODIFY | Use SwarmChat instead of ConsultationFlow |
| `src/app/doctor/page.tsx` | MODIFY | Add SwarmDebugPanel |
| `next.config.ts` | MODIFY | Add maxDuration = 60 for swarm route |

---

## Task 1: Swarm types

**Files:**
- Create: `src/agents/swarm-types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/agents/swarm-types.ts
import { AgentRole, UrgencyLevel } from "./types";

export type DoctorRole = AgentRole;

export interface SwarmHypothesis {
  id: string;
  name: string;
  confidence: number; // 0-100
  reasoning: string;
}

export interface SwarmClarification {
  id: string;
  doctorRole: DoctorRole;
  question: string;
  answer?: string;
  status: "pending" | "answered";
}

export interface SwarmDebateMessage {
  doctorRole: DoctorRole;
  type: "agree" | "challenge" | "add_context";
  content: string;
  referencingHypothesis?: string;
}

export interface SwarmSynthesis {
  urgency: UrgencyLevel;
  rankedHypotheses: Array<{ name: string; confidence: number; doctorRole: DoctorRole }>;
  nextSteps: string[];
  questionsForDoctor: string[];
  timeframe: string;
  disclaimer: string;
}

export interface SwarmDoctorState {
  status: "pending" | "running" | "waiting_for_patient" | "complete";
  hypotheses: SwarmHypothesis[];
  pendingQuestion?: string;
}

export interface SwarmState {
  sessionId: string;
  symptoms: string;
  patientInfo: { age: string; gender: string; knownConditions?: string };
  triage: {
    urgency: UrgencyLevel;
    relevantDoctors: DoctorRole[];
    redFlags: string[];
  } | null;
  doctorSwarms: Partial<Record<DoctorRole, SwarmDoctorState>>;
  clarifications: SwarmClarification[];
  activeClarificationIds: string[];
  debate: SwarmDebateMessage[];
  synthesis: SwarmSynthesis | null;
  currentPhase: "triage" | "swarm" | "awaiting_patient" | "debate" | "synthesis" | "complete";
}

export type SwarmEvent =
  | { type: "triage_complete"; data: NonNullable<SwarmState["triage"]> }
  | { type: "phase_changed"; phase: SwarmState["currentPhase"] }
  | { type: "doctor_activated"; doctorRole: DoctorRole; doctorName: string }
  | { type: "doctor_complete"; doctorRole: DoctorRole }
  | { type: "hypothesis_found"; doctorRole: DoctorRole; hypothesisId: string; name: string; confidence: number }
  | { type: "question_ready"; clarificationId: string; doctorRole: DoctorRole; question: string }
  | { type: "doctor_token"; doctorRole: DoctorRole; token: string }
  | { type: "debate_message"; doctorRole: DoctorRole; messageType: "agree" | "challenge" | "add_context"; content: string }
  | { type: "synthesis_complete"; data: SwarmSynthesis }
  | { type: "error"; message: string }
  | { type: "done" };

// In-memory store for patient answers (keyed by clarificationId)
// Lives at module level — same serverless invocation as the SSE stream
export const answerStore = new Map<string, string>();
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors on the new file (existing errors unrelated are OK)

- [ ] **Step 3: Commit**

```bash
git add src/agents/swarm-types.ts
git commit -m "feat: add swarm types and event schema"
```

---

## Task 2: Update LLM config for JSON mode

**Files:**
- Modify: `src/lib/ai/config.ts`

- [ ] **Step 1: Add createJsonModel export**

Add after the existing `createGroqModel` function:

```typescript
// Create Groq model with JSON mode forced (for triage)
export const createJsonModel = (): BaseChatModel => {
  const provider = getLLMProvider();
  if (provider === "ollama") {
    return createOllamaModel(0.1);
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY environment variable is not set");
  return new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    maxTokens: 512,
    apiKey,
    // @ts-expect-error — Groq SDK supports this, LangChain types lag
    response_format: { type: "json_object" },
  });
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
bun run tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/config.ts
git commit -m "feat: add createJsonModel for triage JSON mode"
```

---

## Task 3: Rate limiter

**Files:**
- Create: `src/lib/rate-limit.ts`

- [ ] **Step 1: Create rate limiter**

```typescript
// src/lib/rate-limit.ts
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_REQUESTS = 5;
const WINDOW_MS = 60_000;

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "feat: add in-memory IP rate limiter"
```

---

## Task 4: Add guardrails to all specialist prompts

**Files:**
- Modify: `src/agents/definitions/cardiology.ts`, `dermatology.ts`, `gastro.ts`, `mental-health.ts`, `orthopedic.ts`, `physiotherapy.ts`

- [ ] **Step 1: Add scope boundary block to each file**

For each of the 6 specialist files, append this block to the end of the `systemPrompt` string (before the closing backtick):

```
\n\n## Scope Boundaries\nYou provide health navigation guidance only — not medical diagnoses or prescriptions.\nNever state a definitive diagnosis. Use language like "may suggest", "could indicate", "worth investigating".\nIf you cannot assess confidently, say so explicitly.\nAlways recommend discussing findings with a qualified healthcare provider.
```

Example for `cardiology.ts` — find the closing backtick of systemPrompt and add before it:

```typescript
// At the end of the systemPrompt template string, add:
`...existing prompt...

## Scope Boundaries
You provide health navigation guidance only — not medical diagnoses or prescriptions.
Never state a definitive diagnosis. Use language like "may suggest", "could indicate", "worth investigating".
If you cannot assess confidently, say so explicitly.
Always recommend discussing findings with a qualified healthcare provider.`
```

Repeat for all 6 specialist files.

- [ ] **Step 2: Verify TypeScript**

```bash
bun run tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/agents/definitions/
git commit -m "fix: add no-diagnosis guardrails to all specialist prompts (issue #12)"
```

---

## Task 5: Core swarm engine

**Files:**
- Create: `src/agents/swarm.ts`

- [ ] **Step 1: Create swarm.ts with triage + doctor fan-out**

```typescript
// src/agents/swarm.ts
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createModel, createJsonModel, createFastModel } from "@/lib/ai/config";
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
    new SystemMessage(`${agent.systemPrompt}${SCOPE_BOUNDARY}
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
        new SystemMessage(`${agent.systemPrompt}${SCOPE_BOUNDARY}
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
bun run tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/agents/swarm.ts
git commit -m "feat: add swarm engine with parallel doctor fan-out and debate"
```

---

## Task 6: API routes

**Files:**
- Create: `src/app/api/swarm/start/route.ts`
- Create: `src/app/api/swarm/answer/route.ts`
- Modify: `src/app/api/portal/case-consult/route.ts`

- [ ] **Step 1: Create /api/swarm/start**

```typescript
// src/app/api/swarm/start/route.ts
import { NextRequest } from "next/server";
import { streamSwarm } from "@/agents/swarm";
import { checkRateLimit } from "@/lib/rate-limit";
import { SwarmEvent } from "@/agents/swarm-types";

export const maxDuration = 60;

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SwarmEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of streamSwarm(symptoms, patientInfo ?? { age: "unknown", gender: "unknown" })) {
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
```

- [ ] **Step 2: Create /api/swarm/answer**

```typescript
// src/app/api/swarm/answer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { answerStore } from "@/agents/swarm-types";

export async function POST(request: NextRequest) {
  const { clarificationId, answer } = await request.json();
  if (!clarificationId || !answer) {
    return NextResponse.json({ error: "clarificationId and answer required" }, { status: 400 });
  }
  answerStore.set(clarificationId, String(answer).slice(0, 500));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Fix case-consult SSE error handling**

In `src/app/api/portal/case-consult/route.ts`, find the catch block with `controller.error(error)` and replace with:

```typescript
} catch (error) {
  console.error("Doctor consultation streaming error:", error);
  const errorEvent = JSON.stringify({ error: true, message: "Doctor consultation failed. Please retry." });
  controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
  controller.close();
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
bun run tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/swarm/ src/app/api/portal/case-consult/route.ts
git commit -m "feat: add swarm API routes, fix SSE error handling (issues #8, #11)"
```

---

## Task 7: Patient UI components

**Files:**
- Create: `src/components/consult/DoctorOrbRow.tsx`
- Create: `src/components/consult/LiveFeedLine.tsx`
- Create: `src/components/consult/ClarificationBubble.tsx`
- Create: `src/components/consult/SynthesisCard.tsx`

- [ ] **Step 1: Create DoctorOrbRow**

```tsx
// src/components/consult/DoctorOrbRow.tsx
"use client";
import { motion } from "framer-motion";
import { DoctorRole } from "@/agents/swarm-types";
import { agentRegistry } from "@/agents/definitions";

interface OrbState { role: DoctorRole; status: "waiting" | "active" | "done" }

export function DoctorOrbRow({ orbs }: { orbs: OrbState[] }) {
  if (orbs.length === 0) return null;
  return (
    <div className="flex gap-3 justify-center flex-wrap">
      {orbs.map(({ role, status }) => {
        const agent = agentRegistry[role];
        return (
          <motion.div
            key={role}
            initial={{ scale: 0.8, opacity: 0.4 }}
            animate={{
              scale: status === "active" ? [1, 1.08, 1] : 1,
              opacity: status === "waiting" ? 0.35 : 1,
            }}
            transition={{ repeat: status === "active" ? Infinity : 0, duration: 1.2 }}
            className="flex flex-col items-center gap-1"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
              status === "active"
                ? "border-blue-400 bg-blue-950 shadow-[0_0_12px_#60a5fa80]"
                : status === "done"
                ? "border-green-500 bg-green-950"
                : "border-gray-600 bg-gray-800"
            }`}>
              {status === "done" ? "✓" : agent?.emoji ?? "👤"}
            </div>
            <span className={`text-[10px] ${status === "active" ? "text-blue-400" : status === "done" ? "text-green-400" : "text-gray-500"}`}>
              {status === "active" ? "thinking" : status === "done" ? "done" : agent?.name.split(" ")[0]}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create LiveFeedLine**

```tsx
// src/components/consult/LiveFeedLine.tsx
"use client";
import { motion, AnimatePresence } from "framer-motion";

export function LiveFeedLine({ text }: { text: string }) {
  if (!text) return null;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={text.slice(0, 30)}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="text-center text-sm text-blue-300 py-1"
      >
        {text}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Create ClarificationBubble**

```tsx
// src/components/consult/ClarificationBubble.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agentRegistry } from "@/agents/definitions";
import { DoctorRole } from "@/agents/swarm-types";

interface Props {
  clarificationId: string;
  doctorRole: DoctorRole;
  question: string;
  onAnswer: (clarificationId: string, answer: string) => void;
}

export function ClarificationBubble({ clarificationId, doctorRole, question, onAnswer }: Props) {
  const [answer, setAnswer] = useState("");
  const agent = agentRegistry[doctorRole];

  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 rounded-full bg-blue-950 border-2 border-blue-400 flex items-center justify-center text-sm flex-shrink-0">
        {agent?.emoji}
      </div>
      <div className="flex-1 space-y-2">
        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
          {question}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Your answer..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && answer.trim() && onAnswer(clarificationId, answer)}
            className="flex-1"
            autoFocus
          />
          <Button
            size="sm"
            disabled={!answer.trim()}
            onClick={() => onAnswer(clarificationId, answer)}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create SynthesisCard**

```tsx
// src/components/consult/SynthesisCard.tsx
"use client";
import { SwarmSynthesis } from "@/agents/swarm-types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const URGENCY_CONFIG = {
  emergency: { label: "EMERGENCY — Call 000", className: "bg-red-600 text-white text-base px-4 py-2" },
  urgent: { label: "Urgent — See doctor today", className: "bg-orange-500 text-white" },
  routine: { label: "Routine — Schedule an appointment", className: "bg-blue-600 text-white" },
  self_care: { label: "Self-care recommended", className: "bg-green-600 text-white" },
};

export function SynthesisCard({ synthesis, onStartNew }: { synthesis: SwarmSynthesis; onStartNew: () => void }) {
  const config = URGENCY_CONFIG[synthesis.urgency];
  return (
    <Card className="p-6 space-y-4 border-2">
      <Badge className={config.className}>{config.label}</Badge>

      <div>
        <h3 className="font-semibold mb-2">Next Steps</h3>
        <ol className="space-y-1">
          {synthesis.nextSteps.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-primary font-medium">{i + 1}.</span> {step}
            </li>
          ))}
        </ol>
      </div>

      {synthesis.questionsForDoctor.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Questions to ask your doctor</h3>
          <ul className="space-y-1">
            {synthesis.questionsForDoctor.map((q, i) => (
              <li key={i} className="text-sm text-muted-foreground">• {q}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t pt-3">{synthesis.disclaimer}</p>

      <button onClick={onStartNew} className="text-sm text-primary underline">Start new consultation</button>
    </Card>
  );
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
bun run tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add src/components/consult/DoctorOrbRow.tsx src/components/consult/LiveFeedLine.tsx src/components/consult/ClarificationBubble.tsx src/components/consult/SynthesisCard.tsx
git commit -m "feat: add swarm patient UI components (orbs, feed, clarification, synthesis)"
```

---

## Task 8: SwarmChat — main patient consultation component

**Files:**
- Create: `src/components/consult/SwarmChat.tsx`
- Modify: `src/app/consult/page.tsx`

- [ ] **Step 1: Create SwarmChat.tsx**

```tsx
// src/components/consult/SwarmChat.tsx
"use client";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DoctorOrbRow } from "./DoctorOrbRow";
import { LiveFeedLine } from "./LiveFeedLine";
import { ClarificationBubble } from "./ClarificationBubble";
import { SynthesisCard } from "./SynthesisCard";
import { SwarmEvent, SwarmSynthesis, DoctorRole } from "@/agents/swarm-types";
import { agentRegistry } from "@/agents/definitions";

type OrbStatus = "waiting" | "active" | "done";

interface OrbState { role: DoctorRole; status: OrbStatus }

export function SwarmChat() {
  const [step, setStep] = useState<"info" | "chat">("info");
  const [patientInfo, setPatientInfo] = useState({ age: "", gender: "", knownConditions: "" });
  const [symptoms, setSymptoms] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liveFeed, setLiveFeed] = useState("");
  const [orbs, setOrbs] = useState<OrbState[]>([]);
  const [clarifications, setClarifications] = useState<Array<{ id: string; doctorRole: DoctorRole; question: string }>>([]);
  const [synthesis, setSynthesis] = useState<SwarmSynthesis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tokenBufferRef = useRef<Record<string, string>>({});

  const updateOrb = useCallback((role: DoctorRole, status: OrbStatus) => {
    setOrbs((prev) => {
      const existing = prev.find((o) => o.role === role);
      if (!existing) return [...prev, { role, status }];
      return prev.map((o) => o.role === role ? { ...o, status } : o);
    });
  }, []);

  const handleAnswer = async (clarificationId: string, answer: string) => {
    setClarifications((prev) => prev.filter((c) => c.id !== clarificationId));
    await fetch("/api/swarm/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clarificationId, answer }),
    });
  };

  const startConsultation = async () => {
    if (!symptoms.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    setSynthesis(null);
    setOrbs([]);
    setClarifications([]);
    setLiveFeed("");

    try {
      const res = await fetch("/api/swarm/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms, patientInfo }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const event: SwarmEvent = JSON.parse(line.replace("data: ", ""));
            handleEvent(event);
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setError("Connection issue. Please try again.");
    } finally {
      setIsLoading(false);
      setLiveFeed("");
    }
  };

  const handleEvent = (event: SwarmEvent) => {
    switch (event.type) {
      case "triage_complete":
        setLiveFeed(`Triage complete: ${event.data.urgency} urgency`);
        break;
      case "doctor_activated":
        updateOrb(event.doctorRole, "active");
        setLiveFeed(`${agentRegistry[event.doctorRole]?.name ?? event.doctorRole} is reviewing your symptoms...`);
        break;
      case "doctor_complete":
        updateOrb(event.doctorRole, "done");
        break;
      case "doctor_token":
        tokenBufferRef.current[event.doctorRole] = (tokenBufferRef.current[event.doctorRole] ?? "") + event.token;
        break;
      case "question_ready":
        setClarifications((prev) => [...prev, { id: event.clarificationId, doctorRole: event.doctorRole, question: event.question }]);
        setLiveFeed("Your care team has a question for you...");
        break;
      case "phase_changed":
        if (event.phase === "debate") setLiveFeed("Your care team is discussing...");
        if (event.phase === "synthesis") setLiveFeed("Preparing your recommendations...");
        break;
      case "synthesis_complete":
        setSynthesis(event.data);
        break;
      case "error":
        setError(event.message);
        break;
    }
  };

  const handleReset = () => {
    setStep("info");
    setSymptoms("");
    setOrbs([]);
    setClarifications([]);
    setSynthesis(null);
    setError(null);
    setLiveFeed("");
    tokenBufferRef.current = {};
    setPatientInfo({ age: "", gender: "", knownConditions: "" });
  };

  if (step === "info") {
    return (
      <Card className="w-full max-w-lg mx-auto p-8 space-y-5">
        <div className="text-center">
          <div className="text-4xl mb-2">🏥</div>
          <h2 className="text-xl font-bold">Tell us about yourself</h2>
          <p className="text-sm text-muted-foreground mt-1">Helps your AI care team give better guidance</p>
        </div>
        <div className="space-y-3">
          <Input placeholder="Age" type="number" value={patientInfo.age} onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })} />
          <div className="flex gap-2">
            {["Male", "Female", "Other"].map((g) => (
              <button key={g} onClick={() => setPatientInfo({ ...patientInfo, gender: g })}
                className={`flex-1 py-2 rounded-lg border-2 text-sm transition-colors ${patientInfo.gender === g ? "border-primary bg-primary/10" : "border-border"}`}>
                {g}
              </button>
            ))}
          </div>
          <Input placeholder="Known conditions (optional)" value={patientInfo.knownConditions} onChange={(e) => setPatientInfo({ ...patientInfo, knownConditions: e.target.value })} />
        </div>
        <Button className="w-full" disabled={!patientInfo.age || !patientInfo.gender} onClick={() => setStep("chat")}>
          Continue
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-2xl mx-auto">
      {/* Care team panel */}
      {(orbs.length > 0 || isLoading) && (
        <Card className="p-4 mb-4 space-y-3">
          <p className="text-xs text-muted-foreground text-center uppercase tracking-wide">Your care team</p>
          <DoctorOrbRow orbs={orbs} />
          <LiveFeedLine text={liveFeed} />
        </Card>
      )}

      {/* Clarification questions */}
      {clarifications.map((c) => (
        <div key={c.id} className="mb-4">
          <ClarificationBubble {...c} onAnswer={handleAnswer} />
        </div>
      ))}

      {/* Synthesis result */}
      {synthesis && <div className="mb-4"><SynthesisCard synthesis={synthesis} onStartNew={handleReset} /></div>}

      {/* Error */}
      {error && <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-sm text-amber-700 dark:text-amber-300">{error}</div>}

      {/* Input */}
      {!synthesis && (
        <div className="mt-auto">
          <div className="flex gap-2">
            <Input
              placeholder="Describe your symptoms..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startConsultation()}
              disabled={isLoading}
              className="flex-1"
              autoFocus
            />
            <Button onClick={startConsultation} disabled={!symptoms.trim() || isLoading}>
              {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "→"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">🔒 Not stored · AI guidance only, not medical advice</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update consult page**

In `src/app/consult/page.tsx`, replace `ConsultationFlow` import and usage:

```tsx
import { SwarmChat } from "@/components/consult/SwarmChat";
// ...
<SwarmChat />
```

- [ ] **Step 3: Verify TypeScript**

```bash
bun run tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/components/consult/SwarmChat.tsx src/app/consult/page.tsx
git commit -m "feat: add SwarmChat patient UI replacing ConsultationFlow"
```

---

## Task 9: Doctor debug panel

**Files:**
- Create: `src/components/doctor/SwarmDebugPanel.tsx`
- Modify: `src/app/doctor/page.tsx`

- [ ] **Step 1: Create SwarmDebugPanel**

```tsx
// src/components/doctor/SwarmDebugPanel.tsx
"use client";
import { SwarmState } from "@/agents/swarm-types";
import { agentRegistry } from "@/agents/definitions";

export function SwarmDebugPanel({ state }: { state: Partial<SwarmState> }) {
  if (!state.doctorSwarms) return null;

  return (
    <div className="space-y-4 text-sm font-mono">
      {Object.entries(state.doctorSwarms).map(([role, swarm]) => {
        const agent = agentRegistry[role as keyof typeof agentRegistry];
        return (
          <div key={role} className="border rounded-lg p-3 space-y-2">
            <div className="font-semibold">{agent?.emoji} {agent?.name}</div>
            {swarm?.hypotheses.map((h) => (
              <div key={h.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{h.name}</span>
                  <span className="text-muted-foreground">{h.confidence}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${h.confidence}%` }} />
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {(state.debate?.length ?? 0) > 0 && (
        <div className="border rounded-lg p-3 space-y-2">
          <div className="font-semibold">💬 Team Debate</div>
          {state.debate!.map((d, i) => (
            <div key={i} className="text-xs">
              <span className="text-primary">{agentRegistry[d.doctorRole]?.name}</span>
              <span className="text-muted-foreground"> ({d.type}): </span>
              {d.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/doctor/SwarmDebugPanel.tsx
git commit -m "feat: add SwarmDebugPanel for doctor portal"
```

---

## Task 10: next.config + maxDuration

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Add maxDuration**

Read `next.config.ts` and add the `experimental` config or route segment config. The cleanest approach is to add it directly in the route file:

In `src/app/api/swarm/start/route.ts`, the `export const maxDuration = 60;` line is already included in Task 6 Step 1.

Also verify `next.config.ts` doesn't have conflicting timeout settings.

```bash
cat /Users/tasmanstar/Desktop/projects/medicrew/next.config.ts
```

- [ ] **Step 2: Commit if changes needed**

```bash
git add next.config.ts
git commit -m "fix: ensure swarm route has 60s maxDuration for Vercel"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run tsc --noEmit 2>&1
```
Expected: 0 errors

- [ ] **Step 2: Start dev server and smoke test**

```bash
bun run dev
```

Open http://localhost:3000/consult — verify:
- Info form appears
- After submitting symptoms, orbs appear and animate
- Live feed updates
- Synthesis card renders with urgency badge

- [ ] **Step 3: Test the answer endpoint**

```bash
curl -X POST http://localhost:3000/api/swarm/answer \
  -H "Content-Type: application/json" \
  -d '{"clarificationId":"test-123","answer":"no history of heart disease"}'
```
Expected: `{"ok":true}`

- [ ] **Step 4: Update agent-review.md**

Mark all 14 issues as ✅ FIXED in `docs/agent-review.md`.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: MediCrew swarm architecture — all 14 agent issues resolved"
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start dev server |
| `bun run tsc --noEmit` | TypeScript check |
| `bun run build` | Production build |

**Environment variables required:**
- `GROQ_API_KEY` — Groq API key (paid plan recommended for 30s target)
- `LLM_PROVIDER` — `groq` (default) or `ollama`

**Key files to read before starting:**
- `docs/superpowers/specs/2026-03-26-medicrew-swarm-design.md` — full spec
- `docs/agent-review.md` — 14 issues being fixed
- `src/agents/types.ts` — existing AgentRole, UrgencyLevel types
- `src/lib/ai/config.ts` — existing LLM factory

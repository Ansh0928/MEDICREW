# MediCrew Swarm Architecture — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Scope:** Full rebuild of the AI agent system + consultation UI for both patient and doctor modes

---

## 1. Problem

The current MediCrew agent system is a sequential linear pipeline (triage → GP → specialists → recommendation) with 14 known issues including: agents running one-at-a-time, node-level streaming that feels like waiting, no hypothesis exploration, no inter-agent debate, silent patient-safety failures on JSON parse errors, no rate limiting, and missing clinical guardrails on specialist prompts.

The existing system is prototype-grade. The goal is to replace it with a genuinely differentiated multi-agent swarm.

---

## 2. Goals

1. 5-layer swarm: 7 senior doctor agents run in parallel, each spawning sub-agents that explore diagnostic hypotheses simultaneously
2. Agents debate and challenge each other before synthesis
3. Sub-agents pause and ask the patient targeted follow-up questions
4. Patient sees a simple, reassuring UI (avatar orbs + live text feed) — zero complexity exposed
5. Doctor sees the full swarm: confidence scores per hypothesis, debate transcript, ranked differentials
6. Fix all 14 issues documented in `docs/agent-review.md`

---

## 3. Architecture

### Orchestration approach

**Plain async orchestrator — NOT LangGraph for the swarm.**

LangGraph's `StateGraph` is a static DAG and does not support dynamic fan-out to a runtime-determined number of parallel branches or mid-graph pause/resume awaiting external input. The swarm uses plain `async/await` + `Promise.all` inside a single Next.js API route that holds a long-lived SSE connection.

LangGraph is **removed** from the new swarm. The existing `orchestrator.ts` and `doctorConsultation.ts` are replaced by `src/agents/swarm.ts`.

Session state lives in the SSE connection itself (in-memory within the single serverless function invocation). The `GET /api/swarm/[sessionId]` resume endpoint is **out of MVP scope** — Vercel serverless functions are stateless and cannot hold shared in-memory state across invocations. Session resume requires Upstash Redis and is deferred to Phase 2.

Vercel `maxDuration` must be set to `60` in `next.config.ts` for the swarm route.

### 5-Layer Swarm

```
L1  TRIAGE               Fast call. Instant urgency + relevant doctor roles.
                         Model: llama-3.3-70b-versatile (supports JSON mode).
                         response_format: { type: "json_object" }.
                         Parse failure → urgency defaults to "urgent", never "routine".

L2  7 DOCTORS            Promise.all across all relevant doctors (subset of 7, from triage).
    Roles (= AgentRole): triage | gp | cardiology | mental_health |
                         dermatology | orthopedic | gastro | physiotherapy
    Each doctor call: reads symptoms + triage output, spawns its sub-agent swarm.

L3  SUB-AGENT SWARM      Per doctor: Promise.all across N hypothesis sub-agents (max 4).
                         Each sub-agent: explores ONE hypothesis, returns confidence 0–100.
                         Sub-agent may emit need_clarification with one question string.
                         Max 2 questions in flight globally (excess queued in SwarmState).
                         Sub-agents use a smaller, faster model for speed.
                         Model: llama-3.3-70b-versatile at temperature 0.1, max 200 tokens.

L4  DEBATE               Sequential: each relevant doctor reads ALL swarm results, emits
                         one of: agree | challenge | add_context.
                         Challenge must cite a hypothesis name.
                         Capped at 1 round (each doctor speaks once, max 300 tokens).

L5  SYNTHESIS            Reads all hypotheses + confidence scores + debate.
                         Determines final urgency (may escalate from triage).
                         Outputs ranked hypotheses, next steps, questions for GP, timeframe.
```

---

## 4. Types

```typescript
// DoctorRole is an alias for the existing AgentRole from src/agents/types.ts
type DoctorRole = AgentRole  // "gp" | "cardiology" | "mental_health" | "dermatology" | "orthopedic" | "gastro" | "physiotherapy" | "triage"

interface SwarmState {
  sessionId: string
  symptoms: string
  patientInfo: { age: string; gender: string; knownConditions?: string }

  // L1
  triage: {
    urgency: 'emergency' | 'urgent' | 'routine' | 'self_care'
    relevantDoctors: DoctorRole[]
    redFlags: string[]
  } | null

  // L2 + L3
  doctorSwarms: Partial<Record<DoctorRole, {
    status: 'pending' | 'running' | 'waiting_for_patient' | 'complete'
    hypotheses: Array<{
      id: string          // uuid — used to correlate questions with swarm branch
      name: string
      confidence: number
      reasoning: string
    }>
  }>>

  // Clarification Q&A
  clarifications: Array<{
    id: string            // matches hypothesis.id that triggered the question
    doctorRole: DoctorRole
    question: string
    answer?: string
    status: 'pending' | 'answered'
  }>
  activeClarificationIds: string[]  // max 2 — queued if more pending

  // L4
  debate: Array<{
    doctorRole: DoctorRole
    type: 'agree' | 'challenge' | 'add_context'
    content: string
    referencingHypothesis?: string
  }>

  // L5
  synthesis: {
    urgency: 'emergency' | 'urgent' | 'routine' | 'self_care'
    rankedHypotheses: Array<{ name: string; confidence: number; doctorRole: DoctorRole }>
    nextSteps: string[]
    questionsForDoctor: string[]
    timeframe: string
    disclaimer: string
  } | null

  currentPhase: 'triage' | 'swarm' | 'awaiting_patient' | 'debate' | 'synthesis' | 'complete'
}
```

---

## 5. SSE Event Schema

```typescript
type SwarmEvent =
  | { type: 'triage_complete'; data: NonNullable<SwarmState['triage']> }
  | { type: 'phase_changed'; phase: SwarmState['currentPhase'] }
  | { type: 'doctor_activated'; doctorRole: DoctorRole; doctorName: string }
  | { type: 'doctor_complete'; doctorRole: DoctorRole }
  | { type: 'hypothesis_found'; doctorRole: DoctorRole; hypothesisId: string; name: string; confidence: number }
  | { type: 'question_ready'; clarificationId: string; doctorRole: DoctorRole; question: string }
  | { type: 'doctor_token'; doctorRole: DoctorRole; token: string }
  | { type: 'debate_message'; doctorRole: DoctorRole; messageType: 'agree' | 'challenge' | 'add_context'; content: string }
  | { type: 'synthesis_complete'; data: NonNullable<SwarmState['synthesis']> }
  | { type: 'error'; message: string }
  | { type: 'done' }
```

---

## 6. API Endpoints

### `POST /api/swarm/start`
Start a swarm session. Returns SSE stream.

Request:
```json
{ "symptoms": "string (max 2000 chars)", "patientInfo": { "age": "string", "gender": "string", "knownConditions": "string?" } }
```

Response: `text/event-stream`. Each event: `data: <SwarmEvent JSON>\n\n`

Security: input length cap 2000 chars, IP rate limit 5 req/60s, auth optional for MVP.

### `POST /api/swarm/answer`
Submit patient answer to a clarification question.

Request:
```json
{ "sessionId": "string", "clarificationId": "string", "answer": "string" }
```

Response: `{ "ok": true }` — the answer is written to a shared in-memory store keyed by sessionId. The open SSE connection polls this store and resumes the paused swarm branch when the answer arrives.

Note: both the SSE handler and the answer handler run in the same serverless function invocation **only** if the SSE stream is still open. The `POST /api/swarm/answer` writes to a module-level `Map<sessionId, answer>` that the SSE generator reads. This works in dev (single Node process) but has the same Vercel statelesness caveat — session resume is Phase 2.

### `POST /api/portal/case-consult` (existing)
Updated to use the new swarm. Fixes SSE error handling (structured error event before `controller.close()`).

---

## 7. Patient UI Components

File: `src/components/consult/SwarmChat.tsx` (replaces `ConsultationFlow.tsx`)

| Component | Behaviour |
|-----------|-----------|
| `SwarmChat` | Root. Manages SSE stream from `/api/swarm/start`. Owns `SwarmState` locally. |
| `PatientInfoStep` | Age + gender + optional conditions. One step, no doctor selection. |
| `DoctorOrbRow` | Row of orbs for relevant doctors only. `waiting` = dim, `active` = glowing pulse animation, `done` = checkmark. |
| `LiveFeedLine` | Single line below orbs. Updates on `doctor_activated` and `doctor_token` events. |
| `ClarificationBubble` | Renders on `question_ready`. Doctor avatar + question text + inline text input + submit. On submit calls `POST /api/swarm/answer`. Max 2 visible. |
| `SynthesisCard` | Renders on `synthesis_complete`. Urgency badge, ranked next steps, questions for GP, disclaimer. Emergency urgency → renders immediately with "Call 000". |

Patient never sees: hypothesis names, confidence scores, debate content, sub-agent count.

---

## 8. Doctor UI Components

File: `src/app/doctor/page.tsx` (existing, extended)

Doctor portal reads from existing `SymptomCheck` records and triggers `streamDoctorConsultation` (updated to use swarm). Swarm state is passed as a prop to a new `SwarmDebugPanel` component.

| Component | Data source |
|-----------|-------------|
| `SwarmDebugPanel` | SSE stream from doctor portal trigger. Per-doctor hypothesis bars + confidence %. Debate transcript. Q&A log. |
| `DifferentialRanking` | `synthesis.rankedHypotheses` — sorted table across all doctors. |

**Note:** SOAP note / PDF export is **out of scope for MVP** (listed in Section 10 Out of Scope). The doctor UI shows the swarm output in-app only.

---

## 9. Agent Prompt Standards

All specialist files in `src/agents/definitions/` must have this block appended to `systemPrompt`:

```
## Scope Boundaries
You provide health navigation guidance only — not medical diagnoses or prescriptions.
Never state a definitive diagnosis. Use language like "may suggest", "could indicate", "worth investigating".
If you cannot assess confidently, say so explicitly.
Always recommend discussing findings with a qualified healthcare provider.
```

Triage node uses Groq JSON mode. Model: `llama-3.3-70b-versatile` (confirmed JSON mode support).

---

## 10. Out of Scope (MVP)

- Session resume across dropped connections (requires Upstash Redis — Phase 2)
- SOAP note / PDF export
- Voice transcription
- Real EHR integration
- Multi-tenant / clinic onboarding
- TGA compliance / legal review
- Persistent session storage in Prisma

---

## 11. Performance Constraints

The 30-second end-to-end target applies under these conditions:
- Groq paid plan (Dev Console free tier will serialize parallel requests due to RPM limits)
- Sub-agent responses capped at 200 tokens each
- Max 4 sub-agents per doctor × max 4 relevant doctors = 16 parallel sub-agent calls
- No clarification questions (questions add 1 human round-trip each)
- `llama-3.3-70b-versatile` at Groq's current throughput (~200 tok/s)

Set `maxDuration = 60` in `next.config.ts` for `/api/swarm/start`.

---

## 12. Fixes from agent-review.md

| Issue | Fix |
|-------|-----|
| #1 Sequential specialists | Promise.all fan-out in swarm.ts |
| #2 Node-level streaming | llm.stream() + doctor_token events |
| #3 LLM per node | Single LLM instance per swarm run |
| #4 Triage silent fail-open | JSON mode + "urgent" fallback + error log |
| #5 Doctor triage regex | Structured JSON in both pipelines |
| #6 Naive keyword routing | LLM-based routing inside triage |
| #7 LLM instantiation | Lifted to swarm factory |
| #8 No auth/rate limit | Input cap 2000 chars + IP rate limiter |
| #9 Hardcoded urgency | Synthesis determines urgency from debate |
| #10 No session resume | Out of scope MVP — noted in Section 10 |
| #11 SSE error handling | Structured error event before close |
| #12 Missing guardrails | Scope boundaries block added to all 6 specialist prompts |
| #13 No-op router | Removed — replaced by conditional fan-out |
| #14 No observability | LangSmith env vars + pino on API routes |

---

## 13. Success Criteria

- Patient submits symptoms → orbs light up + live feed updates within 2 seconds
- At least 1 clarification question surfaces in a typical chest-pain consultation
- Doctor portal shows ranked hypotheses with confidence bars
- All 14 issues from `docs/agent-review.md` marked ✅ FIXED
- TypeScript builds with 0 errors (`bun run tsc --noEmit`)
- End-to-end consultation completes under 30 seconds on Groq paid plan with no clarifications

# Architecture Patterns: Medicrew Patient Care Platform

**Domain:** AI multi-agent healthcare platform (patient-facing)
**Researched:** 2026-03-26
**Overall confidence:** HIGH (verified against official LangGraph.js docs, Supabase docs, production templates)

---

## Recommended Architecture

The system separates into four bounded layers with clear, one-directional ownership of state transitions.

```
┌─────────────────────────────────────────────────────────────┐
│                     PATIENT APP LAYER                        │
│  Next.js App Router — pages, components, SSE stream client  │
│  Supabase Realtime client subscription (care team status)   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP + SSE (consultation)
                            │ WebSocket (Supabase Realtime, care status)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    AGENT API LAYER                           │
│  Next.js API Routes (App Router)                            │
│  /api/consultation/stream   — SSE from LangGraph.stream()   │
│  /api/checkin/trigger       — invoked by cron               │
│  /api/escalation/run        — invoked by cron/post-write    │
└────────────┬──────────────────────────┬─────────────────────┘
             │ invoke / stream           │ read/write
             ▼                          ▼
┌────────────────────────┐  ┌──────────────────────────────────┐
│    AGENT LAYER         │  │      PERSISTENCE LAYER           │
│                        │  │                                  │
│  LangGraph.js graphs:  │  │  Supabase PostgreSQL (prod)      │
│  - Consultation graph  │  │  SQLite (dev)                    │
│  - CheckIn graph       │  │                                  │
│  - Escalation graph    │  │  Tables:                         │
│                        │  │  - Patient (profile + history)   │
│  Checkpointer:         │  │  - Consultation (full messages)  │
│  PostgresSaver         │  │  - CheckIn (scheduled + result)  │
│  (thread memory)       │  │  - Notification                  │
│                        │  │  - CareTeamStatus                │
│  InMemoryStore /       │  │                                  │
│  custom Store          │  │  LangGraph checkpoint tables     │
│  (cross-thread memory) │  │  (managed by @langchain/         │
│                        │  │   langgraph-checkpoint-postgres) │
└────────────────────────┘  └──────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   NOTIFICATION LAYER                         │
│  Resend (email) / Web Push API                              │
│  Triggered by: escalation graph, check-in graph             │
│  Written to: Notification table → Supabase Realtime push    │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

| Component                    | Responsibility                                                                        | Communicates With                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Patient App (Next.js)        | Render UI, consume SSE stream, display care team status, show notifications           | Agent API Layer via fetch/SSE, Supabase Realtime directly                                |
| Agent API Routes             | Orchestrate graph invocations, format SSE responses, validate inputs                  | Agent Layer (LangGraph), Persistence Layer (Prisma/Supabase)                             |
| Consultation Graph           | Reactive: triage → GP → specialist → recommend (existing)                             | LLM providers, Persistence Layer (write result on complete)                              |
| CheckIn Graph                | Proactive: load patient history → generate check-in message → write notification      | LLM providers, Persistence Layer (read/write)                                            |
| Escalation Graph             | Monitoring: read symptom history → detect worsening patterns → conditionally escalate | LLM providers, Persistence Layer (read/write), Notification Layer                        |
| Checkpointer (PostgresSaver) | Thread-scoped state: per-consultation message history                                 | Supabase PostgreSQL (dedicated checkpoint tables)                                        |
| Memory Store                 | Cross-thread: patient health profile, agent personalization notes                     | Supabase PostgreSQL (custom `patient_memory` table or LangGraph InMemoryStore + DB sync) |
| CareTeamStatus table         | Stores current agent activity per patient (e.g. "Dr. Sarah reviewing case")           | Written by Agent API, read by Supabase Realtime subscription                             |
| Notification Layer           | Delivers push/email asynchronously after graph completion                             | Resend API, Web Push API                                                                 |
| Cron Scheduler               | Fires proactive check-ins and escalation scans on schedule                            | Agent API Routes                                                                         |

---

## Data Flow: Reactive Consultation vs Proactive Check-In

### Reactive Consultation (patient initiates)

```
Patient submits symptoms
  → POST /api/consultation/start
  → Creates Consultation record (status: pending)
  → Writes CareTeamStatus: "Dr. Alex is reviewing your symptoms"
  → Invokes graph.stream(initialState, { configurable: { thread_id: consultationId } })
  → SSE stream → client receives step-by-step agent messages
  → On complete: writes Consultation record (full messages + recommendation)
  → Writes CareTeamStatus: "Dr. Alex reviewed your case at 2:45pm"
  → Writes Notification: "Your care team has a recommendation"
  → Supabase Realtime pushes CareTeamStatus + Notification to patient UI
```

### Proactive Check-In (system initiates)

```
Cron fires (e.g. 48h after last consultation)
  → GET /api/checkin/trigger (protected by CRON_SECRET header)
  → Queries all patients with consultations in past 7 days, no check-in in past 48h
  → For each patient:
      → Loads prior consultation summary from Consultation table
      → Loads patient memory from Memory Store (known conditions, preferred name, etc.)
      → Invokes CheckIn graph (lightweight: 1 LLM call per patient)
      → CheckIn graph generates personalised "How are you feeling?" message
      → Writes CheckIn record to DB
      → Writes Notification: agent name + message
      → Supabase Realtime / email delivers to patient
```

---

## LangGraph State Extension

### Existing ConsultationAnnotation — no breaking changes required

The existing `ConsultationAnnotation` handles the reactive consultation graph and is production-correct as-is. Extend it only with:

```typescript
patientId: Annotation<string>,          // links state to DB patient
checkpointId: Annotation<string | undefined>,  // for resume-from-checkpoint
memoryContext: Annotation<PatientMemory | undefined>,  // injected at start
```

### New CheckInAnnotation (separate graph)

```typescript
const CheckInAnnotation = Annotation.Root({
  patientId: Annotation<string>,
  priorConsultationSummary: Annotation<string>,
  patientMemory: Annotation<PatientMemory>,
  checkInMessage: Annotation<string | undefined>,
  urgencySignalsDetected: Annotation<boolean>,
  currentStep: Annotation<string>,
});
```

### New EscalationAnnotation (separate graph)

```typescript
const EscalationAnnotation = Annotation.Root({
  patientId: Annotation<string>,
  recentConsultations: Annotation<ConsultationSummary[]>, // last N
  recentCheckIns: Annotation<CheckInResult[]>,
  symptomTrend: Annotation<"stable" | "improving" | "worsening" | "unknown">,
  escalationRequired: Annotation<boolean>,
  escalationReason: Annotation<string | undefined>,
  currentStep: Annotation<string>,
});
```

### Patient Memory Schema (cross-thread store)

Stored as JSON document per patient in a `patient_memory` table or via LangGraph's InMemoryStore with DB sync:

```typescript
interface PatientMemory {
  patientId: string;
  preferredName: string;
  knownConditions: string[];
  currentMedications: string[];
  lastSymptomsSummary: string;
  symptomHistory: { date: string; summary: string; urgency: string }[];
  agentNotes: { agentRole: string; note: string; date: string }[];
  emergencyContact: string | undefined;
}
```

---

## Patterns to Follow

### Pattern 1: Thread-per-Consultation with PostgresSaver

**What:** Each consultation gets a unique `thread_id`. The `@langchain/langgraph-checkpoint-postgres` checkpointer saves full graph state after every node.

**When:** For all reactive consultations and check-in graph invocations.

**Why:** Enables pause/resume, audit trail, and future human-in-the-loop review by clinic staff. The consultation is rehydratable from any point.

**Setup:**

```typescript
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!);
await checkpointer.setup(); // run once at startup
const graph = createConsultationGraph().compile({ checkpointer });
const result = await graph.invoke(state, {
  configurable: { thread_id: consultationId },
});
```

Confidence: HIGH — verified against `@langchain/langgraph-checkpoint-postgres` npm package docs.

### Pattern 2: SSE Route for Streaming Agent Responses

**What:** A Next.js App Router route at `/api/consultation/stream` uses `graph.stream()` and writes each node output as an SSE event. The patient UI consumes this with `EventSource` or `fetch` with `ReadableStream`.

**When:** Reactive consultation flow only. Check-in and escalation graphs run to completion without streaming.

**Why:** SSE is unidirectional (server → client), works over standard HTTP/HTTPS, does not require WebSocket upgrade. LangGraph's `graph.stream()` yields per-node outputs which map cleanly to SSE events.

**Stream event shape:**

```typescript
// Server emits:
data: {"step": "triage", "agentName": "Dr. Alex", "content": "...", "urgency": "routine"}
data: {"step": "gp", "agentName": "Dr. Alex (GP)", "content": "..."}
data: {"step": "complete", "recommendation": {...}}
```

Confidence: HIGH — verified against production template at github.com/agentailor/fullstack-langgraph-nextjs-agent.

### Pattern 3: CareTeamStatus Table + Supabase Realtime

**What:** A `CareTeamStatus` table with columns `(patientId, agentRole, agentName, statusMessage, updatedAt)`. Written synchronously by the Agent API before and after graph invocations. The patient dashboard subscribes via Supabase Realtime (Postgres Changes on this table filtered by `patientId`).

**When:** All flows — reactive consultation, proactive check-in, escalation.

**Why:** Decouples "what the agent is doing" from the consultation itself. Supabase Realtime pushes row changes via WebSocket to the subscribed client — no polling required.

**Client subscription:**

```typescript
supabase
  .channel("care-team-status")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "CareTeamStatus",
      filter: `patientId=eq.${patientId}`,
    },
    (payload) => updateStatusUI(payload.new),
  )
  .subscribe();
```

Confidence: HIGH — verified against Supabase Realtime docs.

### Pattern 4: Cron-Triggered Check-In via Vercel Cron Jobs

**What:** `vercel.json` schedules a cron that calls `/api/checkin/trigger` daily (or at desired frequency). The endpoint is protected with a `CRON_SECRET` authorization header. It queries for patients due for a check-in and invokes the CheckIn graph per patient.

**When:** Proactive check-in system and escalation scan.

**Why:** No always-running process is available on serverless (Vercel). Vercel Cron Jobs are the native solution for this deployment target. For self-hosted (Railway/Render), a node-cron process inside a dedicated worker file is equivalent.

**vercel.json:**

```json
{
  "crons": [
    { "path": "/api/checkin/trigger", "schedule": "0 9 * * *" },
    { "path": "/api/escalation/scan", "schedule": "0 */6 * * *" }
  ]
}
```

**Important:** Design the endpoint as idempotent — Vercel may fire the same cron twice in rare cases.

Confidence: MEDIUM — Vercel Cron docs verified, but self-hosted alternative (node-cron) is untested against this codebase.

### Pattern 5: Escalation via Conditional Routing in EscalationGraph

**What:** The EscalationGraph receives a patient's recent N consultations and check-in responses. A triage node classifies the symptom trend. A conditional edge routes: `stable → no-op`, `worsening → escalationNode → writeUrgentNotification → updateCareTeamStatus`.

**When:** Runs on the escalation scan cron (every 6h or after each check-in response is written).

**Why:** Separates escalation logic from individual consultation/check-in logic. Keeps the consultation graph fast (no retrospective analysis). Avoids re-running expensive LLM calls unless a trigger exists.

**Trigger condition (query before invoking graph):**

```typescript
// Only invoke EscalationGraph if patient has 2+ consultations in last 14 days
// OR last check-in indicated new/worsening symptoms
const shouldScan = consultationCount >= 2 || lastCheckInFlaggedConcern;
```

Confidence: MEDIUM — pattern derived from LangGraph fraud detection and incident response examples; no direct healthcare reference found.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Injecting All Consultation History into Every LLM Call

**What:** Loading every prior consultation as raw text into the system prompt for every new consultation.

**Why bad:** At 50+ consultations, token costs and latency explode. LLMs degrade with very long context. Privacy surface area increases.

**Instead:** Use the Memory Store to maintain a summarised `PatientMemory` object (last symptoms summary + known conditions + key agent notes). Refresh the summary after each consultation by running a short summarisation step. Inject only the summary, not raw history.

### Anti-Pattern 2: Polling for Care Team Status from the Patient UI

**What:** Frontend polls `/api/care-team-status` every N seconds to check what agents are doing.

**Why bad:** Wasteful on serverless (each poll = a cold start hit). Adds latency. Pollutes logs.

**Instead:** Use Supabase Realtime subscription on the `CareTeamStatus` table. One WebSocket connection per patient session delivers updates instantaneously.

### Anti-Pattern 3: Running Check-In Graphs Inside the Reactive Consultation Request

**What:** Triggering proactive follow-up logic synchronously at the end of a consultation API call.

**Why bad:** Extends the patient's request/response cycle. If the check-in LLM call fails, the consultation API returns an error. Couples unrelated concerns.

**Instead:** Write the consultation result to DB, then use a database trigger or a separate cron pass to identify and schedule check-ins.

### Anti-Pattern 4: Sharing One LangGraph Thread ID Across Multiple Consultations

**What:** Reusing the same `thread_id` for a patient across all their consultations to "accumulate" history in the checkpointer.

**Why bad:** Checkpoint tables grow unbounded. The graph state from consultation 1 leaks into consultation 10 (wrong messages in context window). Rollback/replay becomes impossible.

**Instead:** One `thread_id` per consultation (UUID = consultationId). Cross-consultation memory lives in the Memory Store, not the checkpointer.

### Anti-Pattern 5: Emergency Escalation as a Graph Optional Path

**What:** Letting the EscalationGraph or ConsultationGraph decide via an optional branch whether to fire the emergency 000 escalation.

**Why bad:** A hallucinating LLM might skip the branch. This is a hard safety requirement, not an optional feature.

**Instead:** The `redFlags` reducer in ConsultationAnnotation already accumulates red flags. Add a post-graph synchronous check in the API route: `if (result.urgencyLevel === "emergency" || result.redFlags.includes("chest_pain") || ...) { await sendEmergencyNotification(patient); }`. This is not a graph node — it is imperative code that cannot be skipped.

---

## Suggested Build Order

Each step enables the next. Do not skip ahead.

| Step | What to Build                                                                              | Why First                                                                                        |
| ---- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 1    | Migrate DB to Supabase PostgreSQL; add `CareTeamStatus`, `CheckIn`, `PatientMemory` tables | Everything downstream needs persistent, realtime-capable storage                                 |
| 2    | Integrate `PostgresSaver` checkpointer into existing consultation graph                    | Memory and streaming require a checkpointer; also validates Supabase connection                  |
| 3    | Patient onboarding flow + `PatientMemory` initial write                                    | Check-ins and escalation need the patient profile to exist before they run                       |
| 4    | CareTeamStatus writes + Supabase Realtime subscription in patient dashboard                | Care team indicators are visible early, making the platform feel live before check-ins are built |
| 5    | SSE streaming for reactive consultation                                                    | Re-uses existing `streamConsultation()` generator; connects to new API route                     |
| 6    | CheckIn graph + cron trigger                                                               | Requires patient memory (step 3) and notification infra                                          |
| 7    | Escalation graph + escalation cron                                                         | Requires consultation history (step 1+2) and check-in data (step 6)                              |
| 8    | Push/email notifications via Resend                                                        | Final delivery mechanism; all other steps work via in-app notifications first                    |

---

## Scalability Considerations

| Concern                       | At 100 patients                              | At 10K patients                                            | At 100K patients                               |
| ----------------------------- | -------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| LLM calls (check-in cron)     | Run sequentially per patient, fine           | Batch with concurrency limit (e.g. p-limit, 10 concurrent) | Queue-based (BullMQ + Redis) with backpressure |
| Checkpoint table growth       | Minimal; prune threads older than 90 days    | Add scheduled cleanup job                                  | Partition by month + archive to cold storage   |
| Supabase Realtime connections | No concern                                   | No concern (Supabase handles multiplexing)                 | Review Supabase plan limits                    |
| SSE connections               | Ephemeral (per consultation); fine on Vercel | Fine                                                       | Fine — SSE is stateless between consultations  |
| Memory Store lookups          | In-memory or simple DB query                 | Add index on `patientId`; cache hot records                | Consider Redis layer in front of Postgres      |

---

## Sources

- [LangGraph.js Cron Jobs (official)](https://langchain-ai.github.io/langgraphjs/cloud/how-tos/cron_jobs/) — HIGH confidence
- [@langchain/langgraph-checkpoint-postgres (npm)](https://www.npmjs.com/package/@langchain/langgraph-checkpoint-postgres) — HIGH confidence
- [LangGraph Persistence docs](https://docs.langchain.com/oss/javascript/langgraph/persistence) — HIGH confidence
- [LangGraph Long-Term Memory Support announcement](https://blog.langchain.com/launching-long-term-memory-support-in-langgraph/) — HIGH confidence
- [Supabase Realtime subscriptions (official)](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) — HIGH confidence
- [Supabase Realtime with Next.js (official)](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) — HIGH confidence
- [fullstack-langgraph-nextjs-agent production template](https://github.com/agentailor/fullstack-langgraph-nextjs-agent) — MEDIUM confidence (third-party, well-maintained)
- [SSE streaming in LangGraph Next.js](https://deepwiki.com/agentailor/fullstack-langgraph-nextjs-agent/6.3-sse-streaming) — MEDIUM confidence
- [Vercel Cron Jobs for Next.js](https://drew.tech/posts/cron-jobs-in-nextjs-on-vercel) — MEDIUM confidence
- [LangGraph fraud detection / escalation pattern](https://winfully.digital/technology/real-time-fraud-detection-orchestration-adaptive-threat-response-with-langgraph-state-machines/) — MEDIUM confidence (applied by analogy to healthcare escalation)
- [Real-time notification system with Supabase + Next.js](https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs) — MEDIUM confidence

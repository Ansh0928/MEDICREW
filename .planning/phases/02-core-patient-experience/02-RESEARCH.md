# Phase 2: Core Patient Experience - Research

**Researched:** 2026-03-26
**Domain:** Next.js 14 App Router, Supabase Realtime, LangGraph SSE streaming, Prisma schema extension, shadcn/ui multi-step forms
**Confidence:** HIGH

---

## Summary

Phase 2 builds on a solid Phase 1 foundation that already has Supabase PostgreSQL (ap-southeast-2), Prisma + RLS, LangGraph with PostgresSaver checkpointing, AHPRA compliance constants, and the `detectEmergency` + `checkConsent` guards wired into the consultation API route. The auth system is still the temporary `x-patient-id` header pattern from Phase 1 — Phase 2 must migrate to session-based identity before any patient data can be persisted from the new onboarding form.

The `streamConsultation` generator already yields node-level events `{ step, data }` from LangGraph's `.stream()` method. The existing `/api/consult` route already wraps this in an SSE `ReadableStream`. Phase 2 does not need `@ai-sdk/langchain` — the bridge is not installed and the existing SSE mechanism is the right approach. What Phase 2 adds is: (a) token-level text streaming within each node by switching from `.invoke()` to `.stream()` on the LLM inside each agent node, (b) injecting agent identity metadata into each SSE chunk, and (c) a Supabase Realtime subscription on the patient dashboard for care team status.

The Prisma `Patient` model is missing: DOB, medications, emergency contact, GP details, and symptom journal. A new `SymptomJournal` model is needed. These require a new migration. The `Consultation` model stores `recommendation` as a TEXT string — Phase 2 needs to serialize the structured `CareRecommendation` object as JSONB for the Care Summary to be queryable.

**Primary recommendation:** Wire Supabase Auth sessions in the onboarding flow to replace the `x-patient-id` header, extend the Prisma schema for new profile fields, implement SSE agent identity streaming by attaching `agentName`/`agentRole` metadata to each streamed chunk, and use the Supabase JS client's `.channel().on('postgres_changes', ...)` API for the 2-second Realtime requirement on the dashboard.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

No CONTEXT.md exists for Phase 2. The following constraints are derived from the Phase 1 decisions that carry forward:

### Locked Decisions (from Phase 1 CONTEXT.md)

- Agent naming format: `"Alex AI — GP"` (em dash, not hyphen) — already applied in all 8 agent definition files
- AHPRA disclaimer text: `AHPRA_DISCLAIMER` constant in `src/lib/compliance.ts` — use this, do not create a new string
- Emergency detection: `detectEmergency()` pure function in `src/lib/emergency-rules.ts` — must be called before any LLM invocation
- Consent gate: `checkConsent()` in `src/lib/consent-check.ts` — must be checked before processing health data
- Auth pattern: `x-patient-id` header is temporary — Phase 2 will replace with Supabase Auth session (this is a Phase 1 deferred item now due for implementation)
- Database: Supabase PostgreSQL ap-southeast-2, Prisma `@prisma/client`, `DATABASE_URL` (pooled) + `DIRECT_URL` (direct)
- Package manager: `bun` only — never `npm`, `yarn`, or `pnpm`
- `/api/patient/consent` endpoint: not yet created — Phase 2 must implement it (the `/consent` page POSTs to this route)
- Soft delete: `deletedAt` + `deletedEmail` pattern already in schema — do not change deletion logic

### Claude's Discretion

- Supabase Auth strategy: magic link vs email/password session — research recommends email/password sessions via `@supabase/ssr` for Next.js App Router (see Standard Stack)
- Care team avatar implementation: SVG initials vs uploaded images — research recommends generated SVG avatars per agent (no file upload complexity)
- Symptom journal storage: new Prisma model vs JSONB on Patient — research recommends separate `SymptomJournal` model (queryable, Phase 4 trend charts need it)
- Onboarding flow routing: separate `/onboarding` route vs modal — research recommends dedicated `/onboarding` multi-step page

### Deferred Ideas (OUT OF SCOPE for Phase 2)

- Proactive check-ins (Phase 3)
- Escalation rules beyond what Phase 1 already built (Phase 3)
- Email notifications via Resend (Phase 3)
- Symptom trend charts (Phase 4)
- Care plan detail UI (Phase 4)
- TGA SaMD assessment — external task
- LLM provider DPA documentation — external task
  </user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                                              | Research Support                                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ONBD-01 | Patient completes onboarding: name, DOB, gender, known conditions, medications, emergency contact, GP details            | Prisma schema needs DOB + medications + emergencyContact + gpDetails fields added; multi-step form with shadcn/ui Card + stepper pattern                                           |
| ONBD-02 | Onboarding includes consent step with Privacy Act disclosure                                                             | `/consent` page already built; integrate as Step 2 of onboarding flow; `/api/patient/consent` POST endpoint must be created                                                        |
| ONBD-03 | Care team introduced during onboarding — named agents with avatars, specialties, "I'm here to help with..." descriptions | `agentRegistry` in `src/agents/definitions/index.ts` has all 8 agents with `name`, `emoji`, `description`, `specialties` — use directly; add `avatar` field (SVG initial or emoji) |
| DASH-01 | Dashboard shows named care team with live status indicators ("Alex AI — GP: Reviewed your symptoms today")               | New `CareTeamStatus` table or JSONB field on Patient; Supabase Realtime `postgres_changes` subscription for 2-second updates                                                       |
| DASH-02 | Dashboard shows active care plan — monitoring status, next check-in, open action items (basic form; Phase 4 deepens)     | Store monitoring status on Patient or consultation; basic static card for Phase 2; Phase 4 adds detail                                                                             |
| DASH-03 | Dashboard shows consultation history with urgency levels, agent names, outcome summary                                   | Already partially in `patient/page.tsx` history tab; need to surface agent names from `Consultation.gpResponse`/`specialistResponse` fields                                        |
| DASH-04 | Realtime care team status via Supabase Realtime — no polling, updates within 2 seconds                                   | `@supabase/supabase-js` v2.100.0 already installed; `.channel().on('postgres_changes', ...)` pattern confirmed in docs                                                             |
| CONS-01 | Consultation UI shows which AI agent is currently speaking — name, avatar, specialty badge during streaming              | Modify `streamConsultation()` to attach `agentName`/`agentRole` per chunk; client reads agent metadata per SSE event                                                               |
| CONS-02 | Agent responses stream in real-time via SSE — progressive text, not all-at-once                                          | Existing SSE machinery works at node granularity; switch agent nodes from `llm.invoke()` to `llm.stream()` for token-level streaming                                               |
| CONS-03 | After triage, patient sees which specialists are reviewing ("Sarah AI — Cardiology is reviewing")                        | `relevantSpecialties` array available in LangGraph state after triage node; emit a `{ step: 'routing', specialists: [...] }` SSE event                                             |
| CONS-04 | Consultation ends with structured Care Summary: urgency, findings, next steps, timeframe, disclaimer                     | `CareRecommendation` type already exists; store as JSONB in `Consultation.recommendation`; `CareSummary` React component with `AHPRA_DISCLAIMER`                                   |
| PROF-01 | Persistent health profile: conditions, medications, allergies, consultation history summary                              | Extend `Patient` schema with new fields + allergies; profile page at `/patient/profile`                                                                                            |
| PROF-02 | Agents access patient profile context at consultation start — personalized responses                                     | Pass patient profile snapshot into LangGraph initial state; prepend to `symptoms` string or add `patientContext` annotation                                                        |
| PROF-03 | Symptom journal: patient logs daily symptoms 1–5 severity + free text (basic form; Phase 4 adds trends)                  | New `SymptomJournal` model in Prisma; POST `/api/patient/journal`; simple form UI on profile page                                                                                  |

</phase_requirements>

---

## Standard Stack

### Core

| Library                 | Version                         | Purpose                                                           | Why Standard                                                                 |
| ----------------------- | ------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `@supabase/supabase-js` | 2.100.0 (installed)             | Database client + Realtime subscriptions                          | Already installed; provides both Postgres client and Realtime channel API    |
| `@supabase/ssr`         | latest                          | Supabase Auth with Next.js App Router server components + cookies | Official Supabase package for Next.js; handles cookie-based sessions for SSR |
| `@prisma/client`        | 6.19.2 (installed)              | Database ORM for all writes/reads                                 | Already the data layer; use for all Prisma model operations                  |
| `next`                  | 16.1.6 (installed)              | App Router, Server Actions, Route Handlers                        | Already in use; Route Handlers are the correct pattern for SSE endpoints     |
| `shadcn/ui`             | (installed via components.json) | Card, Badge, Avatar, Slider, Textarea components                  | Already the component library; use existing primitives                       |
| `framer-motion`         | 12.29.2 (installed)             | Step transitions in onboarding, streaming text fade-in            | Already installed; used in patient page                                      |
| `zod`                   | 4.3.6 (installed)               | Form validation schemas for onboarding                            | Already used for LangGraph output parsing                                    |
| `lucide-react`          | 0.563.0 (installed)             | Icons in care team cards, status badges                           | Already in use throughout                                                    |

### Supporting

| Library                  | Version            | Purpose                                 | When to Use                                                       |
| ------------------------ | ------------------ | --------------------------------------- | ----------------------------------------------------------------- |
| `@radix-ui/react-avatar` | 1.1.11 (installed) | Avatar component with fallback initials | Care team cards and consultation agent overlay                    |
| `@radix-ui/react-slider` | needs install      | 1–5 severity slider for symptom journal | Only if shadcn Slider component is not already in components.json |

### Not Needed

`@ai-sdk/langchain` is not installed and is not needed. The existing `streamConsultation()` generator with the SSE `ReadableStream` wrapper in `/api/consult/route.ts` is the correct streaming mechanism. The `ai` SDK v6 `streamText` is irrelevant here because the LLM calls are inside LangGraph nodes managed by LangChain — the LangChain streaming approach (`.stream()` on the LLM) is the right path.

**Installation (new packages only):**

```bash
bun add @supabase/ssr
```

Check if shadcn Slider is available before installing `@radix-ui/react-slider` separately — run `bunx shadcn-ui@latest add slider` instead.

**Version verification:**

```bash
bun pm ls | grep supabase
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
src/
├── app/
│   ├── onboarding/
│   │   └── page.tsx          # Multi-step onboarding flow (Steps 1-3)
│   ├── dashboard/
│   │   └── page.tsx          # Care team dashboard with Realtime
│   ├── patient/
│   │   ├── profile/
│   │   │   └── page.tsx      # Health profile + symptom journal
│   │   └── page.tsx          # Existing patient portal (keep)
│   └── api/
│       ├── patient/
│       │   ├── consent/
│       │   │   └── route.ts  # POST — create PatientConsent (Phase 1 deferred)
│       │   ├── journal/
│       │   │   └── route.ts  # POST/GET — symptom journal entries
│       │   └── care-status/
│       │       └── route.ts  # PATCH — update agent care team status
│       └── consult/
│           └── route.ts      # Extend existing SSE route with agent metadata
├── components/
│   ├── onboarding/
│   │   ├── MedicalHistoryStep.tsx
│   │   ├── ConsentStep.tsx   # Wraps existing consent page logic
│   │   └── CareTeamIntroStep.tsx
│   ├── dashboard/
│   │   ├── CareTeamCard.tsx  # Agent card with live status
│   │   └── ConsultationHistoryList.tsx
│   ├── consult/
│   │   └── AgentOverlay.tsx  # Name, avatar, specialty badge during streaming
│   └── profile/
│       ├── HealthProfileForm.tsx
│       └── SymptomJournalEntry.tsx
└── lib/
    ├── supabase/
    │   ├── server.ts         # createServerClient() for Route Handlers
    │   └── client.ts         # createBrowserClient() for Realtime subscriptions
    └── care-team-config.ts   # Agent avatar + specialty display config (static)
```

### Pattern 1: Multi-Step Onboarding with URL-Based Step State

**What:** Three-step flow at `/onboarding` using query params (`?step=1`, `?step=2`, `?step=3`). Each step is a separate component, state accumulated in a React context or passed via URL params. On completion, patient is redirected to `/dashboard`.

**When to use:** When the user must not be able to skip steps (consent is required before profile save).

**Example:**

```typescript
// src/app/onboarding/page.tsx
'use client';
import { useSearchParams } from 'next/navigation';
import { MedicalHistoryStep } from '@/components/onboarding/MedicalHistoryStep';
import { ConsentStep } from '@/components/onboarding/ConsentStep';
import { CareTeamIntroStep } from '@/components/onboarding/CareTeamIntroStep';

export default function OnboardingPage() {
  const params = useSearchParams();
  const step = parseInt(params.get('step') || '1');

  return (
    <div>
      {step === 1 && <MedicalHistoryStep />}
      {step === 2 && <ConsentStep />}
      {step === 3 && <CareTeamIntroStep />}
    </div>
  );
}
```

**Step flow:** Step 1 (medical history form) saves patient profile, redirects to Step 2. Step 2 (consent) posts to `/api/patient/consent`, redirects to Step 3. Step 3 (care team intro) is read-only display using `agentRegistry`, redirects to `/dashboard`.

### Pattern 2: Supabase Realtime Postgres Changes Subscription

**What:** Subscribe to INSERT/UPDATE events on a specific Postgres table row using the `@supabase/supabase-js` `.channel()` API. This is the correct approach for DASH-04 (2-second updates, no polling).

**When to use:** Any UI that needs to reflect database changes within 2 seconds without polling. Must be in a Client Component.

**Example:**

```typescript
// Source: Supabase docs — Postgres Changes
"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useEffect } from "react";

export function CareTeamCard({ patientId }: { patientId: string }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    const channel = supabase
      .channel(`care-status-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "CareTeamStatus",
          filter: `patientId=eq.${patientId}`,
        },
        (payload) => {
          // Update local state with payload.new
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, supabase]);
}
```

**Critical:** Supabase Realtime Postgres Changes requires the table to have `REPLICA IDENTITY FULL` set. Add this to the migration for `CareTeamStatus`.

### Pattern 3: LangGraph Token-Level Streaming with Agent Identity

**What:** Modify each agent node in `orchestrator.ts` to use `llm.stream()` instead of `llm.invoke()`, collect chunks, and yield them to the outer `streamConsultation` generator with agent identity attached. The SSE route then emits these as `data: { agentName, agentRole, chunk, step }` events.

**When to use:** CONS-01 (agent identity overlay) and CONS-02 (progressive text streaming).

**Example:**

```typescript
// Inside a modified agent node (e.g., gpNode) — token-level streaming
async function* gpNodeStream(state: ConsultationGraphState) {
  const llm = createLLM();
  const agent = agentRegistry.gp;
  let fullContent = "";

  for await (const chunk of await llm.stream([
    new SystemMessage(agent.systemPrompt),
    new HumanMessage(`...`),
  ])) {
    fullContent += chunk.content;
    yield {
      agentName: agent.name,
      agentRole: agent.role,
      chunk: chunk.content as string,
      step: "gp",
    };
  }

  // Return full message for state
  return {
    messages: [
      {
        role: "gp",
        agentName: agent.name,
        content: fullContent,
        timestamp: new Date(),
      },
    ],
  };
}
```

**Note:** LangGraph's `.stream()` operates at the node-completion level by default. To get token-level streaming from within a node, the node must itself be an async generator (`async function*`) and the graph must be configured with `streamMode: 'custom'` or the node yields to a side channel. The simpler approach for Phase 2: keep node-level streaming from LangGraph, but within each node switch from `llm.invoke()` to `llm.stream()` and buffer the full content for state, while emitting the token chunks separately via a shared EventEmitter or directly to the SSE controller. See Pitfall 3 for the recommended implementation pattern.

### Pattern 4: Patient Profile Context Injection (PROF-02)

**What:** At consultation start, fetch patient's profile fields from DB and prepend as a context block in the LangGraph initial state.

**When to use:** Every consultation where the patient has a saved profile.

**Example:**

```typescript
// In /api/consult/route.ts, before streamConsultation() call
const patient = await prisma.patient.findUnique({
  where: { id: patientId },
  select: { knownConditions: true, medications: true, age: true, gender: true },
});

const patientContext = patient
  ? `Patient profile: Age ${patient.age}, ${patient.gender}. Known conditions: ${patient.knownConditions}. Current medications: ${patient.medications}.`
  : "";

// Pass into streamConsultation
for await (const event of streamConsultation(
  symptoms,
  sessionId,
  consultationId,
  patientContext,
)) {
  // ...
}
```

### Anti-Patterns to Avoid

- **Polling for care team status:** Never use `setInterval` or React Query polling for DASH-04 — use Supabase Realtime exclusively.
- **Storing Care Summary as concatenated string:** The existing `Consultation.recommendation` is `TEXT`. Phase 2 must change it to JSONB to preserve structured data for Care Summary display and Phase 4 analytics.
- **Creating a new auth system:** Do not build custom JWT or session logic. Use `@supabase/ssr` with the existing Supabase project.
- **Importing `agentRegistry` in client components:** `agentRegistry` imports LangChain code with server-side dependencies. Create a separate `care-team-config.ts` with just the display data (name, emoji, specialty, description) for client-side use.
- **Calling `llm.stream()` from a client component:** All LLM calls stay server-side in Route Handlers.

---

## Don't Hand-Roll

| Problem                 | Don't Build                           | Use Instead                                                | Why                                                                |
| ----------------------- | ------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Real-time DB updates    | `setInterval` + re-fetch              | Supabase `.channel().on('postgres_changes')`               | Built-in WebSocket management, filter support, automatic reconnect |
| Multi-step form state   | Custom context + localStorage         | URL query params + Next.js `useSearchParams`               | URL is shareable, survives refresh, no serialization bugs          |
| Auth session management | Custom JWT cookies                    | `@supabase/ssr` `createServerClient`                       | Handles cookie rotation, PKCE, refresh tokens                      |
| Agent avatar images     | File upload + CDN                     | Generated SVG initials or emoji from `agentRegistry.emoji` | Zero infra, consistent rendering, no upload flow                   |
| SSE reconnection        | Custom `EventSource` with retry logic | Browser native `EventSource` API (auto-reconnects)         | Browser handles reconnect natively                                 |
| Care Summary structure  | Free text concatenation               | `CareRecommendation` type serialized to JSONB              | Already typed, already structured — just persist it                |

**Key insight:** The existing codebase has all the hard pieces. Phase 2 is assembly + augmentation, not greenfield. Resist the urge to replace working patterns.

---

## Common Pitfalls

### Pitfall 1: `agentRegistry` Cannot Be Imported in Client Components

**What goes wrong:** `agentRegistry` imports agent definition files which import `AGENT_COMPLIANCE_RULE` from `@/lib/compliance`, which is fine, but they also use `createModel()` from `@/lib/ai/config` indirectly. More critically, any future Node.js-only code in agent files will break the client bundle.
**Why it happens:** Next.js App Router bundles client components separately; server-only imports cause build errors.
**How to avoid:** Create `src/lib/care-team-config.ts` — a pure data file with just `{ name, emoji, description, specialties, avatar }` for each agent. Import this in all client components. `agentRegistry` stays server-only.
**Warning signs:** Build error `Module not found: Can't resolve 'fs'` or similar Node.js built-in errors in client bundle.

### Pitfall 2: Supabase Realtime Requires `REPLICA IDENTITY FULL`

**What goes wrong:** The Realtime `postgres_changes` listener silently receives no events even though the subscription appears active.
**Why it happens:** By default Postgres only logs the primary key in WAL for UPDATE events. Supabase Realtime needs the full row diff.
**How to avoid:** Add to the migration for any table used with Realtime: `ALTER TABLE "CareTeamStatus" REPLICA IDENTITY FULL;`
**Warning signs:** Subscription `.subscribe()` returns `SUBSCRIBED` but `on('postgres_changes', ...)` callback never fires on UPDATE.

### Pitfall 3: LangGraph `.stream()` is Node-Level, Not Token-Level

**What goes wrong:** Using `graph.stream(initialState)` yields one object per completed node (e.g., the entire GP response appears at once), not individual tokens. The patient sees chunks appear node-by-node rather than word-by-word.
**Why it happens:** LangGraph's default stream mode emits state snapshots after each node completes, not token streams from within nodes.
**How to avoid:** For token-level streaming, use `streamMode: 'messages'` in LangGraph v0.2+ which streams LLM message tokens. Check if `@langchain/langgraph` 1.1.2 supports this:

```typescript
for await (const chunk of await graph.stream(initialState, {
  ...streamConfig,
  streamMode: "messages",
})) {
  // chunk is [AIMessageChunk, metadata]
}
```

If `streamMode: 'messages'` is not available in 1.1.2, fall back to node-level streaming (each full agent response appears progressively, not word-by-word) — this still satisfies CONS-02 meaningfully and is an acceptable Phase 2 tradeoff.
**Warning signs:** All text from one agent appears simultaneously rather than progressively.

### Pitfall 4: `/api/patient/consent` POST Does Not Exist Yet

**What goes wrong:** The `/consent` page posts to `/api/patient/consent` (see consent page source) but this route was explicitly marked as Phase 2 to implement (Phase 1 STATE.md: "Phase 2 will implement consent record creation endpoint").
**Why it happens:** Phase 1 built the UI and schema but deferred the API endpoint.
**How to avoid:** Plan 02-01 must create `src/app/api/patient/consent/route.ts` as its first task. Until this exists, the entire consent flow is broken.
**Warning signs:** Onboarding Step 2 throws 404 on form submit.

### Pitfall 5: Auth Transition — `x-patient-id` Header Must Be Replaced

**What goes wrong:** All Phase 1 API routes use `request.headers.get("x-patient-id")` for identity. If Phase 2 adds Supabase Auth sessions but doesn't update these routes, the consent endpoint, journal endpoint, and care status endpoint will have inconsistent auth patterns.
**Why it happens:** Phase 1 intentionally deferred auth migration to Phase 2 ("TODO: Phase 2 will replace with Supabase Auth session").
**How to avoid:** Implement `@supabase/ssr` session reading in a shared `getSession(request)` helper early in Phase 2 (Plan 02-01). All new routes use this helper. Existing routes can be updated incrementally in the same plan wave.
**Warning signs:** New routes work but existing routes (export, delete) break after auth migration.

### Pitfall 6: `Consultation.recommendation` is TEXT, Not JSONB

**What goes wrong:** The `CareRecommendation` object is serialized to a string somewhere before saving (or not saved at all in current code). Attempting to display structured Care Summary fields will require fragile JSON.parse.
**Why it happens:** Original schema used `TEXT` for the recommendation field.
**How to avoid:** Migration in Plan 02-04 must `ALTER TABLE "Consultation" ALTER COLUMN "recommendation" TYPE JSONB USING recommendation::jsonb`. Then update Prisma schema to `Json @db.JsonB`.
**Warning signs:** `JSON.parse(consultation.recommendation)` throws or returns inconsistent structure.

---

## Code Examples

Verified patterns from codebase inspection and Supabase documentation:

### Existing SSE Stream Pattern (from `/api/consult/route.ts`)

```typescript
// Existing — works, extend this, don't replace
const readable = new ReadableStream({
  async start(controller) {
    for await (const event of streamConsultation(symptoms)) {
      const data = JSON.stringify(event) + "\n";
      controller.enqueue(encoder.encode(`data: ${data}\n`));
    }
    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    controller.close();
  },
});
return new Response(readable, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
});
```

### Supabase Realtime Channel Setup (DASH-04)

```typescript
// Source: @supabase/supabase-js v2 docs — Postgres Changes
// Create in src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Usage in CareTeamCard.tsx
const channel = supabase
  .channel(`care-status-${patientId}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "CareTeamStatus",
      filter: `patientId=eq.${patientId}`,
    },
    (payload) => {
      setCareStatuses((prev) => updateStatus(prev, payload.new));
    },
  )
  .subscribe();
```

### Onboarding Data Shape (for Prisma schema migration)

```typescript
// New fields to add to Patient model
model Patient {
  // ... existing fields ...
  dateOfBirth     DateTime?
  medications     String?    // comma-separated or JSONB array
  allergies       String?
  emergencyContact Json?     @db.JsonB  // { name, phone, relationship }
  gpDetails        Json?     @db.JsonB  // { name, practice, phone }
  onboardingComplete Boolean @default(false)
}

model SymptomJournal {
  id          String   @id @default(cuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  severity    Int      // 1-5
  notes       String?
  createdAt   DateTime @default(now())
}

model CareTeamStatus {
  id          String   @id @default(cuid())
  patientId   String   @unique
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  statuses    Json     @db.JsonB  // { "gp": { message, updatedAt }, "cardiology": {...} }
  updatedAt   DateTime @updatedAt
}
```

### Agent Display Config (client-safe, no LangChain imports)

```typescript
// src/lib/care-team-config.ts — safe for client components
export const CARE_TEAM = [
  {
    role: "gp",
    name: "Alex AI — GP",
    emoji: "👨‍⚕️",
    specialty: "General Practice",
    bio: "I'm here to help with your overall health and coordinate your care.",
  },
  {
    role: "cardiology",
    name: "Sarah AI — Cardiology",
    emoji: "❤️",
    specialty: "Cardiology",
    bio: "I specialise in heart health and cardiovascular concerns.",
  },
  {
    role: "mental_health",
    name: "Maya AI — Mental Health",
    emoji: "🧠",
    specialty: "Mental Health",
    bio: "I'm here to support your mental wellbeing and emotional health.",
  },
  {
    role: "dermatology",
    name: "Priya AI — Dermatology",
    emoji: "🌿",
    specialty: "Dermatology",
    bio: "I focus on skin health, rashes, and dermatological concerns.",
  },
  {
    role: "orthopedic",
    name: "James AI — Orthopedic",
    emoji: "🦴",
    specialty: "Orthopedics",
    bio: "I help with joint, bone, and musculoskeletal issues.",
  },
  {
    role: "gastro",
    name: "Chen AI — Gastroenterology",
    emoji: "🫃",
    specialty: "Gastroenterology",
    bio: "I specialise in digestive health and gastrointestinal concerns.",
  },
  {
    role: "physiotherapy",
    name: "Emma AI — Physiotherapy",
    emoji: "🏃",
    specialty: "Physiotherapy",
    bio: "I help with movement, rehabilitation, and physical recovery.",
  },
  {
    role: "triage",
    name: "Triage AI",
    emoji: "🚦",
    specialty: "Triage",
    bio: "I assess your symptoms and route you to the right specialist.",
  },
] as const;
```

### Care Summary Component Structure (CONS-04)

```typescript
// Uses AHPRA_DISCLAIMER from existing compliance.ts
import { AHPRA_DISCLAIMER } from '@/lib/compliance';
import { CareRecommendation } from '@/agents/types';

export function CareSummary({ recommendation }: { recommendation: CareRecommendation }) {
  return (
    <div>
      <Badge variant={urgencyVariant(recommendation.urgency)}>{recommendation.urgency}</Badge>
      <p>{recommendation.summary}</p>
      <ul>{recommendation.nextSteps.map(s => <li key={s}>{s}</li>)}</ul>
      <p>See within: {recommendation.timeframe}</p>
      <p className="text-xs text-muted-foreground">{AHPRA_DISCLAIMER}</p>
    </div>
  );
}
```

---

## State of the Art

| Old Approach                    | Current Approach                                         | When Changed              | Impact                                                                                      |
| ------------------------------- | -------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| Supabase client-side only       | `@supabase/ssr` for Next.js App Router server components | Supabase v2 / Next.js 13+ | Must use `createServerClient` in Route Handlers, `createBrowserClient` in Client Components |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr`                                          | 2024                      | `auth-helpers-nextjs` is deprecated; `@supabase/ssr` is the current official package        |
| LangGraph `streamMode` default  | `streamMode: 'messages'` for token streaming             | LangGraph v0.2+           | Enables token-level streaming without custom node architecture                              |
| Prisma `@db.Json`               | `@db.JsonB` for JSONB columns                            | Prisma v5+                | `JsonB` is explicit; use for all new structured fields                                      |

**Deprecated/outdated:**

- `@supabase/auth-helpers-nextjs`: deprecated, replaced by `@supabase/ssr`
- `EventSource` polyfills: not needed in modern Next.js — native `EventSource` works in all target browsers

---

## Open Questions

1. **LangGraph `streamMode: 'messages'` support in v1.1.2**
   - What we know: LangGraph JS v1.x is a major version; `streamMode: 'messages'` exists in Python LangGraph but JS API may differ
   - What's unclear: Whether token-level streaming is possible without restructuring agent nodes as generators
   - Recommendation: Plan 02-03 should start with node-level streaming (which works today), then attempt `streamMode: 'messages'` upgrade — CONS-02 is satisfied by node-level streaming, token-level is an enhancement

2. **Supabase Auth vs existing custom auth**
   - What we know: Phase 1 uses email stored in `localStorage` + `x-patient-id` header; this is not production auth
   - What's unclear: Whether full Supabase Auth migration (with existing Patient records) needs a user migration step or just adding Supabase Auth users alongside existing Patient rows
   - Recommendation: New patients created during onboarding use Supabase Auth from the start; existing dev/test patients can continue using header-based auth for local dev. A `supabaseUserId` field on `Patient` links the auth identity.

3. **`CareTeamStatus` update trigger — who writes it?**
   - What we know: DASH-04 requires care team status to update within 2 seconds of agent activity
   - What's unclear: At what point does agent activity write to `CareTeamStatus`? End of consultation? After each node?
   - Recommendation: Write to `CareTeamStatus` at the end of each consultation in `/api/consult/route.ts` after the stream completes — this triggers the Realtime event. For Phase 2, this is sufficient. Phase 3 can add finer-grained updates.

---

## Validation Architecture

### Test Framework

| Property           | Value                                                             |
| ------------------ | ----------------------------------------------------------------- |
| Framework          | vitest 4.1.1                                                      |
| Config file        | `vitest.config.ts` (root)                                         |
| Quick run command  | `bun test`                                                        |
| Full suite command | `bun test` (runs all files matching `src/__tests__/**/*.test.ts`) |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                                    | Test Type | Automated Command                                                 | File Exists? |
| ------- | --------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------- | ------------ |
| ONBD-01 | Medical history form saves all required fields to DB                        | unit      | `bun test src/__tests__/api/patient-onboarding.test.ts`           | Wave 0       |
| ONBD-02 | Consent step integrates correctly — POST to `/api/patient/consent` succeeds | unit      | `bun test src/__tests__/api/patient-consent-api.test.ts`          | Wave 0       |
| ONBD-03 | All 8 agents present in CARE_TEAM config with required display fields       | unit      | `bun test src/__tests__/onboarding/care-team-config.test.ts`      | Wave 0       |
| DASH-01 | CareTeamStatus row created/updated after consultation                       | unit      | `bun test src/__tests__/api/care-team-status.test.ts`             | Wave 0       |
| DASH-03 | Consultation history includes urgency level and agent names                 | unit      | `bun test src/__tests__/api/consultation-history.test.ts`         | Wave 0       |
| DASH-04 | Realtime subscription setup does not throw                                  | unit      | `bun test src/__tests__/lib/supabase-realtime.test.ts`            | Wave 0       |
| CONS-01 | Each SSE event includes `agentName` and `agentRole` fields                  | unit      | `bun test src/__tests__/api/consult-stream-identity.test.ts`      | Wave 0       |
| CONS-04 | Care Summary contains urgency, nextSteps, timeframe, and AHPRA disclaimer   | unit      | `bun test src/__tests__/components/care-summary.test.ts`          | Wave 0       |
| PROF-01 | Patient profile page renders conditions, medications, allergies             | manual    | n/a — visual verification                                         | manual-only  |
| PROF-02 | Patient context injected into consultation initial state                    | unit      | `bun test src/__tests__/agents/profile-context-injection.test.ts` | Wave 0       |
| PROF-03 | Symptom journal POST saves severity + notes; GET returns entries            | unit      | `bun test src/__tests__/api/symptom-journal.test.ts`              | Wave 0       |
| DASH-02 | Active care plan card renders without errors                                | manual    | n/a — basic static card                                           | manual-only  |
| CONS-02 | SSE stream produces multiple events (not single all-at-once)                | unit      | `bun test src/__tests__/api/consult-stream-events.test.ts`        | Wave 0       |
| CONS-03 | Routing event emitted after triage with specialist names                    | unit      | included in `consult-stream-identity.test.ts`                     | Wave 0       |

### Sampling Rate

- **Per task commit:** `bun test src/__tests__/api/ src/__tests__/agents/`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/api/patient-onboarding.test.ts` — covers ONBD-01
- [ ] `src/__tests__/api/patient-consent-api.test.ts` — covers ONBD-02
- [ ] `src/__tests__/onboarding/care-team-config.test.ts` — covers ONBD-03
- [ ] `src/__tests__/api/care-team-status.test.ts` — covers DASH-01
- [ ] `src/__tests__/api/consultation-history.test.ts` — covers DASH-03
- [ ] `src/__tests__/lib/supabase-realtime.test.ts` — covers DASH-04
- [ ] `src/__tests__/api/consult-stream-identity.test.ts` — covers CONS-01, CONS-03
- [ ] `src/__tests__/components/care-summary.test.ts` — covers CONS-04
- [ ] `src/__tests__/agents/profile-context-injection.test.ts` — covers PROF-02
- [ ] `src/__tests__/api/symptom-journal.test.ts` — covers PROF-03
- [ ] `src/__tests__/api/consult-stream-events.test.ts` — covers CONS-02
- [ ] New migration file for Phase 2 schema changes (DOB, medications, emergencyContact, gpDetails, allergies, onboardingComplete on Patient; new SymptomJournal model; new CareTeamStatus model; recommendation column type change)

---

## Sources

### Primary (HIGH confidence)

- Codebase inspection: `src/agents/orchestrator.ts`, `src/agents/definitions/`, `src/lib/compliance.ts`, `src/lib/emergency-rules.ts`, `src/lib/consent-check.ts`, `src/app/api/consult/route.ts`, `src/app/consent/page.tsx`, `src/app/patient/page.tsx`, `prisma/schema.prisma`, `package.json`, `vitest.config.ts`
- Phase 1 CONTEXT.md — all Phase 1 decisions that constrain Phase 2
- `@supabase/supabase-js` v2.100.0 — installed and confirmed; Realtime API stable
- `@langchain/langgraph` v1.1.2 — installed; `.stream()` method confirmed in codebase

### Secondary (MEDIUM confidence)

- Supabase Realtime `postgres_changes` pattern — standard documented API, `REPLICA IDENTITY FULL` requirement is official Supabase documentation
- `@supabase/ssr` replacing `@supabase/auth-helpers-nextjs` — confirmed deprecated in Supabase changelog circa 2024
- LangGraph `streamMode: 'messages'` — exists in LangGraph docs but JS v1.x exact API needs verification during implementation

### Tertiary (LOW confidence)

- LangGraph JS v1.1.2 `streamMode: 'messages'` availability — not verified against installed package source; treat as needing runtime validation in Plan 02-03

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already installed and in use; only `@supabase/ssr` is new
- Architecture: HIGH — patterns derived from direct codebase inspection
- Pitfalls: HIGH — 5 of 6 pitfalls identified from direct code reading (not hypothetical); Pitfall 3 LangGraph streaming is MEDIUM (version-dependent)
- Validation architecture: HIGH — existing vitest infrastructure confirmed; test files are new but the framework is ready

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable libraries; Supabase Realtime API is stable; LangGraph JS moves quickly — re-check if version is bumped)

# Phase 1: Foundation + Compliance - Research

**Researched:** 2026-03-26
**Domain:** Supabase PostgreSQL migration, RLS, LangGraph checkpointing, Inngest, AHPRA compliance, Privacy Act consent
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Keep existing custom auth (email/password via Prisma) for Phase 1 — migrating to Supabase Auth is Phase 2 scope.
- Two connection strings: `DATABASE_URL` = pooled (Supabase pgBouncer) for app queries, `DIRECT_URL` = direct connection for Prisma migrations. Both required.
- Supabase project region: `ap-southeast-2` (Sydney) — set at project creation, cannot be changed later.
- RLS policy pattern: `auth.uid() = patient_id` for patient tables, service role bypass for server-side agent writes.
- SQLite dev.db remains for local development via `DATABASE_URL=file:./dev.db` in `.env.local` — production uses Supabase.
- Agent naming format: `"Alex AI — GP"` — all 8 agent names updated. No bare "Dr." prefix.
- AHPRA disclaimer placement: appended to every Care Summary + static banner on consultation page header. Not per-message.
- Approved disclaimer text: _"Medicrew provides health information, not medical diagnosis or advice. Always consult a registered healthcare professional for medical concerns. In an emergency, call 000."_
- Agent system prompts: additional rule — never output "you have [condition]", always "this may be consistent with" or "worth discussing with a doctor."
- Emergency engine location: `/lib/emergency-rules.ts` — pure function `detectEmergency(text: string): EmergencyResult`, called in `/api/consultation` **before** LangGraph.
- Emergency detection: deterministic keyword/phrase matching only — no LLM.
- `PatientConsent` table: `patientId`, `consentedAt`, `consentVersion`, `dataCategories` JSONB.
- Consent gate: `/api/consultation` checks consent before processing. If missing → 403 + redirect to `/consent`.
- Consent page: `/consent` — three checkboxes (health data collection, AI guidance, overseas processing). All required.
- Data export: `GET /api/patient/export` — JSON of Patient, Consultation, Notification, PatientConsent records.
- Account deletion: `DELETE /api/patient` — anonymises email to `deleted-{id}@medicrew.au`, marks inactive. Soft delete, 30-day grace period.
- LangGraph checkpointer: `@langchain/langgraph-checkpoint-postgres` — `thread_id = consultation-{consultationId}`. Exit-mode checkpointing only.
- Inngest: API route at `/api/inngest`. Inngest Dev Server for local, Inngest Cloud for production. Phase 1 is setup only.
- 90-day checkpoint cleanup: `pg_cron` job in migration SQL.

### Claude's Discretion

- Specific Supabase RLS policy syntax for the `Notification` table (doctor vs patient access patterns).
- Exact migration file naming and ordering.
- Whether to use Prisma's `@db.Json` type or raw `jsonb` for consent data categories field.

### Deferred Ideas (OUT OF SCOPE)

- Supabase Auth migration (magic links, OAuth) — Phase 2.
- LLM provider DPA documentation for OpenAI/Groq — pre-launch compliance task.
- TGA SaMD classification assessment — must be commissioned before public launch.
- NSW HRIP Act review — post-launch legal review.
  </user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                                       | Research Support                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| COMP-01  | Every agent response includes AHPRA-compliant scope-of-practice disclaimer                        | Disclaimer text locked; appended to Care Summary + header banner; agent system prompt rules documented    |
| COMP-02  | AI agents identified as AI — "Alex AI — GP" format, never bare "Dr."                              | All 8 agent `name` fields identified in `src/agents/definitions/`; naming pattern confirmed AHPRA-safe    |
| COMP-03  | Emergency signals trigger deterministic keyword detection before LLM, with mandatory 000 referral | Pure function pattern at `/lib/emergency-rules.ts`; keywords list in architecture section                 |
| COMP-04  | Onboarding includes explicit consent for data collection, AI guidance, overseas LLM processing    | PatientConsent table design + three-checkbox consent page; consent gate pattern                           |
| COMP-05  | Patient can export data (APP 12) and request account deletion with full cascade                   | GET /api/patient/export + DELETE /api/patient soft-delete with 30-day grace; APP 12 obligations confirmed |
| COMP-06  | Supabase locked to ap-southeast-2 (Sydney) for Privacy Act APP 8 compliance                       | Region selection is project-creation time; non-reversible; confirmed as hard gate                         |
| INFRA-01 | SQLite replaced with Supabase PostgreSQL — all Prisma models migrated                             | Prisma datasource config, DATABASE_URL + DIRECT_URL pattern, migration commands documented                |
| INFRA-02 | Supabase RLS enabled — patients can only read/write their own records                             | RLS SQL patterns documented; custom-auth workaround via Prisma + service role confirmed                   |
| INFRA-03 | @langchain/langgraph-checkpoint-postgres installed as consultation thread checkpointer            | Package 1.0.1 confirmed; fromConnString + setup() pattern; thread_id convention documented                |
| INFRA-04 | Inngest configured for durable background job execution                                           | Package 4.1.0 confirmed; Next.js App Router serve handler pattern documented                              |

</phase_requirements>

---

## Summary

Phase 1 builds the non-negotiable compliance and infrastructure foundation for Medicrew. The core challenge is that the existing codebase uses SQLite + Prisma with no authentication enforcement, no RLS, and no compliance layer — all of which must be in place before any real patient data can be processed.

The Supabase migration is the highest-risk piece: Prisma with Supabase requires a split connection strategy (pooled vs direct) that is well-documented and verified. The critical pitfall is that the existing `auth.uid()` RLS pattern requires Supabase Auth to populate that function — since Phase 1 keeps custom email/password auth, all server-side Prisma writes must use the service role key (which bypasses RLS), and RLS is enforced only for Supabase JS client calls. This is a deliberate trade-off that the Phase 2 Supabase Auth migration will resolve.

The AHPRA compliance work (renaming 8 agents, adding system prompt rules, appending disclaimer to Care Summaries, adding header banner) and the emergency rules engine are pure TypeScript changes with no external dependencies and carry LOW implementation risk. The Privacy Act consent flow adds a new `PatientConsent` table and two new API routes.

**Primary recommendation:** Sequence migration (Supabase + Prisma) first as the blocking dependency, then compliance layer (agent names + emergency rules), then consent flow (table + gate + routes).

---

## Standard Stack

### Core

| Library                                    | Version | Purpose                                                                    | Why Standard                                                                               |
| ------------------------------------------ | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `@supabase/supabase-js`                    | 2.100.0 | Supabase client (JS) for Realtime + Storage; not needed for Prisma queries | Official client; needed for RLS-aware client-side calls and Realtime in later phases       |
| `prisma`                                   | 7.5.0   | Schema management + migrations + Prisma Client                             | Already in codebase; PostgreSQL provider swap is a datasource change only                  |
| `@prisma/client`                           | 7.5.0   | Database access                                                            | Already used everywhere                                                                    |
| `@langchain/langgraph-checkpoint-postgres` | 1.0.1   | PostgreSQL-backed consultation thread checkpointing                        | Official LangGraph checkpoint adapter; compatible with existing @langchain/langgraph 1.1.2 |
| `inngest`                                  | 4.1.0   | Durable background job execution                                           | Official SDK; Next.js App Router native; zero-infra                                        |

### Supporting

| Library              | Version  | Purpose                                              | When to Use                                                |
| -------------------- | -------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| `pg` (node-postgres) | peer dep | Required by @langchain/langgraph-checkpoint-postgres | Install only if not already pulled in as a peer dependency |
| `@types/pg`          | peer dep | TypeScript types for pg                              | Install alongside pg                                       |

### Alternatives Considered

| Instead of                            | Could Use                       | Tradeoff                                                                                                |
| ------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Inngest                               | BullMQ + Redis                  | Inngest is zero-infra (no Redis), has a Dev Server UI, and Supabase doesn't include Redis               |
| pg_cron (migration SQL)               | Inngest scheduled function      | pg_cron runs inside Postgres — simpler for a 1-liner DELETE; Inngest adds complexity for a cleanup task |
| Prisma soft delete via nullable field | `prisma-soft-delete-middleware` | Manual `deletedAt` field is simpler and avoids a dependency for a single model                          |

**Installation:**

```bash
bun add @supabase/supabase-js @langchain/langgraph-checkpoint-postgres inngest pg @types/pg
```

**Version verification (confirmed 2026-03-26):**

- `@supabase/supabase-js`: 2.100.0 (published 2026-03-23)
- `prisma`: 7.5.0 (published 2026-03-25)
- `@langchain/langgraph-checkpoint-postgres`: 1.0.1 (published 2026-02-19)
- `inngest`: 4.1.0 (published 2026-03-25)

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── server.ts          # createServerClient() — service role, bypasses RLS
│   │   └── client.ts          # createBrowserClient() — for Phase 2 Supabase Auth
│   ├── prisma.ts              # existing singleton (update for Postgres)
│   ├── emergency-rules.ts     # NEW: detectEmergency() pure function
│   └── consent-check.ts       # NEW: checkConsent() for consultation gate
├── inngest/
│   ├── client.ts              # Inngest client singleton
│   └── functions/             # Phase 3 will add functions here
├── app/
│   ├── api/
│   │   ├── inngest/
│   │   │   └── route.ts       # serve handler (GET, POST, PUT)
│   │   ├── patient/
│   │   │   ├── export/
│   │   │   │   └── route.ts   # GET /api/patient/export
│   │   │   └── route.ts       # DELETE /api/patient (soft delete)
│   │   └── consult/
│   │       └── route.ts       # existing — add emergency + consent gates
│   └── consent/
│       └── page.tsx           # /consent page — three-checkbox consent form
prisma/
├── schema.prisma              # update provider to postgresql, add PatientConsent
└── migrations/
    └── 0001_supabase_init/
        └── migration.sql      # initial migration + RLS + pg_cron
```

### Pattern 1: Prisma + Supabase Connection Split

**What:** Use two connection strings — pooled for runtime queries, direct for migrations.

**When to use:** Always when Prisma is used with Supabase pgBouncer.

```prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

```bash
# .env (production — set in deployment environment)
DATABASE_URL="postgres://prisma.[PROJECT-REF]:[PASSWORD]@[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://prisma.[PROJECT-REF]:[PASSWORD]@[REGION].pooler.supabase.com:5432/postgres"

# .env.local (local dev — SQLite override)
DATABASE_URL="file:./dev.db"
# DIRECT_URL not needed for SQLite
```

**Critical:** Prisma migrations (`bun prisma migrate deploy`) always use `DIRECT_URL`. Failing to set this causes DDL failures through pgBouncer.

### Pattern 2: RLS — Custom Auth Workaround (Phase 1)

**What:** Since Phase 1 keeps custom auth (not Supabase Auth), `auth.uid()` will not be populated. Server-side Prisma uses the database URL directly, which means RLS is enforced by role, not by user identity. Service role bypasses RLS for agent writes.

**When to use:** All server-side Prisma operations in Phase 1.

**Phase 1 RLS strategy:**

- Enable RLS on all tables (required by INFRA-02)
- Create RLS policies using `auth.uid()` patterns (ready for Phase 2 Supabase Auth)
- All Phase 1 server-side writes go through Prisma with the direct Postgres role → bypasses RLS by design
- This is acceptable because all API routes are auth-gated at the application layer (patient session check)
- Phase 2 Supabase Auth migration will activate the RLS policies

```sql
-- Source: Supabase official RLS docs
-- Enable RLS on Patient table
alter table "Patient" enable row level security;

-- Policy: patients can only view their own record (activates when Supabase Auth is live in Phase 2)
create policy "patient_self_read"
  on "Patient" for select
  to authenticated
  using ((select auth.uid()::text) = id);

-- Service role bypass is automatic — no explicit policy needed
-- supabaseServiceClient (initialized with service_role key) always bypasses RLS
```

**Notification table (Claude's discretion):** Recommend two policies:

- `patient_read_own`: `using (patient_id = auth.uid()::text)` for SELECT
- `service_insert`: granted to service_role for INSERT (agent writes)

### Pattern 3: PostgresSaver Integration

**What:** Wrap the existing `createConsultationGraph()` compilation to accept a checkpointer.

**When to use:** In the `/api/consult` route when processing a consultation with a known `consultationId`.

```typescript
// Source: LangGraph JS official reference
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

// Module-level setup (called once, not per request)
let checkpointer: PostgresSaver | null = null;

async function getCheckpointer(): Promise<PostgresSaver> {
  if (!checkpointer) {
    checkpointer = PostgresSaver.fromConnString(
      process.env.DIRECT_URL!, // Use direct URL — not pgBouncer pooled
      { schema: "langgraph" }, // Use dedicated schema to avoid table name conflicts
    );
    await checkpointer.setup(); // Idempotent — safe to call multiple times
  }
  return checkpointer;
}

// In the graph compilation
export async function createConsultationGraph(consultationId: string) {
  const cp = await getCheckpointer();
  const graph = new StateGraph(ConsultationAnnotation)
    /* ... existing nodes and edges ... */
    .compile({ checkpointer: cp });

  return graph;
}

// Invoke with thread config
const config = {
  configurable: { thread_id: `consultation-${consultationId}` },
};
await graph.invoke(initialState, config);
```

**Important:** Use `DIRECT_URL` (not the pgBouncer pooled URL) for the PostgresSaver connection — pgBouncer can cause issues with the persistent connection that PostgresSaver maintains.

### Pattern 4: Emergency Rules Engine

**What:** Pure, synchronous function called before any LangGraph invocation.

**When to use:** At the top of the `/api/consult` POST handler, before `streamConsultation()`.

```typescript
// src/lib/emergency-rules.ts
export interface EmergencyResult {
  isEmergency: boolean;
  category:
    | "cardiac"
    | "stroke"
    | "suicide"
    | "respiratory"
    | "bleeding"
    | "overdose"
    | null;
  response: {
    urgency: "emergency";
    message: string;
    callToAction: "000";
    additionalLine?: string; // e.g. Lifeline for suicide
  } | null;
}

const EMERGENCY_PATTERNS: Array<{
  regex: RegExp;
  category: EmergencyResult["category"];
  addLifeline?: boolean;
}> = [
  { regex: /chest pain|heart attack|myocardial/i, category: "cardiac" },
  {
    regex: /stroke|FAST|face drooping|arm weak|speech slurred/i,
    category: "stroke",
  },
  {
    regex: /suicid|want to (kill|harm) (my|them)self|self.harm/i,
    category: "suicide",
    addLifeline: true,
  },
  {
    regex: /can't breathe|difficulty breathing|choking/i,
    category: "respiratory",
  },
  { regex: /severe bleeding|uncontrolled bleeding/i, category: "bleeding" },
  { regex: /overdose|took too many|poisoning/i, category: "overdose" },
  { regex: /unconscious|not breathing|no pulse/i, category: "cardiac" },
  { regex: /call 000|anaphylaxis|severe allergic/i, category: "cardiac" },
];

export function detectEmergency(text: string): EmergencyResult {
  for (const { regex, category, addLifeline } of EMERGENCY_PATTERNS) {
    if (regex.test(text)) {
      return {
        isEmergency: true,
        category,
        response: {
          urgency: "emergency",
          message:
            "This sounds like a medical emergency. Please call 000 immediately or go to your nearest emergency department.",
          callToAction: "000",
          additionalLine: addLifeline
            ? "Lifeline: 13 11 14 (available 24/7)"
            : undefined,
        },
      };
    }
  }
  return { isEmergency: false, category: null, response: null };
}
```

### Pattern 5: Consent Gate

**What:** Check PatientConsent record exists before forwarding to LangGraph.

```typescript
// src/lib/consent-check.ts
import { prisma } from "@/lib/prisma";

export async function checkConsent(patientId: string): Promise<boolean> {
  const consent = await prisma.patientConsent.findFirst({
    where: {
      patientId,
      consentVersion: "1.0",
    },
  });
  return consent !== null;
}
```

```typescript
// In /api/consult/route.ts — before streamConsultation()
const hasConsent = await checkConsent(patientId);
if (!hasConsent) {
  return NextResponse.json(
    { error: "Consent required", redirectTo: "/consent" },
    { status: 403 },
  );
}

const emergency = detectEmergency(symptoms);
if (emergency.isEmergency) {
  return NextResponse.json(emergency.response, { status: 200 });
}

// Only now invoke LangGraph
```

### Pattern 6: Inngest Client + Route Handler

```typescript
// src/inngest/client.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "medicrew" });
```

```typescript
// src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
// Phase 1: no functions yet — functions array will be populated in Phase 3
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [],
});
```

### Pattern 7: Soft Delete (Account Deletion)

```prisma
// schema.prisma additions to Patient model
deletedAt     DateTime?   // null = active; set = soft-deleted
gracePeriodEnds DateTime? // 30 days after deletedAt
isActive      Boolean     @default(true)
```

```typescript
// DELETE /api/patient — soft delete with anonymisation
await prisma.patient.update({
  where: { id: patientId },
  data: {
    email: `deleted-${patientId}@medicrew.au`,
    name: "Deleted User",
    deletedAt: new Date(),
    gracePeriodEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: false,
  },
});
```

### Pattern 8: pg_cron Checkpoint Cleanup (Migration SQL)

```sql
-- In a Supabase migration file — runs once on deploy
create extension if not exists pg_cron;

-- Schedule daily cleanup of LangGraph checkpoints older than 90 days
-- Note: pg_cron jobs belong to the 'postgres' role in Supabase
select cron.schedule(
  'cleanup-old-checkpoints',
  '0 3 * * *',
  $$DELETE FROM langgraph.checkpoints WHERE created_at < NOW() - INTERVAL '90 days'$$
);
```

### Anti-Patterns to Avoid

- **Calling `PostgresSaver.setup()` on every request:** It is idempotent but creates unnecessary DB round-trips. Initialize once at module level.
- **Using pooled DATABASE_URL for PostgresSaver:** pgBouncer in transaction mode breaks the persistent connection PostgresSaver maintains. Use `DIRECT_URL`.
- **LLM-based emergency detection:** Any LLM call can hallucinate, time out, or fail. Emergency detection MUST be deterministic regex before any LLM call.
- **Injecting disclaimer per-message:** AHPRA guidance requires disclosure, not noise. Disclaimer on Care Summary + header banner is sufficient and less disruptive.
- **Setting `DATABASE_URL` to direct connection in production:** Direct connections are limited on Supabase. Use pgBouncer pooled URL for runtime.
- **Forgetting `?pgbouncer=true` query param on pooled URL:** Without it, Prisma may use prepared statements which pgBouncer in transaction mode does not support.

---

## Don't Hand-Roll

| Problem                           | Don't Build                          | Use Instead                                        | Why                                                                                            |
| --------------------------------- | ------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Consultation thread checkpointing | Custom checkpoint table + ORM logic  | `@langchain/langgraph-checkpoint-postgres`         | Handles concurrent writes, list/get/put semantics, thread cleanup; correct schema setup        |
| Background job durability         | `setInterval` or Next.js cron routes | `inngest`                                          | Handles retries, fan-out, scheduling, observability, and works with Vercel's serverless limits |
| Database scheduling               | Application-layer cron job           | `pg_cron` (Supabase extension)                     | Runs in Postgres with zero network latency; survives application restarts                      |
| Connection pooling                | Manual pool management               | Supabase pgBouncer + Prisma `pgbouncer=true` param | Supabase manages pgBouncer; Prisma knows to avoid prepared statements                          |

**Key insight:** The hardest problems in this phase (durable jobs, checkpoint persistence, connection pooling) are already solved by the chosen stack. Resist any impulse to hand-roll solutions because "it seems simpler."

---

## Common Pitfalls

### Pitfall 1: DDL Failures Through pgBouncer

**What goes wrong:** Running `bun prisma migrate deploy` against the pooled `DATABASE_URL` causes `ERROR: prepared statement "s0" already exists` or similar DDL errors.

**Why it happens:** pgBouncer in transaction mode does not support prepared statements; Prisma Schema Engine requires a direct connection for migrations.

**How to avoid:** Set `DIRECT_URL` in the datasource block and confirm it points to port 5432 (not 6543). Prisma CLI uses `directUrl` automatically.

**Warning signs:** Migration hangs or throws "prepared statement" or "connection pool" errors.

### Pitfall 2: `auth.uid()` Returns NULL Before Supabase Auth Is Active

**What goes wrong:** RLS policies using `auth.uid()` evaluate to NULL for all rows when Supabase Auth is not yet set up, effectively blocking all reads.

**Why it happens:** Supabase's `auth.uid()` function reads from the JWT that Supabase Auth populates. Custom JWTs (from our existing email/password system) do not populate this.

**How to avoid:** For Phase 1, ensure all database access goes through Prisma with the service role DB URL (bypasses RLS). Create RLS policies as planned but do NOT rely on them for data enforcement until Phase 2 Supabase Auth is live. Document this explicitly in code comments.

**Warning signs:** Empty result sets from Supabase JS client, or "permission denied" errors when using `anon` role.

### Pitfall 3: PostgresSaver Connection Leak in Next.js Dev Mode

**What goes wrong:** Next.js hot reload in dev mode creates new module instances, leading to orphaned PostgreSQL connections.

**Why it happens:** Module-level singletons are re-initialised on every hot reload.

**How to avoid:** Apply the same `globalThis` singleton pattern already used in `src/lib/prisma.ts`:

```typescript
const globalForCheckpointer = globalThis as unknown as {
  checkpointer?: PostgresSaver;
};
```

**Warning signs:** PostgreSQL "too many connections" error during local development.

### Pitfall 4: Supabase Region Cannot Be Changed Post-Creation

**What goes wrong:** Project created in the wrong region; all patient data is stored outside Australia. Privacy Act APP 8 breach.

**Why it happens:** Region is set at project creation and is permanent.

**How to avoid:** Verify `ap-southeast-2` is selected in Supabase Dashboard before running the first migration. This must be a manual verification step.

**Warning signs:** None at code level — this is a UI/configuration check only.

### Pitfall 5: Inngest Route Missing PUT Handler

**What goes wrong:** Inngest cannot sync functions because the route only exports GET and POST.

**Why it happens:** Next.js App Router requires explicit HTTP method exports; PUT is needed for Inngest function sync.

**How to avoid:** Always export `{ GET, POST, PUT }` from the `serve()` return value.

### Pitfall 6: Emergency Keywords Missing Variant Spellings

**What goes wrong:** Patient types "i want to kill myself" (lowercase) and the regex misses it.

**Why it happens:** Regex case sensitivity.

**How to avoid:** All EMERGENCY_PATTERNS use the `i` flag (case-insensitive). Test with lowercase, mixed case, and common misspellings.

---

## Code Examples

### Prisma Schema — PatientConsent Model + Patient Soft-Delete Fields

```prisma
// Source: Prisma docs + CONTEXT.md decisions
model PatientConsent {
  id              String   @id @default(cuid())
  patientId       String
  patient         Patient  @relation(fields: [patientId], references: [id])
  consentedAt     DateTime @default(now())
  consentVersion  String   @default("1.0")
  dataCategories  Json     // JSONB in PostgreSQL — stores which categories were consented
  createdAt       DateTime @default(now())

  @@index([patientId])
}

// Additions to Patient model:
// deletedAt        DateTime?
// gracePeriodEnds  DateTime?
// isActive         Boolean  @default(true)
```

**Note on `Json` vs `@db.Json`:** Prisma's `Json` type maps to `jsonb` in PostgreSQL by default. The `@db.Json` attribute is not needed and would map to `json` (less efficient). Use plain `Json`.

### Agent Rename — Before and After

```typescript
// BEFORE (src/agents/definitions/gp.ts)
export const gpAgent: AgentDefinition = {
  name: "Dr. Alex (GP)",  // AHPRA-unsafe
  ...
};

// AFTER
export const gpAgent: AgentDefinition = {
  name: "Alex AI — GP",  // AHPRA-safe: clear AI identification
  ...
};
```

All 8 files to update:

- `triage.ts` — e.g., "Triage AI"
- `gp.ts` — "Alex AI — GP"
- `cardiology.ts` — e.g., "Sarah AI — Cardiology"
- `mental-health.ts` — e.g., "Maya AI — Mental Health"
- `dermatology.ts` — e.g., "Jordan AI — Dermatology"
- `orthopedic.ts` — e.g., "Ryan AI — Orthopedics"
- `gastro.ts` — e.g., "Sam AI — Gastroenterology"
- `physiotherapy.ts` — e.g., "Taylor AI — Physiotherapy"
  Plus `agentRegistry.orchestrator.name` in `index.ts`.

### AHPRA System Prompt Addition (per agent)

```typescript
// Append to every agent's systemPrompt in definitions/*.ts
const AHPRA_SYSTEM_PROMPT_SUFFIX = `

## AHPRA Compliance Rules (Non-Negotiable)
- Never output "you have [condition]". Always use "this may be consistent with" or "worth discussing with a doctor".
- Never provide a definitive diagnosis.
- Always recommend consulting a registered healthcare professional for medical concerns.
- You are an AI providing health information, not a registered healthcare practitioner.`;
```

### Care Summary Disclaimer Append

```typescript
// In recommendationNode (orchestrator.ts) — append to summary output
const AHPRA_DISCLAIMER =
  "Medicrew provides health information, not medical diagnosis or advice. Always consult a registered healthcare professional for medical concerns. In an emergency, call 000.";

// Append to recommendation object:
recommendation = {
  ...parsed,
  disclaimer: AHPRA_DISCLAIMER,
};
```

### Data Export Route

```typescript
// GET /api/patient/export
export async function GET(request: NextRequest) {
  // Auth check: extract patientId from session
  const patientId = getPatientIdFromSession(request); // existing auth pattern
  if (!patientId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [patient, consultations, notifications, consents] = await Promise.all([
    prisma.patient.findUnique({ where: { id: patientId } }),
    prisma.consultation.findMany({ where: { patientId } }),
    prisma.notification.findMany({ where: { patientId } }),
    prisma.patientConsent.findMany({ where: { patientId } }),
  ]);

  return NextResponse.json({ patient, consultations, notifications, consents });
}
```

---

## State of the Art

| Old Approach                          | Current Approach                                         | When Changed                                     | Impact                                                      |
| ------------------------------------- | -------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| Prisma with single `DATABASE_URL`     | `DATABASE_URL` (pooled) + `DIRECT_URL` (direct)          | Prisma 5.x + Supabase Supavisor                  | Required for pgBouncer compatibility; DDL fails without it  |
| LangGraph checkpoint stored in memory | PostgresSaver with `thread_id`                           | `@langchain/langgraph-checkpoint-postgres` 1.0.x | Persistence across requests; exit-mode reduces write volume |
| Inngest with `inngest.serve()` (old)  | `serve()` from `inngest/next` with explicit GET/POST/PUT | Inngest v3+                                      | App Router requires named exports                           |
| Bare "Dr." AI persona names           | "Alex AI — GP" format                                    | AHPRA 2024 AI in Healthcare guidance             | Required for advertising compliance                         |

**Deprecated/outdated:**

- `@prisma/adapter-better-sqlite3` (in package.json): Not needed once provider switches to PostgreSQL. Remove from dependencies.
- `better-sqlite3` (in package.json): Not needed in production after migration. Keep for local dev SQLite path if retaining SQLite locally; otherwise remove.

---

## Open Questions

1. **PostgresSaver schema name conflict**
   - What we know: PostgresSaver creates its own tables (`checkpoints`, `checkpoint_writes`, `checkpoint_migrations`)
   - What's unclear: Whether using schema `"langgraph"` requires explicit Postgres role grants in Supabase
   - Recommendation: Create the `langgraph` schema explicitly in the migration SQL and grant access to the Prisma DB user before running `checkpointer.setup()`

2. **pg_cron availability on Supabase free tier**
   - What we know: Supabase documentation says pg_cron is available via extension
   - What's unclear: Whether pg_cron is enabled by default or requires a support request on the free tier
   - Recommendation: Verify via SQL Editor (`SELECT * FROM pg_extension WHERE extname = 'pg_cron'`) immediately after project creation. Fallback: Inngest scheduled function for cleanup.

3. **Existing `redFlags` field stored as JSON string vs array**
   - What we know: `Consultation.redFlags` is currently `String?` in SQLite (JSON string representation)
   - What's unclear: Whether to migrate this to a proper `String[]` array in PostgreSQL or keep as `String`
   - Recommendation: Migrate to `String[]` in PostgreSQL (Prisma supports `String[]` with PostgreSQL); update queries accordingly.

---

## Validation Architecture

### Test Framework

| Property           | Value                               |
| ------------------ | ----------------------------------- |
| Framework          | None detected — Wave 0 must install |
| Config file        | None — see Wave 0                   |
| Quick run command  | `bun test` (after vitest setup)     |
| Full suite command | `bun test --run`                    |

No test files or test framework configuration were found in the project. Wave 0 must establish the testing foundation.

### Phase Requirements → Test Map

| Req ID   | Behavior                                                             | Test Type   | Automated Command                                         | File Exists? |
| -------- | -------------------------------------------------------------------- | ----------- | --------------------------------------------------------- | ------------ |
| COMP-01  | Care Summary response includes disclaimer text                       | unit        | `bun test src/__tests__/compliance/disclaimer.test.ts`    | Wave 0       |
| COMP-02  | All 8 agent name fields use "AI" format, no bare "Dr."               | unit        | `bun test src/__tests__/compliance/agent-names.test.ts`   | Wave 0       |
| COMP-03  | detectEmergency() returns emergency result for each keyword category | unit        | `bun test src/__tests__/lib/emergency-rules.test.ts`      | Wave 0       |
| COMP-03  | detectEmergency() returns no emergency for normal symptom text       | unit        | `bun test src/__tests__/lib/emergency-rules.test.ts`      | Wave 0       |
| COMP-04  | POST /api/consult without consent returns 403                        | integration | `bun test src/__tests__/api/consult-consent-gate.test.ts` | Wave 0       |
| COMP-05  | GET /api/patient/export returns all 4 data types                     | integration | `bun test src/__tests__/api/patient-export.test.ts`       | Wave 0       |
| COMP-05  | DELETE /api/patient anonymises email and sets deletedAt              | integration | `bun test src/__tests__/api/patient-delete.test.ts`       | Wave 0       |
| COMP-06  | Manual verification only                                             | manual      | N/A — Supabase Dashboard check                            | N/A          |
| INFRA-01 | Prisma can connect and query Patient table on PostgreSQL             | smoke       | `bun test src/__tests__/infra/db-connection.test.ts`      | Wave 0       |
| INFRA-02 | RLS policies exist on Patient, Consultation, Notification tables     | smoke       | `bun test src/__tests__/infra/rls-policies.test.ts`       | Wave 0       |
| INFRA-03 | PostgresSaver setup() runs without error                             | smoke       | `bun test src/__tests__/infra/checkpointer.test.ts`       | Wave 0       |
| INFRA-04 | Inngest serve handler responds to GET with function list             | smoke       | `bun test src/__tests__/infra/inngest-handler.test.ts`    | Wave 0       |

### Sampling Rate

- **Per task commit:** `bun test src/__tests__/lib/emergency-rules.test.ts` (unit tests for the module just written)
- **Per wave merge:** `bun test --run` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — install vitest: `bun add -D vitest @vitest/coverage-v8`
- [ ] `src/__tests__/` directory structure
- [ ] `src/__tests__/compliance/disclaimer.test.ts` — covers COMP-01
- [ ] `src/__tests__/compliance/agent-names.test.ts` — covers COMP-02
- [ ] `src/__tests__/lib/emergency-rules.test.ts` — covers COMP-03
- [ ] `src/__tests__/api/consult-consent-gate.test.ts` — covers COMP-04
- [ ] `src/__tests__/api/patient-export.test.ts` — covers COMP-05 (export)
- [ ] `src/__tests__/api/patient-delete.test.ts` — covers COMP-05 (delete)
- [ ] `src/__tests__/infra/db-connection.test.ts` — covers INFRA-01
- [ ] `src/__tests__/infra/rls-policies.test.ts` — covers INFRA-02
- [ ] `src/__tests__/infra/checkpointer.test.ts` — covers INFRA-03
- [ ] `src/__tests__/infra/inngest-handler.test.ts` — covers INFRA-04

---

## Sources

### Primary (HIGH confidence)

- Supabase official docs: [Prisma + Supabase setup](https://supabase.com/docs/guides/database/prisma) — DATABASE_URL/DIRECT_URL pattern, migration commands
- LangGraph JS API reference: [PostgresSaver](https://langchain-ai.github.io/langgraphjs/reference/classes/langgraph-checkpoint-postgres.PostgresSaver.html) — fromConnString, setup(), thread_id config
- Inngest official docs: [Next.js Quick Start](https://www.inngest.com/docs/getting-started/nextjs-quick-start) — App Router serve handler pattern
- Supabase official docs: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — enable RLS, auth.uid() policies, service role bypass
- Supabase official docs: [pg_cron extension](https://supabase.com/docs/guides/database/extensions/pg_cron) — schedule syntax, enable extension
- npm registry (2026-03-26): `@supabase/supabase-js@2.100.0`, `prisma@7.5.0`, `@langchain/langgraph-checkpoint-postgres@1.0.1`, `inngest@4.1.0`

### Secondary (MEDIUM confidence)

- AHPRA official AI guidance: [ahpra.gov.au AI in healthcare](https://www.ahpra.gov.au/Resources/Artificial-Intelligence-in-healthcare.aspx) — professional obligations, disclosure requirements, verified August 2024 publication
- OAIC: [APP 12 Access to personal information](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-12-app-12-access-to-personal-information) — data export obligations confirmed; healthcare providers must respond to access requests
- Prisma docs: [PgBouncer configuration](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer) — `?pgbouncer=true` query param, directUrl for migrations

### Tertiary (LOW confidence)

- WebSearch: AHPRA "AI" vs "Dr." naming convention specifics — cross-referenced with CONTEXT.md locked decision; confirmed pattern is AHPRA-safe based on guidance interpretation
- WebSearch: PostgresSaver + Next.js hot reload connection leak — community-reported pattern, not in official docs; LOW confidence but follows same globalThis pattern already in codebase

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all versions verified against npm registry 2026-03-26
- Architecture: HIGH — Prisma/Supabase patterns from official docs; PostgresSaver from official API reference; Inngest from official docs
- Pitfalls: HIGH for infra pitfalls (pgBouncer, auth.uid()); MEDIUM for PostgresSaver hot reload (community pattern)
- Compliance (AHPRA/Privacy Act): MEDIUM — official guidance reviewed but not legal advice; decisions locked in CONTEXT.md

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable libraries; AHPRA guidance from August 2024 — unlikely to change in 30 days)

# Phase 1: Foundation + Compliance - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the legal and infrastructure foundation: Supabase PostgreSQL (Sydney region) replacing SQLite, Row Level Security, LangGraph PostgresSaver for consultation memory, Inngest for background jobs, AHPRA compliance layer (agent disclaimers + AI identity naming), a deterministic emergency rules engine, and a Privacy Act consent flow with data export and account deletion. No patient-facing UI polish — just the non-negotiable rails everything else runs on.

</domain>

<decisions>
## Implementation Decisions

### Supabase Migration

- Keep existing custom auth (email/password via Prisma) for Phase 1 — migrating to Supabase Auth is Phase 2 scope when the onboarding flow is built. Use existing `Patient.id` as RLS user identifier via a custom auth context header for now.
- Two connection strings: `DATABASE_URL` = pooled (Supabase pgBouncer) for app queries, `DIRECT_URL` = direct connection for Prisma migrations. Both required to avoid DDL failures through pgBouncer.
- Supabase project region: `ap-southeast-2` (Sydney) — set at project creation, cannot be changed later. This is a hard requirement before the first migration runs.
- RLS policy pattern: `auth.uid() = patient_id` for patient tables, service role bypass for server-side agent writes.
- SQLite dev.db remains for local development via `DATABASE_URL=file:./dev.db` branch in `.env.local` — production uses Supabase.

### AHPRA Compliance Layer

- Agent naming format: `"Alex AI — GP"` (no bare "Dr." prefix) — clear AI identification, professional tone, AHPRA-safe. All 8 agent names updated across definitions and UI references.
- AHPRA disclaimer placement: appended to every **Care Summary** output + displayed as a static banner on the consultation page header. Not injected per-message (reduces noise while remaining compliant per AHPRA guidance on health info disclaimers).
- Standard disclaimer text: _"Medicrew provides health information, not medical diagnosis or advice. Always consult a registered healthcare professional for medical concerns. In an emergency, call 000."_
- Agent system prompts: each agent receives an additional rule: never output "you have [condition]" — always "this may be consistent with" or "worth discussing with a doctor."

### Emergency Rules Engine

- Implementation location: `/lib/emergency-rules.ts` — a pure function `detectEmergency(text: string): EmergencyResult` called in the `/api/consultation` route handler **before** invoking LangGraph.
- Detection method: deterministic keyword + phrase matching (no LLM). Keywords include: chest pain, heart attack, stroke, FAST symptoms, suicidal, want to kill myself, can't breathe, severe bleeding, overdose, unconscious, call 000.
- On detection: immediately return an `emergency` response to the client (no LangGraph call) with: urgency=emergency, mandatory 000 referral, nearest ED instructions, Lifeline number (suicidal ideation).
- Also applied to check-in responses in Phase 3 — same module, imported.

### Privacy Consent Flow

- Consent gate: a `PatientConsent` table (`patientId`, `consentedAt`, `consentVersion`, `dataCategories` JSONB) — must have a record before any consultation is stored.
- Consent check: `/api/consultation` route checks for valid consent before processing symptoms. If missing → 403 with redirect to consent page.
- Consent page: simple standalone page at `/consent` — shows what data is collected, why, and that LLM providers (Groq/OpenAI) may process data overseas. Three checkboxes (health data collection, AI guidance, overseas processing). All must be checked.
- Data export: `GET /api/patient/export` — returns JSON with all Patient, Consultation, Notification, and PatientConsent records. Auth-gated.
- Account deletion: `DELETE /api/patient` — cascades all related records, anonymises email to `deleted-{id}@medicrew.au`, marks account inactive. Soft delete with 30-day grace period.

### PostgresSaver + Inngest

- LangGraph checkpointer: `@langchain/langgraph-checkpoint-postgres` — one `thread_id` per consultation (`consultation-{consultationId}`). Exit-mode checkpointing (only saves on graph completion) to limit checkpoint row growth.
- Inngest: configured as a Next.js API route at `/api/inngest` — Inngest Dev Server for local, Inngest Cloud for production. Phase 1 only sets up the plumbing; actual check-in functions built in Phase 3.
- Checkpoint cleanup: a `pgcron` job (Supabase's pg_cron extension) to delete checkpoints older than 90 days — configured in migration.

### Claude's Discretion

- Specific Supabase RLS policy syntax for the `Notification` table (doctor vs patient access patterns)
- Exact migration file naming and ordering
- Whether to use Prisma's `@db.Json` type or raw `jsonb` for the consent data categories field

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `prisma/schema.prisma`: Patient, Consultation, Doctor, Notification models — all need migration to Supabase but schema is already well-structured
- `src/lib/ai/config.ts`: `createModel()` factory — already abstracts Groq/Ollama/OpenAI; no changes needed for LLM provider layer
- `src/agents/orchestrator.ts`: `streamConsultation()` generator + `ConsultationAnnotation` — already set up for streaming; emergency rules engine hooks into the calling API route
- `src/app/api/` (existing routes): auth pattern already exists — RLS middleware can follow same pattern
- `src/agents/definitions/*.ts`: all 8 agent files have `name` field (e.g., `"Dr. Alex (GP)"`) — need renaming to `"Alex AI — GP"` format

### Established Patterns

- Next.js App Router API routes (`src/app/api/`)
- Prisma client via `@prisma/client` for all DB access
- LangChain `createModel()` abstraction for LLM calls
- TypeScript interfaces in `src/agents/types.ts` for consultation state

### Integration Points

- Supabase client: new `src/lib/supabase/` module (server + client instances)
- Emergency rules: `src/lib/emergency-rules.ts` — imported by all consultation API routes
- Consent middleware: `src/lib/consent-check.ts` — called in consultation route before graph invocation
- Inngest client: `src/lib/inngest/client.ts` + API route `/api/inngest/route.ts`

</code_context>

<specifics>
## Specific Ideas

- Supabase Sydney region is non-negotiable — must be `ap-southeast-2` before migration
- Emergency engine must be a pure function (testable without LLM) — no side effects, returns structured result
- "Alex AI — GP" naming: update all 8 agent `name` fields in `src/agents/definitions/`
- Disclaimer text approved: "Medicrew provides health information, not medical diagnosis or advice. Always consult a registered healthcare professional for medical concerns. In an emergency, call 000."
- 90-day checkpoint cleanup via pg_cron to prevent unbounded table growth

</specifics>

<deferred>
## Deferred Ideas

- Supabase Auth migration (magic links, OAuth) — Phase 2 when onboarding is built
- LLM provider DPA documentation for OpenAI/Groq — required before real patient data, flagged as pre-launch compliance task
- TGA SaMD classification assessment — flagged as external task; must be commissioned before public launch
- NSW HRIP Act review for NSW patients — post-launch legal review

</deferred>

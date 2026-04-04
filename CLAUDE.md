# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # Start dev server (Next.js)
bun run build        # Production build
bun run test         # Run all tests (vitest via package.json — REQUIRED, not `bun test`)
bun run test:watch   # Watch mode
bun run lint         # ESLint

# Run a single test file
bunx vitest run src/__tests__/path/to/file.test.ts

# Embed medical corpus into Supabase pgvector (one-time, ~20 min)
DATABASE_URL=... NOMIC_API_KEY=... bun run scripts/embed-corpus.ts
```

**Critical:** Always `bun run test`, never `bun test`. The native Bun runner breaks `vi.mock`/`vi.mocked`. Tests live in `src/__tests__/` only.

## Architecture

### Two Consultation Pathways (Important)

Two parallel systems handle consultations — they must stay in sync:

1. **LangGraph Orchestrator** (`/api/consult`) — primary patient-facing endpoint. Handles both streaming and non-streaming. Writes to DB. Runs emergency detection. Calls `runConsultation()` in `src/agents/orchestrator.ts`.

2. **Swarm v2** (`/api/swarm/start`, `src/agents/swarm.ts`) — 7-layer multi-agent pipeline used by the HuddleRoom UI. Emits SSE events (`SwarmEvent`). `streamSwarm()` is the main entry point.

The swarm layer flows: `L1 Triage → L2 Leads → L3 Residents → L4 Debate → L5 Rectification → L6 MDT → L7 Synthesis`.

### LLM Configuration

`src/lib/ai/config.ts` controls all model selection. Provider is `groq` (default) or `ollama` via `LLM_PROVIDER` env var.

- `createModel()` — main model (llama-3.3-70b)
- `createFastModel()` — fast model (llama-3.1-8b-instant)
- `createJsonModel()` — triage/structured output (forces JSON mode on Groq)

### Compliance Architecture (Never Break These)

- **`detectEmergency()` in `src/lib/emergency-rules.ts`** is deterministic regex — must fire before any LLM call in every consultation entry point.
- **`AGENT_COMPLIANCE_RULE` in `src/lib/compliance.ts`** must be injected into every specialist system prompt. Forbids "you have [condition]" language.
- Agent names must follow "Alex AI — GP" format (em dash, contains "AI") per AHPRA requirements.
- Emergency Australia contacts: 000 (ambulance), 13 11 14 (Lifeline).

### Auth

`src/lib/auth.ts` exports `getAuthenticatedPatient()` — the only auth mechanism. Looks up Clerk `userId` → `Patient.clerkUserId` via Prisma. All patient API routes must call this. No `x-patient-id` header or localStorage stubs anywhere.

Middleware protects `/patient/*`, `/doctor/*`, `/consult/*`, `/onboarding/*` via Clerk.

### RAG Pipeline

`src/lib/rag/retrieve.ts` — fetches relevant medical context from Supabase pgvector. Catches all errors and returns `{}` silently (RAG failure must never block a consultation). Triage must run first to get `relevantDoctors` for specialty-scoped queries. `buildResidentPrompt()` in `swarm.ts` is the injection point.

### Database

Postgres via Prisma + Supabase (`ap-southeast-2` — must not change, Privacy Act).

- `DIRECT_URL` required (pooled URL breaks LangGraph `PostgresSaver` migrations).
- Key models: `Patient`, `Consultation`, `CheckIn`, `CareTeamStatus`, `PatientConsent`, `SymptomJournal`.

### Inngest

Background jobs at `src/lib/inngest/`. Triggered on `consultation/completed` event (schedules 48h patient check-in).

## Testing

Tests are in `src/__tests__/`. Add `// @vitest-environment jsdom` pragma to React component tests. Use `@testing-library/user-event` v14 for controlled inputs (React 19 — don't use `fireEvent.change`).

## gstack Integration

gstack is available at `~/.claude/skills/gstack`. For all web browsing tasks:

- Use the `/browse` skill from gstack, never use `mcp__claude-in-chrome__*` tools
- Available gstack skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`

## Key Files

| File                                        | Purpose                                  |
| ------------------------------------------- | ---------------------------------------- |
| `src/agents/swarm.ts`                       | All swarm layer logic + `streamSwarm()`  |
| `src/agents/orchestrator.ts`                | LangGraph graph + `runConsultation()`    |
| `src/lib/emergency-rules.ts`                | Deterministic emergency detection        |
| `src/lib/compliance.ts`                     | AHPRA disclaimer + agent compliance rule |
| `src/lib/auth.ts`                           | `getAuthenticatedPatient()`              |
| `src/lib/ai/config.ts`                      | LLM provider factory                     |
| `src/lib/rag/retrieve.ts`                   | pgvector RAG retrieval                   |
| `src/components/consult/HuddleRoom.tsx`     | Main consultation UI                     |
| `src/components/doctor/SwarmDebugPanel.tsx` | Doctor portal debug view                 |
| `prisma/schema.prisma`                      | DB schema                                |

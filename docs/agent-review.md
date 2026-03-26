# MediCrew Agent System Review

**Last reviewed: 2026-03-26 (Run 20 — ⚠️ SWARM STILL DISCONNECTED — 8 runs, no fix)**
Previous: Run 19 (no changes)
**Previous review: 2026-03-26 (Run 6)**
**Reviewer:** Claude (automated)

---

## Overall Status: ⚠️ DEGRADED

The swarm engine is intact, but Phase 02-03 replaced `SwarmChat` in `src/app/consult/page.tsx` with the old orchestrator pipeline (`/api/consult`). The patient-facing consult page no longer reaches the swarm. **The MVP feature is unreachable from the UI.**

---

## Run 12: Phase 02-01 Progress Check

### ✅ Swarm files unchanged
No modifications to: `swarm.ts`, `swarm-types.ts`, `/api/swarm/start`, `/api/swarm/answer`, `SwarmChat.tsx`, or any specialist definitions. All 13/14 fixes remain in place.

### ✅ Phase 02-01 executed (3 new commits since Run 11)
- `bc3abe9` — Wave 0: Prisma schema migration (DOB/medications/allergies/CareTeamStatus/SymptomJournal), Supabase helpers, care-team-config, 11 test stubs
- `f2a42a2` — Onboarding multi-step page, consent API (`/api/patient/consent`), onboarding API (`/api/patient/onboarding`)
- `40b756c` — Phase 02-01 SUMMARY.md

### ⚠️ Uncommitted change: `src/app/api/consult/route.ts`
The old `/api/consult` route (orchestrator pipeline) has ~82 lines of uncommitted additions that build `CareTeamStatus` JSONB from agent messages and persist them to Prisma. This is Phase 02-01 work. It is NOT yet committed.

**Action needed:** Commit or stage this file as part of Phase 02-01 completion. The change is expected (wires old pipeline to new CareTeamStatus schema) — it is not a regression.

### ✅ Scope Boundaries confirmed in all 6 specialist prompts
All guardrails intact post Phase 02-01 execution.

---

## Run 13: Phase 02 Complete — Swarm Disconnection Found

### ✅ Phase 02 fully executed (9 commits since Run 12)
- `d4b7982` — CareTeamStatus writes from consult route + PATCH care-status API
- `e8bdd3a` — Dashboard UI: CareTeamCard with Realtime, ConsultationHistoryList
- `7cde4a3` — `streamConsultation` extended: agent identity metadata, token streaming, routing event
- `8d6e6ee` — `AgentOverlay` component wired into consult page
- `ccc2b33` — Phase 02-03 SUMMARY
- `3e64429` — Phase 02-02 SUMMARY
- `92f1d7a` — CareSummary component, journal + profile APIs
- `ce33fd6` — Patient profile page, HealthProfileForm, SymptomJournalEntry
- `90ef47a` — Phase 02-04 SUMMARY — Phase 02 complete

### ⚠️ CRITICAL: SwarmChat displaced from consult page
Phase 02-03 rewrote `src/app/consult/page.tsx` (291 lines). The page now:
- Fetches from `/api/consult` (old orchestrator pipeline)
- Renders `<AgentOverlay>` + `<CareSummary>` (old pipeline components)
- **Does NOT import or render `<SwarmChat />`**

`SwarmChat.tsx` still exists and still calls `/api/swarm/start`, but it is unreachable from any page. The 5-layer swarm MVP feature is dead from a patient perspective.

### ✅ Swarm engine itself is intact
`swarm.ts`, `swarm-types.ts`, `/api/swarm/start`, `/api/swarm/answer` — all unchanged. The engine runs fine if called directly.

### ✅ All 6 specialist Scope Boundaries still present
### ✅ Run 12 flag resolved: `src/app/api/consult/route.ts` committed in `d4b7982`

---

### Next Steps for any new Claude session

**PRIORITY 1 — Reconnect swarm to patient UI:**
The simplest fix is to restore `<SwarmChat />` in `src/app/consult/page.tsx`, either:
- **Option A** (recommended): Replace the `/api/consult` fetch + AgentOverlay with `<SwarmChat />`. The swarm already handles the full consultation flow. AgentOverlay + CareSummary from Phase 02-03 can be removed or kept as doctor-portal views only.
- **Option B**: Keep both paths and add a feature flag/toggle. Patient gets SwarmChat; doctor portal gets the old pipeline with AgentOverlay.

File to edit: `src/app/consult/page.tsx` — import `SwarmChat` from `@/components/consult/SwarmChat` and render it instead of the current `/api/consult` flow.

**PRIORITY 2 — Verify Phase 02 deliverables don't break swarm:**
Check that new APIs (`/api/patient/consent`, `/api/patient/onboarding`, `/api/patient/profile`, `/api/patient/journal`) are additive and don't conflict with swarm routes.

---

## Issue Tracker (all 14 original issues)

| # | Issue | Status | Fix |
|---|-------|--------|-----|
| 1 | Sequential specialists | ✅ FIXED | Promise.all fan-out in swarm.ts |
| 2 | Node-level streaming | ✅ FIXED | llm.stream() + doctor_token events |
| 3 | LLM per node | ✅ FIXED | createModel/createFastModel/createJsonModel factory |
| 4 | Triage silent fail-open | ✅ FIXED | JSON mode + "urgent" fallback + error log |
| 5 | Doctor triage regex | ✅ FIXED | Structured JSON in swarm triage |
| 6 | Naive keyword routing | ✅ FIXED | LLM-based routing inside triage |
| 7 | LLM instantiation | ✅ FIXED | Lifted to swarm factory |
| 8 | No auth/rate limit | ✅ FIXED | 2000 char cap + IP rate limiter (src/lib/rate-limit.ts) |
| 9 | Hardcoded urgency | ✅ FIXED | Synthesis determines urgency from debate |
| 10 | No session resume | ⏸ DEFERRED | Phase 2 — Upstash Redis required |
| 11 | SSE error handling | ✅ FIXED | Structured error event before close in all routes |
| 12 | Missing guardrails | ✅ FIXED | Scope Boundaries block in all 6 specialist prompts |
| 13 | No-op router | ✅ FIXED | Replaced by conditional fan-out in swarm.ts |
| 14 | No observability | ✅ FIXED | console.error on all parse failures + API routes |

**Score: 13/14 fixed, 1 deferred (session resume — by design, Phase 2)**

---

## Run 7: New Swarm Health Check

### ✅ Import chain verified
- `swarm.ts` → `swarm-types.ts`: all types resolve (SwarmState, SwarmEvent, DoctorRole, answerStore)
- `swarm.ts` → `lib/ai/config.ts`: createJsonModel, createFastModel both exported and present
- `swarm.ts` → `definitions/index.ts`: agentRegistry has all 7 specialist roles

### ✅ Agent registry completeness
All roles used in HYPOTHESES_BY_ROLE confirmed present: `gp`, `cardiology`, `mental_health`, `dermatology`, `orthopedic`, `gastro`, `physiotherapy`. Each has `.name` and `.systemPrompt`.

### ✅ DoctorRole type alignment
`DoctorRole` is now a narrow union (not AgentRole alias): `"gp" | "cardiology" | "mental_health" | "dermatology" | "orthopedic" | "gastro" | "physiotherapy"`. Excludes process roles ("triage", "orchestrator"). Commit: `189c96d`.

### ✅ API route validation
- `/api/swarm/start`: symptoms required, max 2000 chars, patientInfo.age + gender required, rate limit checked
- `/api/swarm/answer`: clarificationId + answer required, answer capped at 500 chars
- SSE double-newline terminators correct on all routes

### ✅ Patient UI wired correctly
`src/app/consult/page.tsx` imports and renders `<SwarmChat />` — old ConsultationFlow removed.

### ⚠️ Known limitation: answerStore (in-memory)
`answerStore` in swarm-types.ts is a module-level Map. Works in dev (single process). On Vercel, `/api/swarm/start` and `/api/swarm/answer` run in separate Lambda invocations — clarification answers will never reach the swarm. Phase 2 task: swap to Upstash Redis.

### ⚠️ Old pipeline: still present, not broken
`src/agents/orchestrator.ts` and `src/agents/doctorConsultation.ts` are still in the repo. They are no longer called by the patient consult flow (SwarmChat replaced ConsultationFlow). The doctor portal (`/api/portal/case-consult`) still exists — it was patched (SSE error fix) but not replaced with swarm yet.

---

## 16 Quality Improvements Applied This Session

| # | Severity | Fix | Commit |
|---|----------|-----|--------|
| 1 | CRITICAL | SSE chunk boundary — streaming TextDecoder + remainder buffer | `106377c` |
| 2 | CRITICAL | res.ok check before reading SSE stream | `106377c` |
| 3 | CRITICAL | isLoading cleared on synthesis_complete | `106377c` |
| 4 | IMPORTANT | done event handled in switch | `106377c` |
| 5 | IMPORTANT | awaiting_patient phase shows "Waiting for your answers…" | `106377c` |
| 6 | MINOR | tokenBufferRef dead code removed | `106377c` |
| 7 | MINOR | slice(6) replaces fragile replace() for SSE prefix | `106377c` |
| 8 | IMPORTANT | Server-side patientInfo validation (age + gender required) | `189c96d` |
| 9 | MINOR | DoctorRole narrowed — excludes triage/orchestrator | `189c96d` |
| 10 | SUGGESTION | Synthesis schema asymmetry documented in comment | `189c96d` |
| 11 | MINOR | maxDuration increased 60→300s | `7d4cff2` |
| 12 | SUGGESTION | Emergency card: role=alert, red border, pulsing badge | `7d4cff2` |
| 13 | SUGGESTION | SwarmDebugPanel: non-null assertion replaced with optional chain | `7d4cff2` |
| 14 | SUGGESTION | ARIA labels: age, gender group, symptoms, send button | `effbea2` |
| 15 | SUGGESTION | DoctorOrbRow: aria-label per orb with status | `effbea2` |
| 16 | SUGGESTION | ClarificationBubble: answer input labelled with question text | `effbea2` |

---

## Next Steps (pickup tasks for any new Claude session)

### Phase 2 blocker (must do before production)
- [ ] **Replace answerStore with Upstash Redis**
  - Files: `src/agents/swarm-types.ts` (remove answerStore Map), `src/app/api/swarm/answer/route.ts` (write to Redis), `src/agents/swarm.ts` (poll Redis instead of in-memory Map)
  - Install: `bun add @upstash/redis`
  - Env var needed: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - TTL: 5 minutes per clarification entry

- [ ] **Replace rate limiter with Upstash Redis**
  - File: `src/lib/rate-limit.ts`
  - Use `@upstash/ratelimit` with sliding window
  - Same env vars as above

### Integration tasks
- [ ] **Test locally**: `bun run dev` → http://localhost:3000/consult → submit symptoms → verify orbs animate + synthesis card renders
- [ ] **Test emergency path**: submit "chest pain and arm numbness" → should skip swarm and show Call 000 immediately
- [ ] **Wire doctor portal to swarm**: `src/app/doctor/page.tsx` currently shows `<SwarmDebugPanel state={{}} />` with empty state — needs live swarm data piped from a triggered consultation

### Low priority
- [ ] Remove or archive `src/agents/orchestrator.ts` and `src/agents/doctorConsultation.ts` once old portal routes are updated
- [ ] Add integration test: POST /api/swarm/start with chest pain symptoms → verify SSE stream returns synthesis_complete event

---

## Delta from Run 6

**Run 6:** 0/14 issues fixed (plan written, not executed)
**Run 7:** 13/14 fixed (1 deferred by design) + 16 additional quality improvements applied

All swarm files created, reviewed (spec + code quality), and patched. System is feature-complete for MVP demo.

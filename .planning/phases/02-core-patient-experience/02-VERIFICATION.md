---
phase: 02-core-patient-experience
verified: 2026-03-26T05:00:00Z
status: human_needed
score: 14/14 must-haves verified
re_verification: true
  previous_status: gaps_found
  previous_score: 13/14
  gaps_closed:
    - "DASH-01/DASH-04: careTeamStatus: true added to Prisma include in /api/patients/[id]/route.ts — initial dashboard load now returns existing care team statuses from the database"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Navigate to /patient after completing a consultation"
    expected: "Care team member cards immediately show the status messages written during the consultation (not 'No recent activity'), and updating in real time on next consultation"
    why_human: "The fix (careTeamStatus included in API response) requires a live browser session with real database data to confirm initial-load + realtime-update flow both work"
  - test: "Complete the 3-step onboarding flow at /onboarding"
    expected: "Step 1 saves profile, step 2 creates a consent record, step 3 shows named care team, 'Get Started' button takes patient to /patient"
    why_human: "End-to-end browser navigation cannot be verified programmatically"
  - test: "Start a consultation at /consult — submit symptoms and watch the streaming"
    expected: "Text appears token-by-token, agent name/emoji/specialty badge appear above the stream for each agent, a routing notice appears after triage showing which specialists are reviewing"
    why_human: "Token-level progressive streaming and live SSE events require browser observation"
---

# Phase 02: Core Patient Experience — Verification Report

**Phase Goal:** Core patient experience — onboarding, care team dashboard, streaming consultation, health profile, symptom journal
**Verified:** 2026-03-26T05:00:00Z
**Status:** human_needed (all automated checks pass)
**Re-verification:** Yes — after gap closure

---

## Gap Closure Confirmation

**Previous gap:** DASH-01/DASH-04 — `/api/patients/[id]/route.ts` did not include `careTeamStatus` in the Prisma `findUnique` include block, so `patient.careTeamStatus` was always `undefined` on dashboard load.

**Fix applied:** `careTeamStatus: true` added at line 24 of `/api/patients/[id]/route.ts`.

**Full chain verified:**

| Step | Location | Evidence |
|------|----------|----------|
| Prisma query includes careTeamStatus | `src/app/api/patients/[id]/route.ts` line 24 | `careTeamStatus: true` present in include block |
| Patient interface accepts the field | `src/app/patient/page.tsx` lines 31-33 | `careTeamStatus?: { statuses: Record<string, AgentStatus> } \| null` |
| Dashboard passes statuses to CareTeamCard | `src/app/patient/page.tsx` line 263 | `initialStatuses={patient.careTeamStatus?.statuses ?? {}}` |

Gap is fully closed. The wiring from database through API through dashboard component is now complete.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Patient can fill in DOB, gender, conditions, medications, allergies, emergency contact, GP in a multi-step form | VERIFIED | `MedicalHistoryStep.tsx` has all fields; POSTs to `/api/patient/onboarding`; API saves with `onboardingComplete: true` |
| 2 | Consent step POSTs to /api/patient/consent and creates a PatientConsent record before patient can proceed | VERIFIED | `ConsentStep.tsx` fetches POST to `/api/patient/consent`; route calls `prisma.patientConsent.create` |
| 3 | After consent, patient sees their named care team with emoji avatars, specialties, and descriptions | VERIFIED | `CareTeamIntroStep.tsx` imports `CARE_TEAM` from `care-team-config`; renders all members with framer-motion staggered animation |
| 4 | On completion, onboardingComplete is set to true and patient is redirected to /patient | VERIFIED | Onboarding API sets `onboardingComplete: true`; `CareTeamIntroStep` routes to `/patient` on "Get Started" |
| 5 | Dashboard shows each care team member with a live status message (within 2 seconds via Realtime) | VERIFIED | `/api/patients/[id]` now includes `careTeamStatus: true`; `patient.careTeamStatus?.statuses` passed as `initialStatuses` to `CareTeamCard`; Supabase Realtime subscription wired for live updates |
| 6 | Dashboard shows a basic care plan card with monitoring status and next check-in placeholder | VERIFIED | `patient/page.tsx` renders Care Plan tab with "Status: Active monitoring" and "Next check-in: Coming in Phase 3" |
| 7 | Dashboard shows consultation history with urgency levels, participating agent names, and outcome summary | VERIFIED | `ConsultationHistoryList.tsx` renders `urgencyLevel` badge, symptoms, `recommendation.summary`; consultations included via `/api/patients/[id]` |
| 8 | CareTeamStatus rows are written at the end of each consultation by /api/consult | VERIFIED | `consult/route.ts` calls `prisma.careTeamStatus.upsert` after streaming completes (lines 113 + 170) |
| 9 | During a consultation, each SSE event includes agentName, agentRole, and specialty | VERIFIED | `StreamEvent` interface has all three fields; orchestrator emits them on every `node_output` and `token_delta` event |
| 10 | Text streams progressively in real time via SSE — patient sees text appear token-by-token | VERIFIED | `graph.streamEvents({ version: 'v2' })` emits `on_llm_stream` events; orchestrator yields `token_delta` with `delta` field; `consult/page.tsx` appends to `streamingText` state |
| 11 | After triage, a routing event tells the patient which specialists are reviewing their case | VERIFIED | Orchestrator emits `eventType: 'routing'` after triage `on_chain_end`; `consult/page.tsx` maps to `CARE_TEAM` names for `RoutingNotice` |
| 12 | After consultation ends, patient sees a structured Care Summary with urgency badge, findings, next steps, timeframe, and AHPRA disclaimer | VERIFIED | `CareSummary.tsx` imports `AHPRA_DISCLAIMER` from `compliance.ts`; renders all fields; wired into `consult/page.tsx` when `!isStreaming && recommendation` |
| 13 | Patient health profile page shows known conditions, medications, and allergies from the database | VERIFIED | `HealthProfileForm.tsx` displays all fields; `profile/page.tsx` fetches from `GET /api/patient/profile`; profile API returns all fields |
| 14 | Patient can log a daily symptom entry with severity 1-5 and free text, and see recent entries | VERIFIED | `SymptomJournalEntry.tsx` posts to `/api/patient/journal`; journal API validates integer severity 1-5; GET returns last 30 entries |

**Score: 14/14 truths verified**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | Extended Patient model + SymptomJournal + CareTeamStatus | VERIFIED | `onboardingComplete`, `supabaseUserId`, `dateOfBirth`, `medications`, `allergies`, `emergencyContact @db.JsonB`, `gpDetails @db.JsonB`; both new models present |
| `src/app/api/patient/consent/route.ts` | POST creating PatientConsent record | VERIFIED | Exports `POST`; calls `prisma.patientConsent.create` |
| `src/app/api/patient/onboarding/route.ts` | POST saving profile + setting onboardingComplete | VERIFIED | Exports `POST`; zod validation; sets `onboardingComplete: true` |
| `src/lib/care-team-config.ts` | Client-safe CARE_TEAM array | VERIFIED | Exports `CARE_TEAM` with 8 agents using em-dash naming; no server imports |
| `src/app/onboarding/page.tsx` | Multi-step page with 3 steps | VERIFIED | Imports all 3 step components; uses `useSearchParams` for step routing |
| `src/lib/supabase/server.ts` | createSupabaseServer helper | VERIFIED | Exports `createSupabaseServer` |
| `src/lib/supabase/client.ts` | createSupabaseBrowser helper | VERIFIED | Exports `createSupabaseBrowser` |
| `src/components/dashboard/CareTeamCard.tsx` | Realtime subscription for live status | VERIFIED | `postgres_changes` subscription on `CareTeamStatus`; uses `CARE_TEAM`; no `agentRegistry` |
| `src/components/dashboard/ConsultationHistoryList.tsx` | Consultation history with urgency | VERIFIED | Contains `urgencyLevel`; color-coded badges; renders `recommendation.summary` |
| `src/app/api/patient/care-status/route.ts` | PATCH endpoint for CareTeamStatus updates | VERIFIED | Exports `PATCH`; calls `prisma.careTeamStatus.upsert` |
| `src/app/api/consult/route.ts` | Writes CareTeamStatus + patientContext injection | VERIFIED | Contains `careTeamStatus.upsert`; fetches `patientContext` from `prisma.patient`; passes as 4th arg to `streamConsultation` |
| `src/components/consult/AgentOverlay.tsx` | Agent identity overlay during streaming | VERIFIED | Contains `agentName`, `specialty`; shows `RoutingNotice`; uses `CARE_TEAM` (not `agentRegistry`) |
| `src/agents/orchestrator.ts` | StreamEvent with token_delta, routing, agentName | VERIFIED | `StreamEvent` interface; `graph.streamEvents({ version: 'v2' })`; yields `token_delta`, `node_output`, `routing`; accepts `patientContext` param |
| `src/components/consult/CareSummary.tsx` | Structured Care Summary with AHPRA_DISCLAIMER | VERIFIED | Imports `AHPRA_DISCLAIMER` from `compliance.ts`; renders urgency, summary, nextSteps, questionsForDoctor, timeframe |
| `src/app/patient/profile/page.tsx` | Health profile page | VERIFIED | Fetches both profile and journal APIs; renders `HealthProfileForm` and `SymptomJournalEntry`; responsive two-column layout |
| `src/components/profile/SymptomJournalEntry.tsx` | Severity 1-5 journal form | VERIFIED | Contains `severity`; posts to `/api/patient/journal`; color-coded severity entries |
| `src/app/api/patient/journal/route.ts` | POST and GET for symptom journal | VERIFIED | Exports `POST` and `GET`; validates integer severity 1-5 |
| `src/app/api/patient/profile/route.ts` | GET and PATCH for health profile | VERIFIED | Exports `GET` and `PATCH`; validates arrays for medications/allergies before Prisma update |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/onboarding/page.tsx` | `/api/patient/onboarding` | fetch POST in MedicalHistoryStep | WIRED | `MedicalHistoryStep.tsx` line 79: `fetch("/api/patient/onboarding", { method: "POST" ... })` |
| `src/components/onboarding/ConsentStep.tsx` | `/api/patient/consent` | fetch POST | WIRED | Line 30: `fetch("/api/patient/consent", { method: "POST" ... })` |
| `src/components/onboarding/CareTeamIntroStep.tsx` | `src/lib/care-team-config.ts` | import CARE_TEAM | WIRED | Line 8: `import { CARE_TEAM } from "@/lib/care-team-config"` |
| `src/components/dashboard/CareTeamCard.tsx` | CareTeamStatus table | Supabase Realtime postgres_changes | WIRED | Lines 44-49: subscription on `table: "CareTeamStatus"` |
| `src/app/api/consult/route.ts` | `prisma.careTeamStatus` | upsert at consultation end | WIRED | Lines 113 + 170: `prisma.careTeamStatus.upsert` after streaming completes |
| `src/app/patient/page.tsx` | `patient.careTeamStatus` | Prisma include in /api/patients/:id | WIRED | `/api/patients/[id]/route.ts` line 24: `careTeamStatus: true` — now included; page.tsx line 263 passes `patient.careTeamStatus?.statuses ?? {}` to `CareTeamCard` as `initialStatuses` |
| `src/app/consult/page.tsx` | `/api/consult` | EventSource/fetch SSE | WIRED | Imports `AgentOverlay`, `CareSummary`; parses `token_delta`, `node_output`, `routing`; renders `streamingText` progressively |
| `src/components/consult/AgentOverlay.tsx` | SSE event.agentName | props from parsed SSE data | WIRED | `agentName` prop rendered in JSX line 22; `CARE_TEAM` lookup for emoji by `agentRole` |
| `src/agents/orchestrator.ts` | `src/app/api/consult/route.ts` | streamConsultation generator | WIRED | Route calls `streamConsultation(symptoms, undefined, undefined, patientContext)` |
| `src/components/consult/CareSummary.tsx` | `src/lib/compliance.ts` | import AHPRA_DISCLAIMER | WIRED | Line 1: `import { AHPRA_DISCLAIMER } from "@/lib/compliance"` |
| `src/app/consult/page.tsx` | recommendation state | renders CareSummary when available | WIRED | Line 237: `{recommendation && !isStreaming && <CareSummary recommendation={recommendation} />}` |
| `src/app/patient/profile/page.tsx` | `/api/patient/profile` | fetch GET | WIRED | Line 41: `fetch("/api/patient/profile", { headers })` |
| `src/components/profile/SymptomJournalEntry.tsx` | `/api/patient/journal` | fetch POST | WIRED | Line 65: `fetch("/api/patient/journal", { method: "POST" ... })` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ONBD-01 | 02-01 | Patient can complete onboarding profile | SATISFIED | MedicalHistoryStep collects all fields; onboarding API saves with onboardingComplete=true |
| ONBD-02 | 02-01 | Onboarding includes consent step with Privacy Act disclosure | SATISFIED | ConsentStep reuses existing consent logic; POSTs to /api/patient/consent creating PatientConsent record |
| ONBD-03 | 02-01 | Patient care team introduced during onboarding | SATISFIED | CareTeamIntroStep shows named agents using CARE_TEAM config with emoji, specialty, bio |
| DASH-01 | 02-02 | Dashboard shows named care team with live status indicators | SATISFIED | CareTeamCard renders all agents; initial statuses now loaded from DB via careTeamStatus include; Realtime subscription handles live updates |
| DASH-02 | 02-02 | Dashboard shows active care plan with monitoring status | SATISFIED | Care Plan tab shows "Status: Active monitoring" and "Next check-in: Coming in Phase 3" — basic form as planned |
| DASH-03 | 02-02 | Dashboard shows consultation history | SATISFIED | ConsultationHistoryList renders urgency badges, symptoms, recommendation summary; consultations are included in API response |
| DASH-04 | 02-02 | Real-time care team status via Supabase Realtime (no polling, <2s) | SATISFIED | careTeamStatus now in API response for initial load; Realtime subscription handles subsequent updates; no polling |
| CONS-01 | 02-03 | Consultation UI shows which agent is speaking | SATISFIED | AgentOverlay renders during streaming with agentName, emoji (via CARE_TEAM lookup), specialty Badge |
| CONS-02 | 02-03 | Agent responses stream in real-time via SSE (token-by-token) | SATISFIED | graph.streamEvents() emits on_llm_stream; token_delta events with delta field; consult page appends to streamingText |
| CONS-03 | 02-03 | After triage, patient sees which specialists are reviewing | SATISFIED | routing event emitted after triage on_chain_end; RoutingNotice component renders specialist list |
| CONS-04 | 02-04 | Consultation ends with structured Care Summary | SATISFIED | CareSummary renders urgency, summary, nextSteps, questionsForDoctor, timeframe, AHPRA_DISCLAIMER |
| PROF-01 | 02-04 | Persistent health profile page | SATISFIED | /patient/profile page renders conditions, medications, allergies with edit toggle; fetches from profile API |
| PROF-02 | 02-03 | Agents access patient profile context at consultation start | SATISFIED | /api/consult fetches patient from DB, builds patientContext string, passes as 4th param to streamConsultation; prepended to symptoms as enrichedSymptoms |
| PROF-03 | 02-04 | Symptom journal: severity 1-5 + free text | SATISFIED | SymptomJournalEntry has 5-button severity selector, notes textarea, recent entries list; journal API validates integer 1-5 |

**All 14 requirements SATISFIED.**

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/app/api/patient/route.ts` | `// TODO: Replace with Supabase Auth session in Phase 2` (line 5) | Info | x-patient-id header auth pattern — intentional deferral per plan decisions |
| `src/app/api/patient/export/route.ts` | `// TODO: Replace with Supabase Auth session in Phase 2` (line 5) | Info | Same — intentional deferral |

No blocker anti-patterns remain. The single blocker from the initial verification (missing `careTeamStatus` include) is resolved.

---

## Human Verification Required

### 1. Dashboard initial status load (post-fix)

**Test:** Log in as a patient who has completed at least one consultation, navigate to /patient, go to the Care Team tab
**Expected:** Agent cards immediately show status messages from the last consultation on page load — not "No recent activity" — and those statuses update in real time when a new consultation completes
**Why human:** Requires a live browser session with real database data to confirm both the initial-render path (careTeamStatus from API) and the Realtime-update path work together correctly

### 2. End-to-end onboarding flow

**Test:** Navigate to /onboarding as a new patient, complete all 3 steps
**Expected:** Step 1 saves profile data, step 2 shows Privacy Act text and creates consent record on checkbox submit, step 3 shows named care team members (Alex AI GP, Sarah AI Cardiology, etc.) with emoji and bio, "Get Started" button navigates to /patient
**Why human:** Multi-step browser navigation with form state cannot be verified programmatically

### 3. Token-level streaming consultation

**Test:** Start a consultation at /consult, submit symptoms
**Expected:** AgentOverlay shows "Triage AI" / "Alex AI — GP" etc. as each agent activates; text appears character-by-character or word-by-word (not all at once); after triage, RoutingNotice appears listing specialist names; after streaming completes, CareSummary renders with urgency badge, next steps list, and AHPRA disclaimer at the bottom
**Why human:** Streaming timing and visual progressive rendering requires live browser observation

---

## Summary

**Gap closed:** The single blocker from the initial verification is resolved. `careTeamStatus: true` is now in the Prisma `findUnique` include at `/api/patients/[id]/route.ts` line 24. The full chain — database query → API response → `patient.careTeamStatus?.statuses` → `CareTeamCard initialStatuses` prop — is intact.

**All 14 truths verified. All 14 requirements satisfied.** Phase 02 automated verification is complete. Three items require human browser testing to confirm the end-to-end experience, as they involve live SSE streaming, multi-step navigation, and real database state that cannot be asserted programmatically.

---

_Verified: 2026-03-26T05:00:00Z_
_Verifier: Claude (gsd-verifier)_

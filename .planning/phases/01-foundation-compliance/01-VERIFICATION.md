---
phase: 01-foundation-compliance
verified: 2026-03-26T11:20:00Z
status: gaps_found
score: 17/20 must-haves verified
gaps:
  - truth: "A patient without a PatientConsent record gets 403 from /api/consult with redirect to /consent"
    status: partial
    reason: "Consent gate is conditional on x-patient-id header presence. Line 31 in /api/consult/route.ts reads 'if (patientId)' — a request with no x-patient-id header silently bypasses the consent check and proceeds to LangGraph. A patient with no header set gets through without any consent validation."
    artifacts:
      - path: "src/app/api/consult/route.ts"
        issue: "Consent check wrapped in 'if (patientId)' guard (line 31). No header = no consent check. Should return 401 or enforce consent when patientId is absent."
    missing:
      - "Either require x-patient-id unconditionally (return 401 if missing) or enforce consent for all requests regardless of header presence. The current optional guard defeats the compliance purpose of COMP-04."
  - truth: "Test stubs for INFRA-01 (db-connection), INFRA-02 (rls-policies), and INFRA-04 (inngest-handler) were meant to be converted to real tests"
    status: failed
    reason: "All three test files remain as test.todo() stubs. The plan 01-01 scaffolded stubs, and plan 01-02 replaced INFRA-03 checkpointer stubs with real tests, but never converted INFRA-01/02/04. Infrastructure is implemented correctly in source but tests don't verify it."
    artifacts:
      - path: "src/__tests__/infra/db-connection.test.ts"
        issue: "3 test.todo stubs — no real assertions for postgresql provider, directUrl, or PatientConsent model"
      - path: "src/__tests__/infra/rls-policies.test.ts"
        issue: "6 test.todo stubs — no real assertions for RLS on any of the 5 tables or patient_self_read policy"
      - path: "src/__tests__/infra/inngest-handler.test.ts"
        issue: "2 test.todo stubs — no real assertions for Inngest client id or route handler exports"
    missing:
      - "Convert db-connection.test.ts stubs to real tests using fs.readFileSync on prisma/schema.prisma (same approach used in checkpointer.test.ts)"
      - "Convert rls-policies.test.ts stubs to real tests using fs.readFileSync on prisma/migrations/0001_supabase_init/migration.sql"
      - "Convert inngest-handler.test.ts stubs to real tests importing from @/lib/inngest/client and @/app/api/inngest/route"
human_verification:
  - test: "Confirm Supabase project region"
    expected: "Supabase project dashboard shows region as ap-southeast-2 (Sydney). The database URLs in .env.local should contain 'ap-southeast-2' in the Supabase connection string."
    why_human: "Cannot verify cloud configuration programmatically. COMP-06 requires the Supabase project itself is locked to Sydney — the .env.example template uses ap-southeast-2 URLs but the actual project must be confirmed in Supabase dashboard."
  - test: "Verify /consent page renders all three checkboxes and posts correctly"
    expected: "Page shows three checkboxes (Health Data Collection, AI Health Guidance, Overseas Data Processing). Submit is disabled until all three are checked. On submit, posts to /api/patient/consent."
    why_human: "UI rendering and submit behavior requires browser — not testable with current test setup."
---

# Phase 1: Foundation & Compliance Verification Report

**Phase Goal:** The product is legally safe to show to real Australian patients and runs on production-grade infrastructure
**Verified:** 2026-03-26T11:20:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Prisma schema uses postgresql provider with DATABASE_URL and DIRECT_URL | VERIFIED | `prisma/schema.prisma` lines 8-12: `provider = "postgresql"`, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")` |
| 2 | PatientConsent model exists with patientId, consentedAt, consentVersion, dataCategories (JsonB) | VERIFIED | `prisma/schema.prisma` lines 81-89: all four fields present, `dataCategories Json @db.JsonB` |
| 3 | Patient model has deletedAt and deletedEmail fields | VERIFIED | `prisma/schema.prisma` lines 23-24: `deletedAt DateTime?` and `deletedEmail String?` |
| 4 | RLS enabled on all 5 tables in migration SQL | VERIFIED | `migration.sql` lines 96-100: 5 ALTER TABLE enable statements confirmed, grep count returns 5 |
| 5 | vitest installed and bun test runs without error | VERIFIED | `vitest.config.ts` exists with `defineConfig`; `bun run test` exits 0: 27 passed, 11 todo, 0 failed |
| 6 | 10 test stub files exist under src/__tests__/ | VERIFIED | Confirmed: compliance/2, lib/1, api/3, infra/4 = 10 files total |
| 7 | PostgresSaver initialized from DIRECT_URL with langgraph schema | VERIFIED | `src/lib/checkpointer.ts`: `PostgresSaver.fromConnString(connString, { schema: "langgraph" })`, DIRECT_URL guard present |
| 8 | Consultation graph compiles with the PostgresSaver checkpointer | VERIFIED | `src/agents/orchestrator.ts`: `createConsultationGraph(cp)` on line 330, conditional on `consultationId && process.env.DIRECT_URL` |
| 9 | Inngest client created with id 'medicrew' | VERIFIED | `src/lib/inngest/client.ts`: `new Inngest({ id: "medicrew" })` |
| 10 | /api/inngest route exports GET, POST, and PUT handlers | VERIFIED | `src/app/api/inngest/route.ts`: `export const { GET, POST, PUT } = serve({...})` |
| 11 | Every agent name contains 'AI' and none start with 'Dr.' | VERIFIED | All 8 agents confirmed: Alex AI, Sarah AI, Maya AI, Priya AI, James AI, Chen AI, Emma AI, Triage AI. grep Dr. in definitions returns no matches. Test passes. |
| 12 | detectEmergency returns correct results for all 6 emergency categories | VERIFIED | 9 tests pass: cardiac, stroke, suicide+Lifeline, respiratory, bleeding, overdose all return isEmergency=true with callToAction='000'. Headache returns false. |
| 13 | Emergency check runs BEFORE LangGraph invocation in the consult route | VERIFIED | `src/app/api/consult/route.ts` lines 22-26: `detectEmergency(symptoms)` called before consent check and before any streamConsultation/runConsultation call |
| 14 | AHPRA disclaimer constant contains approved text | VERIFIED | `src/lib/compliance.ts`: contains "health information, not medical diagnosis or advice", "registered healthcare professional", "call 000". All 4 disclaimer tests pass. |
| 15 | Agent system prompts include AGENT_COMPLIANCE_RULE | VERIFIED | All 8 agent definition files import and interpolate `AGENT_COMPLIANCE_RULE`. Test confirms "you have [condition]" is in all system prompts. |
| 16 | A patient WITHOUT consent gets 403 from /api/consult | PARTIAL | `checkConsent` function correct. BUT consent gate is wrapped in `if (patientId)` — a request with no x-patient-id header bypasses consent check entirely. True 403 enforcement requires patientId to always be present or required. |
| 17 | /consent page has three checkboxes | VERIFIED | `src/app/consent/page.tsx`: Health Data Collection, AI Health Guidance, Overseas Data Processing checkboxes all present. Submit disabled until all checked. |
| 18 | GET /api/patient/export returns patient, consultations, notifications, consents | VERIFIED | `src/app/api/patient/export/route.ts`: prisma.patient.findUnique with `include: { consultations, notifications, consents }`. 2 tests pass. |
| 19 | DELETE /api/patient anonymises email to 'deleted-{id}@medicrew.au' and sets deletedAt | VERIFIED | `src/app/api/patient/route.ts`: `email: deleted-${patientId}@medicrew.au`, `deletedAt: now`, `deletedEmail: patient.email` preserved. 2 tests pass. |
| 20 | Supabase project locked to Sydney (ap-southeast-2) | NEEDS HUMAN | .env.example uses ap-southeast-2 URLs. Actual Supabase project region requires human confirmation in dashboard. |

**Score:** 17/20 truths verified (1 partial, 1 needs human, 1 gap in test coverage)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | PostgreSQL datasource with all models | VERIFIED | postgresql provider, DATABASE_URL+DIRECT_URL, 5 models including PatientConsent |
| `vitest.config.ts` | Test runner configuration | VERIFIED | defineConfig, node environment, src/__tests__ include |
| `prisma/migrations/0001_supabase_init/migration.sql` | PostgreSQL DDL + RLS | VERIFIED | 5 CREATE TABLE, 5 RLS enables, 7 policies, pg_cron job |
| `.env.example` | Environment variable template | VERIFIED | DATABASE_URL, DIRECT_URL, SUPABASE_SERVICE_ROLE_KEY, INNGEST keys all present |
| `src/lib/checkpointer.ts` | PostgresSaver singleton factory | VERIFIED | Exports getCheckpointer, uses DIRECT_URL, schema: "langgraph" |
| `src/lib/inngest/client.ts` | Inngest client singleton | VERIFIED | Exports inngest, id: "medicrew" |
| `src/app/api/inngest/route.ts` | Inngest serve handler | VERIFIED | Exports GET, POST, PUT via serve() |
| `src/lib/emergency-rules.ts` | detectEmergency pure function | VERIFIED | Exports detectEmergency and EmergencyResult, 8 regex patterns, no external I/O |
| `src/lib/compliance.ts` | AHPRA disclaimer constants | VERIFIED | Exports AHPRA_DISCLAIMER and AGENT_COMPLIANCE_RULE |
| `src/agents/definitions/gp.ts` | GP agent with AHPRA-safe name | VERIFIED | name: "Alex AI — GP", imports and uses AGENT_COMPLIANCE_RULE |
| `src/lib/consent-check.ts` | checkConsent function | VERIFIED | Queries prisma.patientConsent.findFirst with consentVersion "1.0", returns boolean |
| `src/app/consent/page.tsx` | Three-checkbox consent form | VERIFIED | Three checkboxes, all must be checked, posts to /api/patient/consent |
| `src/app/api/patient/export/route.ts` | Patient data export endpoint | VERIFIED | Exports GET, includes consultations/notifications/consents, returns 401 if no patientId |
| `src/app/api/patient/route.ts` | Patient soft delete endpoint | VERIFIED | Exports DELETE, anonymises email, preserves original in deletedEmail, sets deletedAt |
| `src/__tests__/infra/db-connection.test.ts` | Real INFRA-01 tests | STUB | Remains as 3 test.todo stubs — no real assertions |
| `src/__tests__/infra/rls-policies.test.ts` | Real INFRA-02 tests | STUB | Remains as 6 test.todo stubs — no real assertions |
| `src/__tests__/infra/inngest-handler.test.ts` | Real INFRA-04 tests | STUB | Remains as 2 test.todo stubs — no real assertions |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `prisma/schema.prisma` | `.env.example` | env("DATABASE_URL") and env("DIRECT_URL") | WIRED | Both env() calls present in schema, both vars in .env.example |
| `prisma/migrations/...migration.sql` | `prisma/schema.prisma` | RLS table names match schema | WIRED | Patient, Consultation, Doctor, Notification, PatientConsent all match |
| `src/lib/checkpointer.ts` | `process.env.DIRECT_URL` | PostgresSaver.fromConnString | WIRED | Line 7: `process.env.DIRECT_URL`, throws if missing |
| `src/agents/orchestrator.ts` | `src/lib/checkpointer.ts` | import getCheckpointer | WIRED | Line 13: `import { getCheckpointer } from "@/lib/checkpointer"` |
| `src/app/api/inngest/route.ts` | `src/lib/inngest/client.ts` | import inngest for serve | WIRED | Line 2: `import { inngest } from "@/lib/inngest/client"` |
| `src/app/api/consult/route.ts` | `src/lib/emergency-rules.ts` | detectEmergency called before LLM | WIRED | Line 3 import, lines 23-26 execution before any LLM branch |
| `src/agents/definitions/gp.ts` | `src/lib/compliance.ts` | imports AGENT_COMPLIANCE_RULE | WIRED | All 8 agent files import and interpolate AGENT_COMPLIANCE_RULE |
| `src/app/api/consult/route.ts` | `src/lib/consent-check.ts` | checkConsent called after emergency check | PARTIAL | Import exists, call exists at lines 32-38, BUT guarded by `if (patientId)` — bypass possible when header absent |
| `src/lib/consent-check.ts` | `prisma.patientConsent` | findFirst query | WIRED | prisma.patientConsent.findFirst with consentVersion "1.0" |
| `src/app/api/patient/route.ts` | `prisma.patient` | soft delete update | WIRED | `deleted-${patientId}@medicrew.au` pattern confirmed in update call |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| COMP-01 | 01-03 | AHPRA scope disclaimer in agent definitions and care summaries | SATISFIED | AHPRA_DISCLAIMER and AGENT_COMPLIANCE_RULE exported and tested. 4 tests pass. |
| COMP-02 | 01-03 | AI agents identified as AI — "AI" suffix, no bare "Dr." title | SATISFIED | All 8 agents use AI naming format. 4 agent-names tests pass. No Dr. prefix in any definition. |
| COMP-03 | 01-03 | Emergency signals trigger deterministic keyword detection before LLM | SATISFIED | detectEmergency with 8 regex patterns fires before streamConsultation/runConsultation. 9 tests pass. |
| COMP-04 | 01-04 | Patient onboarding includes explicit consent for data collection, AI guidance, overseas processing | PARTIAL | checkConsent function correct. Consent page exists with three required checkboxes. BUT: consent gate in /api/consult is bypassable when x-patient-id header is absent. /api/patient/consent POST endpoint not yet implemented (deferred to Phase 2). |
| COMP-05 | 01-04 | Patient can export data (APP 12) and request account deletion | SATISFIED | GET /api/patient/export returns all records. DELETE /api/patient anonymises with deletedAt. 4 tests pass. |
| COMP-06 | 01-01 | Supabase project locked to Sydney (ap-southeast-2) | NEEDS HUMAN | .env.example uses ap-southeast-2 URLs. Supabase project region must be confirmed in dashboard. |
| INFRA-01 | 01-01 | SQLite replaced with Supabase PostgreSQL | SATISFIED | Schema uses postgresql provider with DATABASE_URL + DIRECT_URL. Source verified. Tests remain as stubs. |
| INFRA-02 | 01-01 | Supabase RLS enabled — patients can only read/write own records | SATISFIED | 5 RLS enables + 7 policies in migration.sql confirmed. Source verified. Tests remain as stubs. |
| INFRA-03 | 01-02 | LangGraph PostgresSaver installed and configured | SATISFIED | checkpointer.ts exports getCheckpointer using DIRECT_URL + langgraph schema. 3 real tests pass. |
| INFRA-04 | 01-02 | Inngest configured for durable background jobs | SATISFIED | inngest client id "medicrew", /api/inngest exports GET/POST/PUT. Source verified. Tests remain as stubs. |

**No orphaned requirements.** All 10 Phase 1 requirements are accounted for across plans 01-01 through 01-04.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/api/consult/route.ts` | 31 | `if (patientId)` makes consent gate optional | Blocker | COMP-04 truth "patient without consent gets 403" is bypassable — any request without the x-patient-id header bypasses consent entirely |
| `src/__tests__/infra/db-connection.test.ts` | all | test.todo stubs — never converted to real tests | Warning | INFRA-01 has no automated test coverage. Implementation is correct in source but unverified by test suite. |
| `src/__tests__/infra/rls-policies.test.ts` | all | test.todo stubs — never converted to real tests | Warning | INFRA-02 has no automated test coverage. RLS migration is correct but unverified by tests. |
| `src/__tests__/infra/inngest-handler.test.ts` | all | test.todo stubs — never converted to real tests | Warning | INFRA-04 has no automated test coverage. Inngest client/route is correct but unverified by tests. |
| `src/app/consent/page.tsx` | 26 | Posts to `/api/patient/consent` which does not exist | Warning | The consent page submit will return 404 in production. /api/patient/consent POST is not yet implemented (deferred to Phase 2 per 01-04 summary). |

---

### Human Verification Required

#### 1. Supabase Sydney Region (COMP-06)

**Test:** Open the Supabase dashboard for this project and confirm the region shown is `ap-southeast-2 (Sydney)`.
**Expected:** Project settings show region as Sydney, Australia. The pooler URL pattern `aws-0-ap-southeast-2.pooler.supabase.com` is in the actual .env.local credentials.
**Why human:** Cloud project region cannot be verified from the codebase. The .env.example uses the correct URL pattern but the actual Supabase project must be confirmed.

#### 2. Consent Page UI and Submit Flow (COMP-04)

**Test:** Run `bun run dev`, navigate to `/consent`. Attempt to click "I Consent" without checking all boxes. Check all three boxes, then click "I Consent".
**Expected:** Submit button is disabled until all three boxes are checked. On submit, a POST request fires to `/api/patient/consent` (note: will return 404 until Phase 2 implements that endpoint — verify the request is sent correctly).
**Why human:** React state and conditional rendering require a browser to verify visually.

---

### Gaps Summary

Two gaps block full goal achievement:

**Gap 1 — Consent gate bypass (COMP-04):** The most significant issue. The consent enforcement in `/api/consult/route.ts` is conditional on whether the `x-patient-id` header is present. Any request that omits the header proceeds to LangGraph without consent validation. This means the system is not legally safe to show to real Australian patients for requests that lack the patient header. The fix is straightforward: make the patientId required (return 401 if absent) rather than treating its absence as "skip consent check." This is a one-line logic change but has compliance significance.

**Gap 2 — Three test stubs never converted (INFRA-01, INFRA-02, INFRA-04):** The db-connection, rls-policies, and inngest-handler test files were scaffolded in plan 01-01 with the intent that later plans would convert them to real tests. Plan 01-02 converted INFRA-03 (checkpointer) but left the other three as stubs. The underlying infrastructure is correctly implemented — this is a test coverage gap, not a functionality gap. The fix follows the pattern already established in `checkpointer.test.ts`: use `fs.readFileSync` to read schema/migration files and assert content, and use direct imports to assert exports.

**Note on /api/patient/consent:** The consent page posts to this endpoint which does not yet exist. This is documented as an intentional deferral to Phase 2 in the 01-04 summary. It is not a gap against Phase 1 goals since no plan claimed this endpoint — it is noted here as a known incomplete wiring that Phase 2 must address.

---

_Verified: 2026-03-26T11:20:00Z_
_Verifier: Claude (gsd-verifier)_

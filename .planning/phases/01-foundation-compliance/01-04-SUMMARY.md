---
phase: 01-foundation-compliance
plan: "04"
subsystem: api
tags: [privacy, consent, prisma, nextjs, app12, australian-privacy-act]

# Dependency graph
requires:
  - phase: 01-01
    provides: PatientConsent and Patient soft-delete fields in Prisma schema
  - phase: 01-03
    provides: Emergency detection gate already wired in /api/consult before LangGraph

provides:
  - checkConsent function querying PatientConsent table (consentVersion 1.0)
  - Consent gate in /api/consult returning 403 + redirectTo /consent when no consent
  - /consent page with three Privacy Act checkboxes (health data, AI guidance, overseas processing)
  - GET /api/patient/export returning all patient data (APP 12 compliant)
  - DELETE /api/patient soft-deleting with email anonymisation and 30-day grace period

affects: [02-supabase-auth, 03-patient-features, consent-api]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Header-based patient identity (x-patient-id) — temporary until Phase 2 Supabase Auth
    - Consent gate pattern: emergency check first, consent check second, LangGraph third
    - Soft delete with email anonymisation to deleted-{id}@medicrew.au and deletedEmail preservation

key-files:
  created:
    - src/lib/consent-check.ts
    - src/app/consent/page.tsx
    - src/app/api/patient/export/route.ts
    - src/app/api/patient/route.ts
    - src/__tests__/api/consult-consent-gate.test.ts (stub replaced)
    - src/__tests__/api/patient-export.test.ts (stub replaced)
    - src/__tests__/api/patient-delete.test.ts (stub replaced)
  modified:
    - src/app/api/consult/route.ts

key-decisions:
  - "Consent gate uses x-patient-id header (temporary) — Phase 2 Supabase Auth will replace with session-based identity"
  - "Soft delete preserves original email in deletedEmail field for 30-day recovery window before Phase 3 hard-delete job"
  - "Consent page posts to /api/patient/consent (not yet created) — Phase 2 will implement the consent record creation endpoint"

patterns-established:
  - "Consent check: checkConsent(patientId) returns boolean, queries prisma.patientConsent.findFirst with consentVersion 1.0"
  - "Soft delete pattern: email -> deleted-{id}@medicrew.au, deletedEmail preserved, PII fields nullified, deletedAt set"
  - "APP 12 export: single GET endpoint returns flat structure with patient, consultations, notifications, consents"

requirements-completed: [COMP-04, COMP-05]

# Metrics
duration: 2min
completed: "2026-03-26"
---

# Phase 01 Plan 04: Privacy Consent Flow, Data Export, and Account Deletion Summary

**Privacy Act compliance layer: consent gate blocking /api/consult (403), three-checkbox consent page, APP 12 data export, and soft-delete with email anonymisation to deleted-{id}@medicrew.au**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T11:11:41Z
- **Completed:** 2026-03-26T11:13:59Z
- **Tasks:** 2 of 2
- **Files modified:** 8

## Accomplishments

- Consent gate wired into /api/consult after emergency check and before LangGraph — returns 403 with redirectTo /consent when PatientConsent record missing
- /consent page renders three required Privacy Act disclosures: Health Data Collection, AI Health Guidance, Overseas Data Processing — all must be checked before submission
- GET /api/patient/export returns all patient data in one JSON response (APP 12 compliant) — patient fields, consultations, notifications, and consents
- DELETE /api/patient performs soft delete: email anonymised, PII nullified, deletedAt set, original email preserved in deletedEmail for 30-day recovery
- 7 tests passing across three test files (consent gate x3, export x2, delete x2)

## Task Commits

1. **Task 1: Consent gate, consent page, checkConsent module** - `589cf9a` (feat)
2. **Task 2: Patient data export and account deletion endpoints** - `06506ed` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/consent-check.ts` - checkConsent function: queries PatientConsent with consentVersion 1.0, returns boolean
- `src/app/consent/page.tsx` - Three-checkbox consent form for Privacy Act compliance
- `src/app/api/consult/route.ts` - Added consent gate after emergency check (imports checkConsent, returns 403)
- `src/app/api/patient/export/route.ts` - GET handler: APP 12 data export with all related records included
- `src/app/api/patient/route.ts` - DELETE handler: soft delete with email anonymisation and PII nullification
- `src/__tests__/api/consult-consent-gate.test.ts` - 3 tests for checkConsent module
- `src/__tests__/api/patient-export.test.ts` - 2 tests for export endpoint
- `src/__tests__/api/patient-delete.test.ts` - 2 tests for soft delete endpoint

## Decisions Made

- Consent gate uses x-patient-id header as temporary patient identity mechanism — Phase 2 Supabase Auth will replace with proper session-based identity
- Soft delete preserves original email in deletedEmail field for 30-day recovery window; Phase 3 scheduled job will hard-delete after 30 days
- /consent page posts to /api/patient/consent which is not yet implemented — Phase 2 will add the consent record creation endpoint alongside Supabase Auth integration

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] patient-delete test needed prisma.patient.findUnique mock in addition to update**

- **Found during:** Task 2 (patient delete endpoint)
- **Issue:** Plan's test template only mocked prisma.patient.update, but the DELETE handler fetches the current email via findUnique first (to preserve in deletedEmail) — test would have failed without the additional mock
- **Fix:** Added findUnique to the mock factory and to the test setup, matching the actual implementation
- **Files modified:** src/__tests__/api/patient-delete.test.ts
- **Verification:** bun run test -- patient-delete.test.ts passes 2/2
- **Committed in:** 06506ed (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Fix necessary for test correctness. No scope creep.

## Issues Encountered

- `bun test` does not use vitest globals — must use `bun run test` (which invokes `vitest run`) to get vi.mocked, vi.fn, etc. This matches the project's package.json test script. Plan verification commands used `bun test` but were updated to `bun run test` for actual execution.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Consent gate, export, and soft delete are complete and tested
- /api/patient/consent POST endpoint (to record consent) needs implementation — Phase 2 Supabase Auth plan should include this alongside session auth
- Hard delete scheduled job (30-day cleanup) deferred to Phase 3
- All Phase 1 foundation-compliance plans are now complete

---
*Phase: 01-foundation-compliance*
*Completed: 2026-03-26*

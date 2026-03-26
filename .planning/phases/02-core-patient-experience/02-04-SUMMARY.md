---
phase: 02-core-patient-experience
plan: "04"
subsystem: ui
tags: [react, nextjs, prisma, shadcn, care-summary, symptom-journal, health-profile, ahpra]

# Dependency graph
requires:
  - phase: 02-01
    provides: "Extended Patient schema with medications, allergies, emergencyContact, gpDetails, SymptomJournal model"
  - phase: 02-03
    provides: "Streaming consultation page with agent identity events including node_output with recommendation data"
provides:
  - "CareSummary component rendering urgency badge, findings, nextSteps, questionsForDoctor, timeframe, AHPRA disclaimer"
  - "CareSummary wired into consult/page.tsx — renders when recommendation arrives from recommend node_output"
  - "POST/GET /api/patient/journal — symptom journal CRUD with severity 1-5 validation"
  - "GET/PATCH /api/patient/profile — patient health profile read and update"
  - "HealthProfileForm component — read/edit knownConditions, medications, allergies, emergencyContact, gpDetails"
  - "SymptomJournalEntry component — severity selector (1-5), notes, recent entries with color-coded badges"
  - "/patient/profile page — two-column layout with HealthProfileForm and SymptomJournalEntry"
affects: [03-provider-portal, 04-analytics-insights]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CareSummary reads AHPRA_DISCLAIMER from compliance.ts — single source of truth for legal text"
    - "recommendation state extracted from node_output SSE event when step === 'recommend'"
    - "Profile and journal APIs use x-patient-id header (temp auth) — Phase 3 Supabase Auth will replace"
    - "HealthProfileForm uses edit-toggle pattern — read-only default, in-place edit mode on demand"
    - "Dynamic list fields (medications, allergies) use add/remove badge pattern with local state"

key-files:
  created:
    - src/components/consult/CareSummary.tsx
    - src/app/api/patient/journal/route.ts
    - src/app/api/patient/profile/route.ts
    - src/components/profile/HealthProfileForm.tsx
    - src/components/profile/SymptomJournalEntry.tsx
    - src/app/patient/profile/page.tsx
  modified:
    - src/app/consult/page.tsx

key-decisions:
  - "CareSummary renders only after streaming completes (!isStreaming) to avoid partial render during recommendation generation"
  - "dateOfBirth and gender shown read-only on profile page — set during onboarding, editing would risk data integrity"
  - "PATCH profile endpoint validates medications/allergies are arrays before update — Rule 2 auto-fix for input safety"
  - "Journal POST validates severity is an integer (not just a number) in range 1-5 — Rule 2 auto-fix for data integrity"

patterns-established:
  - "API route pattern: x-patient-id header auth gate, early return 401, then prisma operation"
  - "Edit-toggle components: editing state boolean, Cancel resets to prop values, Save sends PATCH"
  - "Dynamic badge lists: local array state, add/remove without form submission"

requirements-completed: [CONS-04, PROF-01, PROF-02, PROF-03]

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 02 Plan 04: Care Summary, Patient Profile, and Symptom Journal Summary

**CareSummary component with AHPRA disclaimer wired into post-consultation view, plus /patient/profile page with editable health profile (conditions, medications, allergies, emergency contact, GP) and symptom journal (severity 1-5, notes, recent entries)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T03:35:11Z
- **Completed:** 2026-03-26T03:39:09Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- CareSummary renders urgency badge (color-coded), summary, next steps, questions for doctor, timeframe, and AHPRA disclaimer after each consultation
- /patient/profile page (two-column desktop, single-column mobile) shows editable health profile and symptom journal
- Journal and profile API endpoints with auth gate and input validation

## Task Commits

Each task was committed atomically:

1. **Task 1: CareSummary component + profile and journal API endpoints** - `92f1d7a` (feat)
2. **Task 2: Patient health profile page with editable profile form and symptom journal** - `ce33fd6` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/consult/CareSummary.tsx` — Structured care summary with urgency badge, next steps, questions for doctor, AHPRA disclaimer
- `src/app/consult/page.tsx` — Added recommendation state, CareSummary import, CareSummary render after streaming completes
- `src/app/api/patient/journal/route.ts` — POST (severity 1-5 validation, notes) and GET (last 30 entries, ordered desc)
- `src/app/api/patient/profile/route.ts` — GET (health profile fields) and PATCH (partial update with array validation)
- `src/components/profile/HealthProfileForm.tsx` — Edit-toggle profile form, dynamic medications/allergies badge lists, emergency contact and GP fields
- `src/components/profile/SymptomJournalEntry.tsx` — Severity 1-5 selector (labeled Minimal-Very Severe), notes textarea, color-coded recent entries
- `src/app/patient/profile/page.tsx` — Profile page fetching from both profile and journal APIs, responsive two-column layout

## Decisions Made

- CareSummary only renders when `!isStreaming && recommendation` — prevents partial render during the recommend node streaming phase
- `dateOfBirth` and `gender` are read-only on the profile page (editable during onboarding only) to prevent data integrity issues
- PATCH profile validates `medications` and `allergies` are arrays before passing to Prisma — prevents type errors at the DB layer
- Journal POST validates `severity` is an integer (not float) in 1-5 range — enforces data model contract explicitly in the API layer

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added integer validation for journal severity**
- **Found during:** Task 1 (journal API implementation)
- **Issue:** Plan spec only checked `severity < 1 || severity > 5` but did not check `Number.isInteger(severity)` — a float like 2.5 would pass range check and store invalid data
- **Fix:** Added `!Number.isInteger(severity)` to the validation condition
- **Files modified:** src/app/api/patient/journal/route.ts
- **Verification:** Build passes, condition covers float input
- **Committed in:** 92f1d7a (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added array type validation for PATCH profile medications/allergies**
- **Found during:** Task 1 (profile API implementation)
- **Issue:** Prisma expects `medications` to be `string[]` — passing a non-array would throw at runtime
- **Fix:** Added `!Array.isArray(medications)` and `!Array.isArray(allergies)` guards with 400 response
- **Files modified:** src/app/api/patient/profile/route.ts
- **Verification:** Build passes
- **Committed in:** 92f1d7a (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical input validation)
**Impact on plan:** Both required for data integrity. No scope creep.

## Issues Encountered

None — build passed cleanly on first attempt for both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CONS-04, PROF-01, PROF-02, PROF-03 all satisfied
- Phase 02 complete (4 of 4 plans done) — ready for Phase 03 provider portal
- PROF-02 (patientContext injection) was completed in plan 02-03; no new work needed here
- /patient/profile is accessible but not yet linked from the Patient Portal nav (low priority, navigable directly)

---
*Phase: 02-core-patient-experience*
*Completed: 2026-03-26*

## Self-Check: PASSED

All 6 created/modified files confirmed on disk. Both task commits (92f1d7a, ce33fd6) verified in git log.

---
phase: 04-retention-polish
plan: "02"
subsystem: ui
tags: [react, nextjs, prisma, api, dashboard, care-plan]

# Dependency graph
requires:
  - phase: 03-proactive-care-loop
    provides: CheckIn model, care team status, check-in scheduling and response workflows
  - phase: 02-core-patient-experience
    provides: patient dashboard tabs, CareTeamCard pattern, consultation recommendation JSON structure
provides:
  - GET /api/patient/care-plan endpoint aggregating monitoring status, next check-in, action items
  - CarePlanDetail component rendering care plan on patient dashboard
  - Patient dashboard care-plan tab backed by real data (replaces Phase 2 placeholder)
affects: [patient-dashboard, care-plan-ux, monitoring-visibility]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - x-patient-id header auth gate (same pattern as all patient API routes)
    - Promise.all parallel Prisma queries for aggregation endpoints
    - Derived status computation at query time (not stored) — monitoringStatus derived from check-in + consultation age

key-files:
  created:
    - src/app/api/patient/care-plan/route.ts
    - src/components/dashboard/CarePlanDetail.tsx
  modified:
    - src/app/patient/page.tsx

key-decisions:
  - "monitoringStatus derived at query time: active if pending check-in OR consultation within 7 days — not stored in DB"
  - "actionItems extracted client-side from recommendation.nextSteps array — API returns raw array, component renders"
  - "Check-in history rows show status + response badges (better=green, same=yellow, worse=red) for quick scan"
  - "en-AU locale with Australia/Sydney timezone for next check-in display per target market"

patterns-established:
  - "Aggregation API pattern: Promise.all parallel queries, derive computed fields, return flat JSON"
  - "Dashboard card pattern: Card per concern (monitoring / next check-in / action items / history) + AHPRA disclaimer"

requirements-completed: [DASH-02]

# Metrics
duration: 8min
completed: 2026-03-26
---

# Phase 4 Plan 02: Care Plan UI on Dashboard Summary

**CarePlanDetail component on patient dashboard backed by /api/patient/care-plan aggregation endpoint — replaces Phase 2 placeholder with monitoring status, next check-in (en-AU locale), action items from consultation recommendation, and AHPRA disclaimer**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-26T07:00:00Z
- **Completed:** 2026-03-26T07:08:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- GET /api/patient/care-plan endpoint with parallel Prisma queries (consultation, check-ins, care team status) and derived monitoringStatus
- CarePlanDetail component with four section cards: monitoring status, next check-in, action items, recent check-in history
- Patient dashboard care-plan tab fully replaced — "Coming in Phase 3" placeholder removed
- AHPRA informational disclaimer present in component
- Build passes with zero errors

## Task Commits

1. **Task 1: Care plan aggregation API endpoint** - `a6e8d79` (feat)
2. **Task 2: CarePlanDetail component and dashboard integration** - `b1919b1` (feat)

## Files Created/Modified

- `src/app/api/patient/care-plan/route.ts` - GET endpoint: auth gate, parallel Prisma queries, derives monitoringStatus, extracts actionItems from recommendation.nextSteps
- `src/components/dashboard/CarePlanDetail.tsx` - Care plan card layout (50+ lines): monitoring status badge, next check-in en-AU, action items checklist, check-in history, AHPRA disclaimer
- `src/app/patient/page.tsx` - Added CarePlanDetail import, replaced placeholder care-plan tab with `<CarePlanDetail patientId={patient.id} />`

## Decisions Made

- `monitoringStatus` computed at query time: active if pending check-in OR consultation within last 7 days — avoids stale status in DB
- actionItems extracted from `recommendation.nextSteps` array (JSON); component receives flat string array from API
- Check-in response colors: better=green (default badge), same=yellow (secondary badge), worse=red (destructive badge) for at-a-glance scan
- en-AU locale with `Australia/Sydney` timezone for all date display per target market

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Care Plan tab is now data-driven and ready for Phase 4 retention polish (notifications, gamification, etc.)
- monitoringStatus logic can be extended to include more signals without schema changes
- AHPRA disclaimer pattern established for all patient-facing health information displays

---
*Phase: 04-retention-polish*
*Completed: 2026-03-26*

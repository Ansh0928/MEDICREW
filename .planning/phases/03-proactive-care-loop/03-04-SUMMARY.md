---
phase: 03-proactive-care-loop
plan: "04"
subsystem: api
tags: [monitoring, doctor-portal, prisma, urgency-escalation, careTeamStatus]

requires:
  - phase: 03-proactive-care-loop
    plan: "01"
    provides: CheckIn model with pending/responded/expired status flow
  - phase: 03-proactive-care-loop
    plan: "02"
    provides: CareTeamStatus JSONB with agentName/message/updatedAt per role; effectiveUrgency escalation

provides:
  - GET /api/doctor/monitoring — all active patients sorted by urgency with lastCheckIn, lastConsultation, effectiveUrgency, lastAgentActivity
  - MonitoringQueue React component — 4-column card grid with urgency badges (destructive/default/secondary/outline)
  - Doctor portal Monitoring Queue tab — integrated alongside Patients tab with Activity icon

affects: [04-03]

tech-stack:
  added: []
  patterns:
    - "Monitoring API: Prisma select with nested take:1 orderBy for latest check-in and consultation"
    - "effectiveUrgency computed field: 'worse' check-in response promotes urgency to 'urgent'"
    - "CareTeamStatus JSONB scanned via Object.values().sort() to find most recent agent activity"
    - "Doctor portal tabs: activeTab state union type extended with 'monitoring' literal"

key-files:
  created:
    - src/app/api/doctor/monitoring/route.ts
    - src/components/doctor/MonitoringQueue.tsx
  modified:
    - src/app/doctor/page.tsx

key-decisions:
  - "MonitoringQueue uses card grid layout (not HTML table) — responsive 4-column grid collapses on mobile"
  - "effectiveUrgency is computed at query time in API — not stored — avoids stale urgency in DB"
  - "lastAgentActivity extracted by sorting all CareTeamStatus JSONB values by updatedAt descending"
  - "Doctor portal activeTab type narrowed to 'patients' | 'monitoring' (notifications tab removed from plan scope)"

patterns-established:
  - "Urgency sort order: emergency(0) > urgent(1) > routine(2) > self_care(3) > no-data(4)"
  - "Badge variants: emergency=destructive, urgent=default, routine=secondary, self_care=outline"
  - "Response color classes: better=text-green-600, same=text-yellow-600, worse=text-red-600"

requirements-completed: [ESCL-03]

duration: included in wave 2 commit (ad5abad)
completed: 2026-03-26
---

# Phase 3 Plan 04: Doctor Monitoring Queue Summary

**GET /api/doctor/monitoring endpoint + MonitoringQueue component giving doctors a single urgency-sorted view of all active patients with check-in status, escalation tier, and last agent activity.**

## Performance

- **Duration:** Included in wave 2 commit (ad5abad)
- **Started:** 2026-03-26
- **Completed:** 2026-03-26
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- GET /api/doctor/monitoring: fetches all active patients (deletedAt null), computes effectiveUrgency ("worse" check-in → "urgent"), sorts emergency > urgent > routine > self_care, extracts lastAgentActivity from CareTeamStatus JSONB
- MonitoringQueue component: fetches on mount, renders 4-column card grid (patient info + urgency badge, last check-in with color-coded response, last consultation excerpt, last agent activity)
- Doctor portal tab extended: "Monitoring Queue" tab button with Activity icon, activeTab union includes "monitoring"

## Task Commits

Both tasks included in wave 2 batch commit:

1. **Task 1: Monitoring API endpoint** - `ad5abad` (feat)
2. **Task 2: MonitoringQueue component + doctor portal integration** - `ad5abad` (feat)

## Files Created/Modified

- `src/app/api/doctor/monitoring/route.ts` — GET endpoint: Prisma findMany with nested checkIns/consultations/careTeamStatus; effectiveUrgency computed field; urgency sort
- `src/components/doctor/MonitoringQueue.tsx` — Client component: fetch on mount, loading/empty states, card grid with URGENCY_BADGE and RESPONSE_COLOR lookup maps
- `src/app/doctor/page.tsx` — Added MonitoringQueue import, Activity icon, "Monitoring Queue" tab button, monitoring tab content with motion.div

## Decisions Made

- MonitoringQueue uses a responsive card grid (not HTML table) — 4-column md layout collapses to 1-column on mobile
- effectiveUrgency computed at query time in the API, not stored, to avoid stale urgency values in the database
- CareTeamStatus JSONB last agent activity determined by sorting all role entries by updatedAt descending — most recent agent wins regardless of role

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 complete: all 4 plans delivered (check-in job, escalation rules, notification inbox, monitoring queue)
- Phase 4 (Retention + Polish) can begin: symptom trend charts, care plan UI, and monitoring queue urgency trend indicators
- Monitoring queue urgency trend indicators (04-03) can consume the same /api/doctor/monitoring endpoint — extend with historical checkIn aggregation

---
*Phase: 03-proactive-care-loop*
*Completed: 2026-03-26*

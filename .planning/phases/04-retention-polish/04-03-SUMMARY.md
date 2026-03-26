---
phase: 04-retention-polish
plan: "03"
subsystem: ui, api
tags: [monitoring, doctor-portal, prisma, lucide-react, next.js]

# Dependency graph
requires:
  - phase: 03-proactive-care-loop
    provides: "MonitoringQueue component and /api/doctor/monitoring endpoint with effectiveUrgency"
provides:
  - "urgencyTrend field (improving/stable/worsening/insufficient_data) on monitoring API response"
  - "Visual trend arrows (TrendingUp/TrendingDown/Minus) on each MonitoringQueue patient card"
affects: [04-retention-polish, doctor-portal, monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Trend computation via scored average across responded check-ins: better=-1, same=0, worse=+1"
    - "Threshold-based categorisation: avg <= -0.3 improving, avg >= 0.3 worsening, else stable"
    - "Lucide LucideIcon type used for icon map pattern (icon stored as component reference)"

key-files:
  created: []
  modified:
    - src/app/api/doctor/monitoring/route.ts
    - src/components/doctor/MonitoringQueue.tsx

key-decisions:
  - "checkIns query expanded from take:1 to take:5 to enable multi-check-in trend analysis"
  - "Patients with fewer than 2 responded check-ins return insufficient_data — no false trend signals"
  - "Trend computation averages all responded check-ins in the 5-item window, not just first and last"
  - "TREND_INDICATOR map stores icon as LucideIcon reference — extracted to TrendIcon const inside map loop for JSX rendering"

patterns-established:
  - "TREND_INDICATOR: Record<string, { icon: LucideIcon; label: string; className: string }> — reusable pattern for icon + label + color maps"

requirements-completed: [DASH-02, PROF-03]

# Metrics
duration: 1min
completed: 2026-03-26
---

# Phase 4 Plan 03: Doctor Monitoring Queue Urgency Trends Summary

**Urgency trend arrows (improving/stable/worsening) on doctor monitoring queue cards, computed from last 5 check-in response scores via threshold-averaged scoring**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-26T07:55:15Z
- **Completed:** 2026-03-26T07:56:15Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Monitoring API now fetches last 5 check-ins per patient and computes urgencyTrend from responded check-ins only
- Trend scoring algorithm: better=-1, same=0, worse=+1; average <= -0.3 = improving, >= 0.3 = worsening, else stable
- MonitoringQueue patient cards display a trend arrow icon + label beneath the urgency badge

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend monitoring API with urgency trend computation** - `d2dd79c` (feat)
2. **Task 2: Add trend indicators to MonitoringQueue cards** - `6c49b28` (feat)

**Plan metadata:** (docs commit — see final commit below)

## Files Created/Modified

- `src/app/api/doctor/monitoring/route.ts` - checkIns expanded to take:5; urgencyTrend computed and returned per patient
- `src/components/doctor/MonitoringQueue.tsx` - urgencyTrend in interface, TREND_INDICATOR map, TrendingUp/TrendingDown/Minus icons rendered per card

## Decisions Made

- checkIns query changed from take:1 to take:5 — needed minimum window for trend analysis
- Patients with fewer than 2 responded check-ins yield "insufficient_data" to avoid misleading trend signals
- Trend icon stored as LucideIcon component reference in map; extracted to TrendIcon const in render loop for JSX compatibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Stale `.next/lock` file from a prior build process caused Next.js to refuse the build on first attempt. Removed the lock file and re-ran — build passed cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Doctor monitoring queue now surfaces trend direction alongside point-in-time urgency
- Doctors can spot patients trending worse before they escalate to emergency
- Ready for Phase 4 plan 04 (if applicable) or Phase 4 completion

---
*Phase: 04-retention-polish*
*Completed: 2026-03-26*

## Self-Check: PASSED

- FOUND: src/app/api/doctor/monitoring/route.ts
- FOUND: src/components/doctor/MonitoringQueue.tsx
- FOUND: .planning/phases/04-retention-polish/04-03-SUMMARY.md
- FOUND: commit d2dd79c (Task 1)
- FOUND: commit 6c49b28 (Task 2)

---
phase: 04-retention-polish
plan: "01"
subsystem: ui
tags: [recharts, react, chart, symptom-journal, line-chart, ahpra]

# Dependency graph
requires:
  - phase: 02-core-patient-experience
    provides: SymptomJournal model and journal API (POST/GET) with x-patient-id auth pattern
provides:
  - GET /api/patient/journal/trends — chronological symptom entries (asc, take 90) for chart rendering
  - SymptomTrendChart component — recharts line chart of severity (1-5) over time with AHPRA disclaimer
  - Profile page extended with full-width trend chart below two-column journal/profile layout
affects: [future phase analytics, any UI consuming symptom severity data]

# Tech tracking
tech-stack:
  added: [recharts@3.8.1]
  patterns: [x-patient-id header auth on new trends endpoint, custom Recharts tooltip component, severity label map reuse pattern]

key-files:
  created:
    - src/app/api/patient/journal/trends/route.ts
    - src/components/profile/SymptomTrendChart.tsx
  modified:
    - src/app/patient/profile/page.tsx
    - package.json

key-decisions:
  - "Trends endpoint returns asc order (not desc like journal GET) — chart requires chronological data"
  - "take: 90 for ~3 months of daily logging — balances recency with trend visibility"
  - "SymptomTrendChart fetches its own data via patientId prop — decoupled from page-level data loading"
  - "AHPRA disclaimer rendered below chart: informational purposes only, not a medical diagnosis"
  - "Chart integrated full-width below two-column grid — avoids cramping the existing layout"

patterns-established:
  - "Trend/analytics endpoints use asc ordering distinct from list endpoints which use desc"
  - "Chart components are self-fetching via patientId prop, not fed data from parent"
  - "AHPRA compliance disclaimer must accompany all health data visualisations"

requirements-completed: [PROF-03]

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 4 Plan 01: Symptom Trend Chart Summary

**Recharts line chart of symptom severity (1-5) over time added to patient profile page, backed by a new chronological trends API endpoint, with AHPRA health information disclaimer**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T06:55:11Z
- **Completed:** 2026-03-26T06:56:43Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created GET /api/patient/journal/trends returning last 90 entries in chronological (asc) order for chart rendering
- Built SymptomTrendChart component with Recharts ResponsiveContainer, Y-axis bounded 1-5 with severity labels, custom tooltip showing date/severity/notes, loading skeleton, and empty state
- Integrated chart full-width below the existing two-column profile/journal layout, passing patientId from fetched profile data

## Task Commits

Each task was committed atomically:

1. **Task 1: Trends API endpoint and recharts install** - `98ced57` (feat)
2. **Task 2: SymptomTrendChart component and profile page integration** - `b347339` (feat)

**Plan metadata:** see final docs commit below

## Files Created/Modified

- `src/app/api/patient/journal/trends/route.ts` - GET endpoint returning chronological journal entries for chart
- `src/components/profile/SymptomTrendChart.tsx` - Self-fetching recharts line chart with AHPRA disclaimer
- `src/app/patient/profile/page.tsx` - Imports and renders SymptomTrendChart below two-column grid
- `package.json` / `bun.lock` - recharts@3.8.1 added

## Decisions Made

- Trends endpoint returns `orderBy: { createdAt: "asc" }` unlike the existing journal GET (desc) — chart data must be chronological
- `take: 90` selected for ~3 months of daily logging coverage
- Chart is self-fetching via patientId prop to keep it decoupled from page-level state management
- Chart rendered full-width below the existing two-column layout rather than inside a column to avoid cramping
- AHPRA disclaimer: "This chart shows self-reported symptom data for informational purposes only. It is not a medical diagnosis."

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Symptom trend visualisation complete for PROF-03
- Chart is ready for future enhancements (date range filtering, multi-symptom overlay)
- Ready to proceed with remaining Phase 4 retention polish plans

---
*Phase: 04-retention-polish*
*Completed: 2026-03-26*

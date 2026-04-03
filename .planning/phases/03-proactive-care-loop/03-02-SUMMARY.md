---
phase: 03-proactive-care-loop
plan: 02
subsystem: api
tags: [escalation, rules-engine, checkin, supabase-realtime, careTeamStatus]

requires:
  - phase: 03-proactive-care-loop
    plan: 01
    provides: CheckIn model, check-in notification flow

provides:
  - evaluateCheckInResponse() pure function — classifies Better/Same/Worse + emergency override
  - POST /api/checkin/respond endpoint — validates ownership, runs escalation, upserts CareTeamStatus
  - Emergency keywords reuse Phase 1 detectEmergency rules engine
  - urgency tier escalation writes to CareTeamStatus for Supabase Realtime pickup

affects: [03-03, 03-04]

tech-stack:
  added: []
  patterns:
    [
      "Pure escalation rules function (no DB side effects)",
      "Respond route owns all DB writes",
    ]

key-files:
  created:
    - src/lib/escalation-rules.ts
    - src/app/api/checkin/respond/route.ts
    - src/__tests__/lib/escalation-rules.test.ts

key-decisions:
  - "escalation-rules.ts is a pure function — no Prisma imports, fully testable"
  - "CareTeamStatus upsert lives in the respond route, not in escalation rules"
  - "Emergency detection delegates to existing detectEmergency from Phase 1"

patterns-established:
  - "Worse response: sets urgency=urgent, creates specialist notification, upserts CareTeamStatus"
  - "Emergency override: sets urgency=emergency, creates 000 notification regardless of text sentiment"

requirements-completed: [CHKN-03, ESCL-01, ESCL-02]

duration: included in wave 1 commit
completed: 2026-03-26
---

# Phase 3 Plan 02: Escalation Rules Engine

**Deterministic check-in response classification — Worse escalates urgency, emergency overrides to 000 referral.**

## Accomplishments

- evaluateCheckInResponse() pure function: Better/Same/Worse classification + emergency keyword override
- POST /api/checkin/respond: ownership validation, escalation logic, CareTeamStatus upsert, Supabase Realtime push
- 9 new escalation-rules tests (47 total passing)

## Self-Check: PASSED

- grep "evaluateCheckInResponse" src/lib/escalation-rules.ts: 1 match
- src/app/api/checkin/respond/route.ts exists
- 47 tests passing (9 new escalation-rules tests)

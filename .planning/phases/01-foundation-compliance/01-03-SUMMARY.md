---
phase: 01-foundation-compliance
plan: 03
subsystem: compliance
tags: [ahpra, emergency-detection, agent-naming, tdd, vitest, typescript]

# Dependency graph
requires:
  - phase: 01-foundation-compliance/01-01
    provides: Vitest infrastructure and stub test files

provides:
  - detectEmergency pure function with 8 emergency categories and 000 referral
  - AHPRA_DISCLAIMER and AGENT_COMPLIANCE_RULE compliance constants
  - All 8 agents renamed to "AI" format (no Dr. prefix)
  - AGENT_COMPLIANCE_RULE in all agent system prompts
  - Emergency detection gate in /api/consult before LLM invocation

affects:
  - All future agent work (naming convention established)
  - Consult route (emergency gate is now a permanent pre-LLM check)
  - Care summary generation (AHPRA_DISCLAIMER will be appended)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD: write failing tests first, then implement source"
    - "Compliance constants imported into agent definitions via template literal in systemPrompt"
    - "Emergency detection runs deterministically before any LLM call in consult route"

key-files:
  created:
    - src/lib/emergency-rules.ts
    - src/lib/compliance.ts
    - src/__tests__/lib/emergency-rules.test.ts
    - src/__tests__/compliance/disclaimer.test.ts
  modified:
    - src/agents/definitions/gp.ts
    - src/agents/definitions/cardiology.ts
    - src/agents/definitions/mental-health.ts
    - src/agents/definitions/dermatology.ts
    - src/agents/definitions/orthopedic.ts
    - src/agents/definitions/gastro.ts
    - src/agents/definitions/physiotherapy.ts
    - src/agents/definitions/triage.ts
    - src/app/api/consult/route.ts
    - src/__tests__/compliance/agent-names.test.ts

key-decisions:
  - "Agent names use em dash format: 'Alex AI — GP' (not 'Alex AI (GP)' or 'Dr. Alex')"
  - "Emergency detection is keyword/regex only — no LLM involved, pure function with no I/O"
  - "AGENT_COMPLIANCE_RULE appended via template literal interpolation, not hardcoded string duplication"
  - "Suicide category includes Lifeline 13 11 14 as additionalLine, all other emergencies only get 000"

patterns-established:
  - "Compliance pattern: import AGENT_COMPLIANCE_RULE from @/lib/compliance, append to systemPrompt via ${AGENT_COMPLIANCE_RULE}"
  - "Emergency gate pattern: detectEmergency(symptoms) called before any branching on stream/non-stream in consult route"
  - "Agent naming: [FirstName] AI — [Specialty] (em dash, no Dr. prefix)"

requirements-completed: [COMP-01, COMP-02, COMP-03]

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 01 Plan 03: AHPRA Compliance Layer Summary

**Regex-based emergency rules engine (8 categories, Lifeline for suicide), AHPRA compliance constants, all 8 agents renamed to AI format, and deterministic pre-LLM emergency gate in consult route**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T02:05:50Z
- **Completed:** 2026-03-26T02:08:58Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Emergency rules engine with 8 deterministic regex patterns — cardiac, stroke, suicide (+ Lifeline 13 11 14), respiratory, bleeding, overdose, unconscious, anaphylaxis
- AHPRA_DISCLAIMER and AGENT_COMPLIANCE_RULE constants in src/lib/compliance.ts
- All 8 patient-facing agents renamed: Alex AI, Sarah AI, Maya AI, Priya AI, James AI, Chen AI, Emma AI, Triage AI — no Dr. prefix
- AGENT_COMPLIANCE_RULE injected into all 8 system prompts via template literal
- detectEmergency wired into /api/consult POST handler before any LLM invocation (streamConsultation or runConsultation)
- 17 tests passing across 3 compliance test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Emergency rules engine and compliance constants** - `60532e4` (feat + test)
2. **Task 2: Agent renaming, compliance rule in prompts, emergency gate** - `9ac68a1` (feat)

**Plan metadata:** (docs commit — created below)

## Files Created/Modified
- `src/lib/emergency-rules.ts` - detectEmergency pure function with EmergencyResult interface
- `src/lib/compliance.ts` - AHPRA_DISCLAIMER and AGENT_COMPLIANCE_RULE constants
- `src/__tests__/lib/emergency-rules.test.ts` - 9 tests for emergency detection
- `src/__tests__/compliance/disclaimer.test.ts` - 4 tests for AHPRA constants
- `src/__tests__/compliance/agent-names.test.ts` - 4 tests for AI naming compliance
- `src/agents/definitions/gp.ts` - Renamed to Alex AI, compliance rule added
- `src/agents/definitions/cardiology.ts` - Renamed to Sarah AI, compliance rule added
- `src/agents/definitions/mental-health.ts` - Renamed to Maya AI, compliance rule added
- `src/agents/definitions/dermatology.ts` - Renamed to Priya AI, compliance rule added
- `src/agents/definitions/orthopedic.ts` - Renamed to James AI, compliance rule added
- `src/agents/definitions/gastro.ts` - Renamed to Chen AI, compliance rule added
- `src/agents/definitions/physiotherapy.ts` - Renamed to Emma AI, compliance rule added
- `src/agents/definitions/triage.ts` - Renamed to Triage AI, compliance rule added
- `src/app/api/consult/route.ts` - Emergency gate added before LLM branching

## Decisions Made
- Agent name format uses em dash ("Alex AI — GP") matching AHPRA safe AI identification guidance
- detectEmergency is a pure function with zero external dependencies — deterministic, testable, no latency
- AGENT_COMPLIANCE_RULE appended as template literal interpolation to avoid string duplication across 8 files
- Suicide category uniquely includes Lifeline additionalLine; all other emergencies only return 000

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- AHPRA compliance layer complete — all 3 COMP requirements satisfied
- Emergency detection is live and gates all consultations
- Agent naming convention established — ready for UI display work
- Care summary generation (plan 04) can now import AHPRA_DISCLAIMER directly from src/lib/compliance.ts

---
*Phase: 01-foundation-compliance*
*Completed: 2026-03-26*

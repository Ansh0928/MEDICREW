---
phase: 2
slug: core-patient-experience
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 (installed in Phase 1) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `bun run test` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** `bun run test src/__tests__/api/ src/__tests__/agents/`
- **After every plan wave:** `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| ONBD-01 | 02-01 | 1 | ONBD-01 | unit | `bun run test src/__tests__/api/patient-onboarding.test.ts` | ❌ W0 | ⬜ pending |
| ONBD-02 | 02-01 | 1 | ONBD-02 | unit | `bun run test src/__tests__/api/patient-consent-api.test.ts` | ❌ W0 | ⬜ pending |
| ONBD-03 | 02-01 | 1 | ONBD-03 | unit | `bun run test src/__tests__/onboarding/care-team-config.test.ts` | ❌ W0 | ⬜ pending |
| DASH-01 | 02-02 | 2 | DASH-01 | unit | `bun run test src/__tests__/api/care-team-status.test.ts` | ❌ W0 | ⬜ pending |
| DASH-02 | 02-02 | 2 | DASH-02 | manual | N/A — visual verification of care plan card | N/A | ⬜ pending |
| DASH-03 | 02-02 | 2 | DASH-03 | unit | `bun run test src/__tests__/api/consultation-history.test.ts` | ❌ W0 | ⬜ pending |
| DASH-04 | 02-02 | 2 | DASH-04 | unit | `bun run test src/__tests__/lib/supabase-realtime.test.ts` | ❌ W0 | ⬜ pending |
| CONS-01 | 02-03 | 2 | CONS-01 | unit | `bun run test src/__tests__/api/consult-stream-identity.test.ts` | ❌ W0 | ⬜ pending |
| CONS-02 | 02-03 | 2 | CONS-02 | unit | `bun run test src/__tests__/api/consult-stream-events.test.ts` | ❌ W0 | ⬜ pending |
| CONS-03 | 02-03 | 2 | CONS-03 | unit | `bun run test src/__tests__/api/consult-stream-identity.test.ts` | ❌ W0 | ⬜ pending |
| CONS-04 | 02-04 | 3 | CONS-04 | unit | `bun run test src/__tests__/components/care-summary.test.ts` | ❌ W0 | ⬜ pending |
| PROF-01 | 02-04 | 3 | PROF-01 | manual | N/A — visual verification of profile page rendering | N/A | ⬜ pending |
| PROF-02 | 02-04 | 3 | PROF-02 | unit | `bun run test src/__tests__/agents/profile-context-injection.test.ts` | ❌ W0 | ⬜ pending |
| PROF-03 | 02-04 | 3 | PROF-03 | unit | `bun run test src/__tests__/api/symptom-journal.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/api/patient-onboarding.test.ts` — stubs for ONBD-01
- [ ] `src/__tests__/api/patient-consent-api.test.ts` — stubs for ONBD-02
- [ ] `src/__tests__/onboarding/care-team-config.test.ts` — stubs for ONBD-03
- [ ] `src/__tests__/api/care-team-status.test.ts` — stubs for DASH-01
- [ ] `src/__tests__/api/consultation-history.test.ts` — stubs for DASH-03
- [ ] `src/__tests__/lib/supabase-realtime.test.ts` — stubs for DASH-04
- [ ] `src/__tests__/api/consult-stream-identity.test.ts` — stubs for CONS-01, CONS-03
- [ ] `src/__tests__/components/care-summary.test.ts` — stubs for CONS-04
- [ ] `src/__tests__/agents/profile-context-injection.test.ts` — stubs for PROF-02
- [ ] `src/__tests__/api/symptom-journal.test.ts` — stubs for PROF-03
- [ ] `src/__tests__/api/consult-stream-events.test.ts` — stubs for CONS-02

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Patient profile page renders conditions, medications, allergies | PROF-01 | React component visual render — no headless test env | Navigate to `/patient/profile`, verify conditions/medications/allergies sections render with data |
| Active care plan card renders without errors | DASH-02 | Static UI card — no logic to unit test | Navigate to `/patient/dashboard`, verify care plan card visible with correct copy |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

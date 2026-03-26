---
phase: 1
slug: foundation-compliance
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (Wave 0 installs — none detected in codebase) |
| **Config file** | `vitest.config.ts` — Wave 0 creates |
| **Quick run command** | `bun test` |
| **Full suite command** | `bun test --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the test file matching the module just written (see Per-Task Verification Map)
- **After every plan wave:** Run `bun test --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| COMP-01 | 01-03 | 2 | COMP-01 | unit | `bun test src/__tests__/compliance/disclaimer.test.ts` | ❌ W0 | ⬜ pending |
| COMP-02 | 01-03 | 2 | COMP-02 | unit | `bun test src/__tests__/compliance/agent-names.test.ts` | ❌ W0 | ⬜ pending |
| COMP-03a | 01-03 | 2 | COMP-03 | unit | `bun test src/__tests__/lib/emergency-rules.test.ts` | ❌ W0 | ⬜ pending |
| COMP-03b | 01-03 | 2 | COMP-03 | unit | `bun test src/__tests__/lib/emergency-rules.test.ts` | ❌ W0 | ⬜ pending |
| COMP-04 | 01-04 | 3 | COMP-04 | integration | `bun test src/__tests__/api/consult-consent-gate.test.ts` | ❌ W0 | ⬜ pending |
| COMP-05a | 01-04 | 3 | COMP-05 | integration | `bun test src/__tests__/api/patient-export.test.ts` | ❌ W0 | ⬜ pending |
| COMP-05b | 01-04 | 3 | COMP-05 | integration | `bun test src/__tests__/api/patient-delete.test.ts` | ❌ W0 | ⬜ pending |
| COMP-06 | 01-01 | 1 | COMP-06 | manual | N/A — Supabase Dashboard region check | N/A | ⬜ pending |
| INFRA-01 | 01-01 | 1 | INFRA-01 | smoke | `bun test src/__tests__/infra/db-connection.test.ts` | ❌ W0 | ⬜ pending |
| INFRA-02 | 01-01 | 1 | INFRA-02 | smoke | `bun test src/__tests__/infra/rls-policies.test.ts` | ❌ W0 | ⬜ pending |
| INFRA-03 | 01-02 | 2 | INFRA-03 | smoke | `bun test src/__tests__/infra/checkpointer.test.ts` | ❌ W0 | ⬜ pending |
| INFRA-04 | 01-02 | 2 | INFRA-04 | smoke | `bun test src/__tests__/infra/inngest-handler.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — install vitest: `bun add -D vitest @vitest/coverage-v8`
- [ ] `src/__tests__/` directory structure
- [ ] `src/__tests__/compliance/disclaimer.test.ts` — stubs for COMP-01
- [ ] `src/__tests__/compliance/agent-names.test.ts` — stubs for COMP-02
- [ ] `src/__tests__/lib/emergency-rules.test.ts` — stubs for COMP-03
- [ ] `src/__tests__/api/consult-consent-gate.test.ts` — stubs for COMP-04
- [ ] `src/__tests__/api/patient-export.test.ts` — stubs for COMP-05 (export)
- [ ] `src/__tests__/api/patient-delete.test.ts` — stubs for COMP-05 (delete)
- [ ] `src/__tests__/infra/db-connection.test.ts` — stubs for INFRA-01
- [ ] `src/__tests__/infra/rls-policies.test.ts` — stubs for INFRA-02
- [ ] `src/__tests__/infra/checkpointer.test.ts` — stubs for INFRA-03
- [ ] `src/__tests__/infra/inngest-handler.test.ts` — stubs for INFRA-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase project region is ap-southeast-2 | COMP-06 | Region set at project creation in Supabase Dashboard — no programmatic check | Open Supabase Dashboard → Project Settings → General → Confirm region shows "ap-southeast-2 (Sydney)" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

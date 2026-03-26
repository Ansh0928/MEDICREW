---
phase: 3
slug: proactive-care-loop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (root) |
| **Quick run command** | `bun run test --run src/__tests__/` |
| **Full suite command** | `bun run test --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test --run src/__tests__/`
- **After every plan wave:** Run `bun run test --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | CHKN-01 | unit | `bun run test --run src/__tests__/checkin-inngest.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | CHKN-02 | unit | `bun run test --run src/__tests__/checkin-inngest.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | CHKN-03 | unit | `bun run test --run src/__tests__/checkin-inngest.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 1 | CHKN-04 | unit | `bun run test --run src/__tests__/checkin-inngest.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | ESCL-01 | unit | `bun run test --run src/__tests__/escalation-rules.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | ESCL-02 | unit | `bun run test --run src/__tests__/escalation-rules.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 2 | NOTF-01 | unit | `bun run test --run src/__tests__/notifications.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 2 | NOTF-02 | unit | `bun run test --run src/__tests__/notifications.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-03 | 03 | 2 | NOTF-03 | manual | — | n/a | ⬜ pending |
| 3-04-01 | 04 | 2 | ESCL-03 | unit | `bun run test --run src/__tests__/monitoring-queue.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/escalation-rules.test.ts` — stubs for ESCL-01, ESCL-02
- [ ] `src/__tests__/checkin-inngest.test.ts` — stubs for CHKN-01, CHKN-02, CHKN-03, CHKN-04
- [ ] `src/__tests__/notifications.test.ts` — stubs for NOTF-01, NOTF-02
- [ ] `src/__tests__/monitoring-queue.test.ts` — stubs for ESCL-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Unread badge appears in nav | NOTF-03 | Browser DOM state | Log in as patient, create notification with `read: false`, verify badge renders with count |
| Supabase Realtime escalation push | ESCL-02 | Requires live Supabase connection | Trigger check-in response "Worse" via API, verify dashboard updates within 2s without page refresh |
| Inngest 48h delay fires | CHKN-01 | Requires Inngest Dev Server | Run `bunx inngest-cli@latest dev`, fire `medicrew/consultation.completed` event, verify sleep step visible in Inngest UI |
| Resend email delivery | NOTF-02 | Requires live Resend API key | Trigger escalation, verify email received in test inbox |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

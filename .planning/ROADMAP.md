# Roadmap: Medicrew

## Overview

Medicrew ships in four phases that follow a strict dependency chain: compliance and infrastructure must exist before any real user touches the product; the core "feels monitored" experience comes next; the proactive care loop that makes Medicrew a care platform rather than a chatbot comes third; and retention depth (symptom trends, care plan UI) closes out v1. Every phase delivers a coherent, independently verifiable capability before the next begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation + Compliance** - Legal minimum and infrastructure before any real users (completed 2026-03-26)
- [x] **Phase 2: Core Patient Experience** - Named care team, streaming consultations, health profile (completed 2026-03-26)
- [x] **Phase 3: Proactive Care Loop** - Check-ins, escalation detection, notifications (completed 2026-03-26)
- [x] **Phase 4: Retention + Polish** - Symptom trends, care plan UI, monitoring queue (completed 2026-03-26)

## Phase Details

### Phase 1: Foundation + Compliance
**Goal**: The product is legally safe to show to real Australian patients and runs on production-grade infrastructure
**Depends on**: Nothing (first phase)
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. Every agent response visible to a patient contains an AHPRA-compliant scope-of-practice disclaimer and explicit AI identification — no bare "Dr." titles anywhere
  2. Entering "chest pain", "I want to kill myself", or "can't move my face" in any consultation triggers an immediate deterministic 000 referral before any LLM processing occurs
  3. A new patient cannot store any health data until they have completed the explicit Privacy Act consent step (what data, why, which overseas processors)
  4. Patient can export all their data and trigger full account deletion from the patient portal
  5. The application connects to Supabase PostgreSQL (Sydney ap-southeast-2), all tables have RLS, and LangGraph uses PostgresSaver for consultation thread checkpointing
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Supabase PostgreSQL migration + vitest test infrastructure + RLS policies
- [x] 01-02-PLAN.md — LangGraph PostgresSaver checkpointer + Inngest background job setup
- [x] 01-03-PLAN.md — AHPRA compliance layer: agent renaming, disclaimers, emergency rules engine
- [x] 01-04-PLAN.md — Privacy consent flow, data export, and account deletion

### Phase 2: Core Patient Experience
**Goal**: Patients feel continuously monitored by a named, consistent AI care team from the moment they finish onboarding
**Depends on**: Phase 1
**Requirements**: ONBD-01, ONBD-02, ONBD-03, DASH-01, DASH-02, DASH-03, DASH-04, CONS-01, CONS-02, CONS-03, CONS-04, PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):
  1. A new patient completes onboarding — entering medical history, medications, emergency contact — and is introduced to their named AI care team with avatars and specialties before reaching the dashboard
  2. The patient dashboard shows each care team member with a live status indicator ("Alex AI — GP: Reviewed your symptoms today") that updates within 2 seconds of agent activity via Supabase Realtime — no page refresh needed
  3. During a consultation, the patient can see which AI agent is currently speaking (name, avatar, specialty badge) while text streams progressively in real time
  4. After a consultation ends, the patient receives a structured Care Summary listing urgency, findings, next steps, and a disclaimer
  5. The patient health profile page shows their known conditions, medications, and a symptom journal where they can log daily severity with free text
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md — Patient onboarding: Prisma schema migration, consent API, Supabase client helpers, multi-step onboarding page
- [ ] 02-02-PLAN.md — Care team dashboard: Supabase Realtime status indicators, consultation history, care plan card
- [x] 02-03-PLAN.md — Streaming consultation UI: SSE agent identity metadata, AgentOverlay, routing events
- [ ] 02-04-PLAN.md — Care Summary component, patient health profile page, symptom journal

### Phase 3: Proactive Care Loop
**Goal**: The system initiates contact with patients after consultations, detects worsening patterns, and routes escalations — making Medicrew a care platform, not just a chat tool
**Depends on**: Phase 2
**Requirements**: CHKN-01, CHKN-02, CHKN-03, CHKN-04, ESCL-01, ESCL-02, ESCL-03, NOTF-01, NOTF-02, NOTF-03
**Success Criteria** (what must be TRUE):
  1. 48 hours after a consultation completes, a patient automatically receives an in-app check-in message from their primary agent asking how they are feeling, without any manual trigger
  2. A patient responding "Worse" to a check-in causes their urgency tier to increase and a specialist agent notification to appear in their care status — visible on dashboard within seconds
  3. Emergency keywords in a check-in response trigger an immediate high-priority in-app notification and 000 referral (deterministic, same rules engine as Phase 1)
  4. The doctor portal monitoring queue shows all active patients with last check-in status, urgency level, and last agent activity
  5. A patient can see an unread notification badge on the portal nav, read all notifications in-app, and receive escalation alerts via email through Resend
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md — Inngest check-in job: CheckIn Prisma model, 48h delay function, consultation trigger, opt-out setting
- [ ] 03-02-PLAN.md — Escalation rules engine: worsening pattern detection, check-in response API, urgency tier escalation
- [ ] 03-03-PLAN.md — In-app notification system: NotificationInbox, CheckInResponseCard, unread badge, Resend email integration
- [ ] 03-04-PLAN.md — Doctor monitoring queue: monitoring API, MonitoringQueue component, doctor portal integration

### Phase 4: Retention + Polish
**Goal**: Patients have visual evidence of their monitoring over time and a clear view of their active care plan, creating a retention loop
**Depends on**: Phase 3
**Requirements**: DASH-02 (care plan detail), PROF-03 (symptom journal display with trends)
**Note**: DASH-02 and PROF-03 are co-assigned to Phase 2 for initial implementation (basic form); Phase 4 deepens them with trend charts and care plan UI. No new requirement IDs are orphaned — this phase polishes Phase 2 deliverables.
**Success Criteria** (what must be TRUE):
  1. The patient dashboard displays an active care plan with current monitoring status, next check-in scheduled, and open action items
  2. A patient can view a symptom trend chart showing severity over time across their logged journal entries
  3. The doctor portal monitoring queue displays urgency trend indicators, not just point-in-time status
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md — Symptom trend chart: recharts LineChart on profile page showing severity over time from journal entries
- [ ] 04-02-PLAN.md — Care plan UI: CarePlanDetail component replacing dashboard placeholder with monitoring status, next check-in, action items
- [ ] 04-03-PLAN.md — Doctor monitoring queue urgency trend indicators: improving/stable/worsening arrows from check-in history

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Compliance | 4/4 | Complete   | 2026-03-26 |
| 2. Core Patient Experience | 4/4 | Complete   | 2026-03-26 |
| 3. Proactive Care Loop | 4/4 | Complete    | 2026-03-26 |
| 4. Retention + Polish | 3/3 | Complete    | 2026-03-26 |

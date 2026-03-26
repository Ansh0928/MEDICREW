---
phase: 03-proactive-care-loop
plan: 01
subsystem: jobs
tags: [inngest, prisma, checkin, notifications]

requires:
  - phase: 01-foundation-compliance
    provides: Inngest client singleton, Prisma setup, Notification model
  - phase: 02-core-patient-experience
    provides: Consultation model, Patient profile API

provides:
  - CheckIn Prisma model with pending/responded/expired status flow
  - Inngest scheduleCheckIn function with 48h step.sleep delay
  - consultation/completed event fired after every consultation
  - Patient checkInsOptOut toggle on profile API

affects: [03-02, 03-03]

tech-stack:
  added: []
  patterns: ["Inngest step.run for durable job steps", "step.sleep for 48h delay", "opt-out gate before notification creation"]

key-files:
  created:
    - src/lib/inngest/functions.ts
  modified:
    - prisma/schema.prisma
    - src/app/api/inngest/route.ts
    - src/app/api/consult/route.ts
    - src/app/api/patient/profile/route.ts

key-decisions:
  - "CheckIn uses status field (pending/responded/expired) not boolean flags"
  - "Notification type 'check-in' used to distinguish from other notification types"
  - "Agent name hardcoded as 'Alex AI - GP' in check-in message per AHPRA naming rules"

patterns-established:
  - "Inngest functions: always check deletedAt + opt-out before side effects"
  - "consultation/completed event carries patientId, consultationId, patientName"

requirements-completed: [CHKN-01, CHKN-02, CHKN-04]

duration: included in wave 1 commit
completed: 2026-03-26
---

# Phase 3 Plan 01: Inngest Check-In Job

**Durable 48-hour check-in loop — consultations now trigger proactive patient follow-up via Inngest.**

## Accomplishments

- Added CheckIn Prisma model + Patient.checkInsOptOut field, pushed to Supabase
- scheduleCheckIn Inngest function: waits 48h, checks opt-out/deletedAt, creates check-in notification
- Both streaming and non-streaming consult routes fire consultation/completed event
- Profile GET/PATCH support checkInsOptOut toggle

## Self-Check: PASSED

- grep "model CheckIn" prisma/schema.prisma: 1 match
- grep "scheduleCheckIn" src/lib/inngest/functions.ts: 1 match
- grep "inngest.send" src/app/api/consult/route.ts: 2 matches
- grep "checkInsOptOut" src/app/api/patient/profile/route.ts: 5 matches
- 47 tests passing

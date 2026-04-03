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
  patterns:
    [
      "Inngest step.run for durable job steps",
      "step.sleep for 48h delay",
      "opt-out gate before notification creation",
    ]

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

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Inngest v4 createFunction API signature mismatch**

- **Found during:** Task 1 verification (build failed)
- **Issue:** functions.ts used Inngest v3 3-argument API (options, trigger, handler); v4 requires 2-arg form with triggers nested in options object
- **Fix:** Changed to `createFunction({ id, name, triggers: [{ event }] }, handler)` v4 pattern
- **Files modified:** src/lib/inngest/functions.ts
- **Commit:** 6e0eb82

**2. [Rule 1 - Bug] Resend client module-level instantiation threw on missing API key**

- **Found during:** Task 1 verification (Next.js build page data collection failed)
- **Issue:** `new Resend(process.env.RESEND_API_KEY)` at module top level threw when key was undefined, crashing route compilation
- **Fix:** Moved instantiation into `getResendClient()` helper called lazily inside each send function, guarded by existing env check
- **Files modified:** src/lib/email/resend.ts
- **Commit:** 6e0eb82

## Self-Check: PASSED

- grep "model CheckIn" prisma/schema.prisma: 1 match
- grep "scheduleCheckIn" src/lib/inngest/functions.ts: 1 match
- grep "inngest.send" src/app/api/consult/route.ts: 2 matches
- grep "checkInsOptOut" src/app/api/patient/profile/route.ts: 5 matches
- bun run build: compiled successfully

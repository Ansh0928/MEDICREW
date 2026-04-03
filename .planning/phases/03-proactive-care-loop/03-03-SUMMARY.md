---
phase: 03-proactive-care-loop
plan: 03
subsystem: ui
tags: [notifications, resend, email, inngest, check-in, escalation, react]

requires:
  - phase: 03-proactive-care-loop
    plan: 01
    provides: scheduleCheckIn Inngest function, CheckIn model, check-in notification creation
  - phase: 03-proactive-care-loop
    plan: 02
    provides: POST /api/checkin/respond, evaluateCheckInResponse, escalation flow

provides:
  - NotificationInbox component — categorized notification rendering with alert styling
  - CheckInResponseCard — interactive Better/Same/Worse response card with escalation feedback
  - sendCheckInEmail — Resend email helper for check-in follow-up notifications
  - sendEscalationEmail — Resend email helper for escalation alerts
  - GET /api/checkin — returns CheckIn records by patientId for UI rendering
  - Patient portal notifications tab wired to NotificationInbox
  - Inngest scheduleCheckIn sends check-in follow-up email via Resend after notification creation

affects: [03-04]

tech-stack:
  added: [resend@^6.9.4]
  patterns:
    - "Lazy Resend client factory: getResendClient() guards against missing env var at module init"
    - "checkInMessage hoisted above Inngest step closures so it can be reused by both notification and email steps"
    - "NotificationInbox maps notification type + pending checkIn status to determine which card to render"

key-files:
  created:
    - src/lib/email/resend.ts
    - src/components/notifications/CheckInResponseCard.tsx
    - src/components/notifications/NotificationInbox.tsx
    - src/app/api/checkin/route.ts
  modified:
    - src/lib/inngest/functions.ts
    - src/app/patient/page.tsx
    - src/app/api/checkin/respond/route.ts

key-decisions:
  - "sendCheckInEmail and sendEscalationEmail both skip gracefully with console.warn when RESEND_API_KEY is missing"
  - "AHPRA disclaimer included in all email HTML: health information only, not a medical diagnosis"
  - "Emergency email footers include call 000 instructions"
  - "checkInMessage hoisted to a dedicated resolve-check-in-message Inngest step for reuse"
  - "Weekly care summary email deferred to Phase 4 (requires separate cron job, opt-in)"

patterns-established:
  - "Resend emails: always include AHPRA disclaimer + 000 referral in footer"
  - "Inngest: hoist shared data to its own step.run before downstream consumers"
  - "NotificationInbox: check type check-in AND pending checkIn record before rendering response card"

requirements-completed: [NOTF-01, NOTF-02, NOTF-03]

duration: 15min
completed: 2026-03-26
---

# Phase 3 Plan 03: In-app Notification System Summary

**Resend email integration + interactive NotificationInbox with CheckInResponseCard — patients see, read, and respond to care team notifications in-app and by email.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-26T07:00:00Z
- **Completed:** 2026-03-26T07:15:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- sendCheckInEmail and sendEscalationEmail added to resend.ts with graceful RESEND_API_KEY guard and AHPRA disclaimer
- NotificationInbox and CheckInResponseCard components built — check-in notifications render as interactive Better/Same/Worse cards
- Inngest scheduleCheckIn extended with send-check-in-email step — check-in follow-ups now sent by both in-app notification and email
- Patient portal notifications tab fully wired to NotificationInbox with checkIns state and unread badge

## Task Commits

Each task was committed atomically:

1. **Task 1: Resend email helper + CheckInResponseCard + NotificationInbox** - `c6ab9d3` (feat)
2. **Task 2: Wire NotificationInbox into patient portal + add emails on escalation/check-in** - `892208c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/email/resend.ts` - Resend email helpers: sendCheckInEmail + sendEscalationEmail, lazy getResendClient() factory
- `src/components/notifications/CheckInResponseCard.tsx` - Interactive check-in card with Better/Same/Worse buttons + escalation feedback
- `src/components/notifications/NotificationInbox.tsx` - Categorized inbox with check-in cards, emergency/escalation alert styling
- `src/app/api/checkin/route.ts` - GET endpoint: returns CheckIn records by patientId
- `src/lib/inngest/functions.ts` - scheduleCheckIn extended with resolve-check-in-message step + send-check-in-email step
- `src/app/patient/page.tsx` - Notifications tab replaced with NotificationInbox, checkIns state fetched from /api/checkin
- `src/app/api/checkin/respond/route.ts` - sendEscalationEmail called after escalation notification creation

## Decisions Made

- Lazy getResendClient() factory (linter suggestion) is better than module-level new Resend() — avoids hard error if key is missing at build time
- checkInMessage hoisted to its own resolve-check-in-message Inngest step so it is available to both the notification creation step and the email step
- Weekly care summary email remains deferred to Phase 4 — it requires a separate cron Inngest function and opt-in UX

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Most files already existed from prior wave-2 commit**

- **Found during:** Task 1 pre-check
- **Issue:** Prior commit `ad5abad feat(03-wave2)` had already created CheckInResponseCard, NotificationInbox, updated patient/page.tsx and checkin/respond/route.ts — only sendCheckInEmail and the Inngest email step were missing
- **Fix:** Added only the genuinely missing pieces: sendCheckInEmail to resend.ts and send-check-in-email step to functions.ts
- **Files modified:** src/lib/email/resend.ts, src/lib/inngest/functions.ts
- **Verification:** All plan acceptance criteria grep checks pass, TypeScript clean
- **Committed in:** c6ab9d3, 892208c

---

**Total deviations:** 1 auto-fixed (pre-existing partial implementation, not a regression)
**Impact on plan:** No scope creep. All acceptance criteria satisfied.

## Issues Encountered

5 pre-existing test failures unrelated to this plan (COMP-04 consent gate, COMP-05a/b patient export — pre-existing vi.mocked incompatibility). Not introduced by this plan.

## User Setup Required

**External service configuration needed for email delivery.** Add to `.env.local`:

```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=care@yourdomain.com
```

- Get API key: Resend Dashboard -> API Keys -> Create API Key
- Get verified sender: Resend Dashboard -> Domains -> verified email address

Without these, email sends are silently skipped (console.warn logged, no crash) — in-app notifications still work fully.

## Self-Check: PASSED

- `grep "sendCheckInEmail" src/lib/email/resend.ts` — 1 match
- `grep "sendEscalationEmail" src/lib/email/resend.ts` — 1 match
- `grep "CheckInResponseCard" src/components/notifications/CheckInResponseCard.tsx` — 3 matches
- `grep "NotificationInbox" src/components/notifications/NotificationInbox.tsx` — 3 matches
- `grep "NotificationInbox" src/app/patient/page.tsx` — 2 matches
- `grep "sendEscalationEmail" src/app/api/checkin/respond/route.ts` — 2 matches
- `grep "sendCheckInEmail" src/lib/inngest/functions.ts` — 2 matches
- `test -f src/app/api/checkin/route.ts` — exists
- `bunx tsc --noEmit` — clean
- Commits c6ab9d3 and 892208c verified in git log

## Next Phase Readiness

- Notification inbox, check-in response loop, and email delivery complete
- Phase 3 Plan 04 (doctor monitoring queue) can build on the full notification + escalation flow
- Resend email helper available for any future email sends in Phase 4

---

_Phase: 03-proactive-care-loop_
_Completed: 2026-03-26_

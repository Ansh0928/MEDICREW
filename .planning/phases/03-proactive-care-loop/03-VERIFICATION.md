---
phase: 03-proactive-care-loop
verified: 2026-03-26T08:30:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Inngest 48h check-in timing — start Inngest Dev Server, trigger a consultation, skip the step.sleep via Inngest dashboard"
    expected: "Check-in notification appears in patient portal Notifications tab as a CheckInResponseCard; email sent if RESEND_API_KEY configured"
    why_human: "48h step.sleep cannot be verified by static analysis or unit tests — requires Inngest Dev Server time-skip"
  - test: "Check-in response interactive flow — log in as patient, navigate to Notifications tab, respond to a pending check-in"
    expected: "Better/Same/Worse buttons render; selecting Worse and submitting shows escalation confirmation; emergency free text shows 000 referral prominently"
    why_human: "Button selection state, CheckInResponseCard conditional rendering, and post-submission UI are visual and interactive"
  - test: "Doctor Monitoring Queue tab — log in to doctor portal, click Monitoring Queue"
    expected: "Patients sorted by urgency; emergency=red badge, urgent=default badge; last check-in response color-coded; last agent activity shown"
    why_human: "Badge color rendering and responsive card grid layout require browser verification"
---

# Phase 3: Proactive Care Loop Verification Report

**Phase Goal:** Build the proactive care loop — Inngest 48h check-in job, escalation rules engine, notification inbox UI, and doctor monitoring queue.
**Verified:** 2026-03-26T08:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 48h after consultation completes, Inngest fires and creates a check-in notification | VERIFIED | `scheduleCheckIn` in `src/lib/inngest/functions.ts` calls `step.sleep("wait-48h", "48h")` then `prisma.notification.create` with type "check-in" |
| 2 | Check-in message includes patient name and "Alex AI — GP" | VERIFIED | functions.ts line 44: `` `Hi ${patientName}, this is Alex AI \u2014 GP. How are you feeling since your consultation on ${consultDate}?` `` |
| 3 | Patient can toggle proactive check-ins off from profile settings | VERIFIED | `checkInsOptOut Boolean @default(false)` in Prisma Patient model; profile PATCH accepts and GET returns `checkInsOptOut`; Inngest function gates on `patient.checkInsOptOut` before sending notification |
| 4 | Responding "Worse" to a check-in escalates urgency tier and notifies specialist | VERIFIED | `evaluateCheckInResponse("worse", "")` returns `{ escalate: true, newUrgencyTier: "urgent", notifySpecialist: true }`; respond route upserts `prisma.careTeamStatus` with "Sarah AI — Cardiology" message |
| 5 | Emergency keywords in check-in free text trigger 000 referral regardless of response option | VERIFIED | `escalation-rules.ts` delegates free text to `detectEmergency()` first; emergency override sets `newUrgencyTier: "emergency"`; respond route creates type "emergency" notification and calls `sendEscalationEmail` |
| 6 | Patient can respond to check-in with Better/Same/Worse + optional free text | VERIFIED | `CheckInResponseCard.tsx` renders 3 buttons and a textarea, POSTs to `/api/checkin/respond` with `{ checkInId, response, freeText }`; POST validates all three response values |
| 7 | Unread notification badge count visible on patient portal Notifications tab | VERIFIED | `unreadCount = patient?.notifications.filter(n => !n.read).length` in `patient/page.tsx`; rendered as `<Badge variant="destructive">` on Notifications tab when count > 0 |
| 8 | Patient can read all notifications in-app including check-in requests and escalation alerts | VERIFIED | `NotificationInbox.tsx` renders: type "check-in" with pending CheckIn → `CheckInResponseCard`; type "emergency"/"escalation" → red/orange alert styling; all other types → standard card |
| 9 | Escalation alerts and check-in follow-ups are also sent via email through Resend | VERIFIED | `sendEscalationEmail` called in `checkin/respond/route.ts` on escalation; `sendCheckInEmail` called in Inngest `send-check-in-email` step; both gracefully degrade when `RESEND_API_KEY` missing |
| 10 | Doctor portal has monitoring queue showing all active patients sorted by urgency | VERIFIED | `GET /api/doctor/monitoring` computes `effectiveUrgency`, sorts emergency>urgent>routine>self_care; `MonitoringQueue.tsx` fetches on mount and renders 4-column card grid; doctor portal has "Monitoring Queue" tab with Activity icon |

**Score: 10/10 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | CheckIn model + checkInsOptOut on Patient | VERIFIED | `model CheckIn` at line 126 with all required fields; `checkInsOptOut Boolean @default(false)` at line 36; `checkIns CheckIn[]` on Patient (line 43) and Consultation (line 63) |
| `src/lib/inngest/functions.ts` | scheduleCheckIn with 48h delay | VERIFIED | 81 lines; exports `scheduleCheckIn`; `step.sleep("wait-48h", "48h")`; opt-out + deletedAt guard; 5 Inngest steps including email send |
| `src/app/api/inngest/route.ts` | Inngest serve with scheduleCheckIn registered | VERIFIED | Imports `scheduleCheckIn`, includes in `functions: [scheduleCheckIn]` |
| `src/app/api/consult/route.ts` | inngest.send after consultation creation | VERIFIED | 2 occurrences of `inngest.send` with event `"consultation/completed"` covering both streaming (line 133) and non-streaming (line 205) branches |
| `src/app/api/patient/profile/route.ts` | PATCH + GET for checkInsOptOut | VERIFIED | 5 matches — field destructured from body, included in conditional update spread, and in GET select clause |
| `src/lib/escalation-rules.ts` | evaluateCheckInResponse + EscalationResult | VERIFIED | 48 lines; exports `evaluateCheckInResponse` and `EscalationResult`; imports `detectEmergency` from `./emergency-rules`; all 3 response branches correct |
| `src/__tests__/lib/escalation-rules.test.ts` | 9 tests covering all escalation behaviours | VERIFIED | Tests cover: worse, better, same; emergency free text override on all 3 response types; specialistMessage presence/absence |
| `src/app/api/checkin/respond/route.ts` | POST endpoint with escalation + CareTeamStatus | VERIFIED | 125 lines; validates x-patient-id header, checkInId, response enum; calls `evaluateCheckInResponse`; upserts `prisma.careTeamStatus` with specialist; calls `sendEscalationEmail` |
| `src/lib/email/resend.ts` | sendEscalationEmail + sendCheckInEmail | VERIFIED | 86 lines; lazy `getResendClient()` factory guards missing env var; both functions export; AHPRA disclaimer and 000 referral in HTML footers |
| `src/components/notifications/CheckInResponseCard.tsx` | Interactive Better/Same/Worse card | VERIFIED | 182 lines; 3 response buttons; freeText textarea; POST to `/api/checkin/respond`; post-submission shows escalation feedback including emergency 000 callout |
| `src/components/notifications/NotificationInbox.tsx` | Categorized inbox | VERIFIED | 163 lines; maps type "check-in" + pending CheckIn to `CheckInResponseCard`; emergency/escalation rendered with alert styling and icon; standard card fallback |
| `src/app/api/checkin/route.ts` | GET CheckIn records by patientId | VERIFIED | 16 lines; `prisma.checkIn.findMany` selecting id, notificationId, status by patientId |
| `src/app/patient/page.tsx` | Patient portal with NotificationInbox | VERIFIED | Imports NotificationInbox; checkIns state fetched from /api/checkin; NotificationInbox rendered in notifications tab with checkIns prop; unread badge intact |
| `src/app/api/doctor/monitoring/route.ts` | GET with effectiveUrgency + urgency sort | VERIFIED | 111 lines; computes effectiveUrgency ("worse" → "urgent"); sorts by urgency order map; extracts lastAgentActivity from CareTeamStatus JSONB |
| `src/components/doctor/MonitoringQueue.tsx` | Monitoring queue UI with urgency badges | VERIFIED | 168 lines; exports `MonitoringQueue`; fetches `/api/doctor/monitoring` on mount; URGENCY_BADGE and RESPONSE_COLOR maps; loading and empty states |
| `src/app/doctor/page.tsx` | Doctor portal with Monitoring Queue tab | VERIFIED | Imports MonitoringQueue; activeTab type `"patients" | "monitoring"`; "Monitoring Queue" tab button with Activity icon; motion.div wrapper for tab content |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/consult/route.ts` | `src/lib/inngest/client.ts` | `inngest.send` after consultation creation | WIRED | 2 calls to `inngest.send({ name: "consultation/completed", data: { patientId, consultationId, patientName } })` at lines 133 and 205 |
| `src/lib/inngest/functions.ts` | `prisma.notification.create` | Inngest step.run creating notification | WIRED | `step.run("create-check-in-notification")` calls `prisma.notification.create` with type "check-in" at line 48 |
| `src/lib/inngest/functions.ts` | `src/lib/email/resend.ts` | sendCheckInEmail in Inngest step | WIRED | `sendCheckInEmail` imported at line 3, called in `step.run("send-check-in-email")` at line 73-77 |
| `src/app/api/checkin/respond/route.ts` | `src/lib/escalation-rules.ts` | evaluateCheckInResponse on response + freeText | WIRED | Imported and called at line 48; response and freeText passed as arguments |
| `src/app/api/checkin/respond/route.ts` | `src/lib/emergency-rules.ts` | detectEmergency delegated through escalation rules | WIRED | escalation-rules.ts imports and calls detectEmergency; respond route chains through evaluateCheckInResponse |
| `src/app/api/checkin/respond/route.ts` | `prisma.careTeamStatus` | CareTeamStatus upsert on specialist notification | WIRED | `prisma.careTeamStatus.upsert` called at line 94 inside escalation + notifySpecialist block |
| `src/app/api/checkin/respond/route.ts` | `src/lib/email/resend.ts` | sendEscalationEmail on escalation | WIRED | `sendEscalationEmail` imported at line 4, called at line 107 inside escalation block |
| `src/components/notifications/CheckInResponseCard.tsx` | `/api/checkin/respond` | fetch POST with response and freeText | WIRED | `fetch("/api/checkin/respond", { method: "POST", body: JSON.stringify({ checkInId, response, freeText }) })` at line 46 |
| `src/components/notifications/NotificationInbox.tsx` | `CheckInResponseCard` | Rendered for type "check-in" with pending CheckIn | WIRED | `<CheckInResponseCard ... />` at line 62 inside `notification.type === "check-in" && pendingCheckIn` guard |
| `src/app/patient/page.tsx` | `NotificationInbox` | NotificationInbox rendered in notifications tab | WIRED | NotificationInbox imported at line 15, rendered at line 429 with notifications, checkIns, onMarkRead, onRefresh props |
| `src/components/doctor/MonitoringQueue.tsx` | `/api/doctor/monitoring` | fetch GET on mount | WIRED | `fetch("/api/doctor/monitoring")` in useEffect at line 50; result sets `patients` state |
| `src/app/doctor/page.tsx` | `src/components/doctor/MonitoringQueue.tsx` | MonitoringQueue rendered in monitoring tab | WIRED | `<MonitoringQueue />` rendered inside `activeTab === "monitoring"` branch at line 219 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CHKN-01 | 03-01 | After each consultation, Inngest job schedules 48h check-in | SATISFIED | `inngest.send("consultation/completed")` in both consult branches; `scheduleCheckIn` with `step.sleep("wait-48h", "48h")` registered in Inngest serve |
| CHKN-02 | 03-01 | Check-in message: "Hi [Name], this is Alex AI — GP. How are you feeling since your consultation on [date]?" | SATISFIED | Exact message format confirmed at functions.ts line 44 with consultation date formatted as en-AU day/month/year |
| CHKN-03 | 03-02 | Patient can respond: Better / Same / Worse + optional free text | SATISFIED | POST /api/checkin/respond validates response enum; CheckInResponseCard provides UI with 3 response buttons and optional textarea |
| CHKN-04 | 03-01 | Patient can opt out of proactive check-ins from profile settings | SATISFIED | `checkInsOptOut` in Prisma Patient model; profile PATCH/GET wired; Inngest function checks field and skips if true |
| ESCL-01 | 03-02 | Emergency keywords — immediate high-priority notification + 000 referral | SATISFIED | evaluateCheckInResponse delegates free text to detectEmergency; emergency path creates type "emergency" notification; sendEscalationEmail triggered |
| ESCL-02 | 03-02 | "Worse" on check-in — urgency tier increases and specialist notified in care status | SATISFIED | evaluateCheckInResponse("worse") returns newUrgencyTier "urgent" and notifySpecialist true; respond route upserts careTeamStatus with "Sarah AI — Cardiology" |
| ESCL-03 | 03-04 | Doctor portal monitoring queue — all active patients with check-in status, urgency, last agent activity | SATISFIED | GET /api/doctor/monitoring returns all fields; MonitoringQueue renders full data sorted by urgency; doctor portal has dedicated tab |
| NOTF-01 | 03-03 | In-app notification system: care team updates, check-in requests, escalation alerts, consultation summaries | SATISFIED | NotificationInbox categorizes by type; check-in renders response card, emergency/escalation renders alert styling, others render standard card |
| NOTF-02 | 03-03 | Email via Resend: check-in follow-ups, escalation alerts (weekly care summary deferred to Phase 4) | SATISFIED | sendCheckInEmail in Inngest; sendEscalationEmail in respond route; both gracefully degrade when RESEND_API_KEY missing; weekly summary intentionally deferred with documentation |
| NOTF-03 | 03-03 | Unread notification badge on patient portal nav | SATISFIED | unreadCount computed from patient.notifications.filter(!n.read).length; Badge variant="destructive" shown on Notifications tab when unreadCount > 0 |

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps no additional Phase 3 requirement IDs beyond those covered by the four plans. No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `CheckInResponseCard.tsx` | 159 | `placeholder="Describe how you're feeling..."` | INFO | Normal HTML textarea placeholder attribute — not a code stub |

No TODO, FIXME, HACK, or placeholder code comments found in any Phase 3 files. No empty return stubs. No console.log-only handlers. No static response returns bypassing database queries.

**Notable scope decision:** NOTF-02 weekly care summary email is intentionally deferred to Phase 4. This is documented in both `03-03-PLAN.md` (scope note in frontmatter) and `03-03-SUMMARY.md` (decisions section). The core NOTF-02 deliverables — check-in follow-up emails and escalation alert emails — are fully implemented.

---

### Human Verification Required

#### 1. Inngest Check-in Timing Flow

**Test:** Start Inngest Dev Server (`bunx inngest-cli dev`), trigger a consultation, then use the Inngest dashboard to skip the 48h `step.sleep`. Observe the patient portal.
**Expected:** A check-in notification of type "check-in" appears in the Notifications tab. CheckInResponseCard renders with Better/Same/Worse buttons. If `RESEND_API_KEY` is configured, patient receives an email.
**Why human:** 48h `step.sleep` cannot be covered by unit tests; requires Inngest Dev Server time-skipping.

#### 2. Check-in Response Interactive Flow

**Test:** Log in as a patient with a pending check-in. Go to Notifications tab, observe CheckInResponseCard. Select "Worse", optionally add emergency free text (e.g., "chest pain"), submit.
**Expected:** Submission triggers POST to /api/checkin/respond. Escalation confirmation appears — orange card for urgency escalation, red card with "call 000 immediately" for emergency. Submitting "Better" shows green confirmation.
**Why human:** Button selection state, conditional CheckInResponseCard rendering based on `checkIn.status === "pending"`, and post-submission state are visual and interactive.

#### 3. Doctor Monitoring Queue Visual

**Test:** Log in to doctor portal, click "Monitoring Queue" tab.
**Expected:** Patients rendered in urgency order. Emergency: red destructive badge. Urgent: default badge. Last check-in response colored green/yellow/red. Last agent activity shown. Empty state ("No active patients") when no data.
**Why human:** Badge color rendering, responsive 4-column card grid collapse on mobile, and empty state display require browser verification.

---

### Gaps Summary

No gaps. All 10 observable truths are verified with direct code evidence. All 16 required artifacts exist and are substantive (no stubs, no empty returns). All 12 key links are wired end-to-end. All 10 requirement IDs (CHKN-01 through CHKN-04, ESCL-01 through ESCL-03, NOTF-01 through NOTF-03) are satisfied by concrete implementation evidence in the codebase.

The phase goal is achieved: Medicrew now proactively initiates contact with patients after consultations (Inngest 48h job), deterministically evaluates worsening patterns (escalation rules engine reusing Phase 1 emergency detection), surfaces care team notifications in-app and via email, and gives doctors a single urgency-sorted monitoring view.

---

_Verified: 2026-03-26T08:30:00Z_
_Verifier: Claude (gsd-verifier)_

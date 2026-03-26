---
phase: 03-proactive-care-loop
verified: 2026-03-26T08:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Send a test consultation and wait for Inngest 48h delay to trigger (use Inngest Dev Server)"
    expected: "Check-in notification appears in patient portal, email arrives via Resend (when keys configured)"
    why_human: "48h step.sleep cannot be accelerated programmatically in tests; requires Inngest Dev Server time skip"
  - test: "Respond 'Worse' to a check-in notification in the patient portal UI"
    expected: "Better/Same/Worse buttons render, selection + submit triggers API, escalation notification shows, email is sent"
    why_human: "Interactive button state, conditional rendering of CheckInResponseCard based on pending checkIn status — visual flow"
  - test: "Open doctor portal Monitoring Queue tab"
    expected: "All active patients listed, sorted by urgency (emergency first), urgency badges color-coded, last agent activity shown"
    why_human: "Badge color rendering, responsive card grid layout — visual verification"
---

# Phase 3: Proactive Care Loop Verification Report

**Phase Goal:** The system initiates contact with patients after consultations, detects worsening patterns, and routes escalations — making Medicrew a care platform, not just a chat tool
**Verified:** 2026-03-26T08:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 48h after consultation completes, Inngest fires and creates check-in notification | VERIFIED | `scheduleCheckIn` in `functions.ts` with `step.sleep("wait-48h", "48h")` + `prisma.notification.create` with type "check-in" |
| 2 | Check-in message includes patient name and "Alex AI — GP" | VERIFIED | Line 44 of `functions.ts`: `Hi ${patientName}, this is Alex AI \u2014 GP. How are you feeling since your consultation on ${consultDate}?` |
| 3 | Patient can toggle proactive check-ins off from their profile settings | VERIFIED | `checkInsOptOut Boolean @default(false)` in Prisma `Patient` model; profile API PATCH accepts and GET returns `checkInsOptOut` (5 matches in `profile/route.ts`) |
| 4 | 'Worse' check-in response escalates urgency tier and notifies specialist | VERIFIED | `evaluateCheckInResponse("worse", "")` returns `{ escalate: true, newUrgencyTier: "urgent", notifySpecialist: true }` in rules engine; respond route upserts `careTeamStatus` with specialist message |
| 5 | Emergency keywords in check-in free text trigger high-priority notification and 000 referral | VERIFIED | `escalation-rules.ts` delegates to `detectEmergency()` from Phase 1; emergency path returns `newUrgencyTier: "emergency"`; `respond/route.ts` creates notification type "emergency" and calls `sendEscalationEmail` |
| 6 | Patient can respond to check-in with Better/Same/Worse + optional free text | VERIFIED | `POST /api/checkin/respond` validates `["better", "same", "worse"]` responses with optional `freeText`; `CheckInResponseCard.tsx` POSTs to `/api/checkin/respond` with `checkInId`, `response`, `freeText` |
| 7 | Patient sees unread notification badge count on Notifications tab | VERIFIED | `unreadCount = patient?.notifications.filter(n => !n.read).length || 0` renders as `<Badge variant="destructive">` on Notifications tab when `unreadCount > 0` |
| 8 | Patient can read all notifications in-app including check-in requests and escalation alerts | VERIFIED | `NotificationInbox.tsx` renders: type "check-in" with pending CheckIn → `CheckInResponseCard`; type "emergency"/"escalation" → alert styling; all other types → standard card |
| 9 | Escalation alerts and check-in follow-ups sent via Resend email | VERIFIED | `sendEscalationEmail` called in `checkin/respond/route.ts` on escalation; `sendCheckInEmail` called in Inngest `send-check-in-email` step; both skip gracefully when `RESEND_API_KEY` missing |
| 10 | Doctor portal shows monitoring queue sorted by urgency with check-in and agent activity data | VERIFIED | `GET /api/doctor/monitoring` computes `effectiveUrgency`, sorts `emergency(0) > urgent(1) > routine(2) > self_care(3)`; `MonitoringQueue` fetches on mount; doctor portal has "Monitoring Queue" tab with `activeTab === "monitoring"` |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | CheckIn model + checkInsOptOut on Patient | VERIFIED | `model CheckIn` at line 126; `checkInsOptOut Boolean @default(false)` at line 36; `checkIns CheckIn[]` on both Patient (line 43) and Consultation (line 63) |
| `src/lib/inngest/functions.ts` | scheduleCheckIn with 48h delay | VERIFIED | Exports `scheduleCheckIn`; `step.sleep("wait-48h", "48h")`; opt-out + deletedAt guard; 5 Inngest steps including email |
| `src/app/api/inngest/route.ts` | Inngest serve with scheduleCheckIn registered | VERIFIED | Imports `scheduleCheckIn`, includes in `functions: [scheduleCheckIn]` |
| `src/app/api/consult/route.ts` | inngest.send after consultation creation | VERIFIED | 2 occurrences of `inngest.send` with event `"consultation/completed"` (streaming + non-streaming paths) |
| `src/app/api/patient/profile/route.ts` | PATCH + GET for checkInsOptOut | VERIFIED | 5 matches — field destructured, conditional update spread, GET select |
| `src/lib/escalation-rules.ts` | evaluateCheckInResponse + EscalationResult | VERIFIED | Exports both; imports `detectEmergency` from `./emergency-rules`; all 3 response branches correct |
| `src/app/api/checkin/respond/route.ts` | POST endpoint with escalation + CareTeamStatus | VERIFIED | Validates auth, ownership, response enum; calls `evaluateCheckInResponse`; upserts `prisma.careTeamStatus`; calls `sendEscalationEmail` on escalation |
| `src/__tests__/lib/escalation-rules.test.ts` | Tests for escalation rules | VERIFIED | 9 tests, all passing (confirmed with `bun test`) |
| `src/lib/email/resend.ts` | sendEscalationEmail + sendCheckInEmail | VERIFIED | Both exported; lazy `getResendClient()` factory; AHPRA disclaimer in HTML; 000 referral in footer |
| `src/components/notifications/CheckInResponseCard.tsx` | Interactive Better/Same/Worse card | VERIFIED | POSTs to `/api/checkin/respond` with `checkInId`, `response`, `freeText` |
| `src/components/notifications/NotificationInbox.tsx` | Categorized inbox with check-in + emergency rendering | VERIFIED | Maps type "check-in" + pending checkIn to `CheckInResponseCard`; emergency/escalation types rendered with alert styling |
| `src/app/patient/page.tsx` | NotificationInbox replacing inline notifications | VERIFIED | Imports `NotificationInbox`, fetches `checkIns` from `/api/checkin`, passes both to `NotificationInbox` in notifications tab; unread badge intact |
| `src/app/api/checkin/route.ts` | GET endpoint returning CheckIn records by patientId | VERIFIED | `prisma.checkIn.findMany` selecting `id`, `notificationId`, `status` |
| `src/app/api/doctor/monitoring/route.ts` | GET with effectiveUrgency computed + urgency sort | VERIFIED | Computes `effectiveUrgency` ("worse" → "urgent"), sorts by urgency order map, includes `lastAgentActivity` from CareTeamStatus JSONB |
| `src/components/doctor/MonitoringQueue.tsx` | Table/list with urgency badges | VERIFIED | Exports `MonitoringQueue`; fetches `/api/doctor/monitoring` on mount; renders urgency badges and response color coding |
| `src/app/doctor/page.tsx` | Doctor portal with Monitoring Queue tab | VERIFIED | Imports `MonitoringQueue`; `activeTab` type `"patients" | "monitoring"`; "Monitoring Queue" tab button with Activity icon; tab content renders `MonitoringQueue` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/consult/route.ts` | `src/lib/inngest/client.ts` | `inngest.send` after consultation creation | WIRED | 2 calls to `inngest.send` with `name: "consultation/completed"` at lines 133 and 205 |
| `src/lib/inngest/functions.ts` | `prisma.notification.create` | Inngest `step.run` creating notification | WIRED | `step.run("create-check-in-notification")` calls `prisma.notification.create` with type "check-in" |
| `src/app/api/checkin/respond/route.ts` | `src/lib/escalation-rules.ts` | `evaluateCheckInResponse` on response text | WIRED | Imported and called at line 48 with `response` + `freeText` |
| `src/app/api/checkin/respond/route.ts` | `src/lib/emergency-rules.ts` | `detectEmergency` via escalation rules | WIRED | `escalation-rules.ts` imports and delegates to `detectEmergency`; respond route chains through rules engine |
| `src/app/api/checkin/respond/route.ts` | `prisma.careTeamStatus` | CareTeamStatus upsert on specialist notification | WIRED | `prisma.careTeamStatus.upsert` called at line 94 when `escalation.notifySpecialist` is true |
| `src/components/notifications/CheckInResponseCard.tsx` | `/api/checkin/respond` | `fetch POST` with response and freeText | WIRED | `fetch("/api/checkin/respond", ...)` at line 46 with `checkInId`, `response`, `freeText` |
| `src/app/api/checkin/respond/route.ts` | `src/lib/email/resend.ts` | `sendEscalationEmail` on escalation | WIRED | `sendEscalationEmail` imported and called at line 107 inside escalation block |
| `src/lib/inngest/functions.ts` | `src/lib/email/resend.ts` | `sendCheckInEmail` in check-in email step | WIRED | `sendCheckInEmail` imported at line 3, called at line 75 inside `step.run("send-check-in-email")` |
| `src/components/doctor/MonitoringQueue.tsx` | `/api/doctor/monitoring` | `fetch GET` on mount | WIRED | `fetch("/api/doctor/monitoring")` in `useEffect` at line 50 |
| `src/app/doctor/page.tsx` | `src/components/doctor/MonitoringQueue.tsx` | MonitoringQueue rendered in monitoring tab | WIRED | `<MonitoringQueue />` rendered inside `activeTab === "monitoring"` branch at line 219 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CHKN-01 | 03-01 | After each consultation, Inngest job schedules 48h check-in | SATISFIED | `inngest.send("consultation/completed")` in both consult branches; `scheduleCheckIn` function with `step.sleep("wait-48h", "48h")` registered in Inngest serve |
| CHKN-02 | 03-01 | Check-in message: "Hi [Name], this is Alex AI — GP. How are you feeling since your consultation on [date]?" | SATISFIED | Exact message format confirmed at `functions.ts` line 44; consultation date formatted as day/month/year |
| CHKN-03 | 03-02 | Patient can respond: Better / Same / Worse + optional free text | SATISFIED | `POST /api/checkin/respond` validates response enum; `CheckInResponseCard` provides UI with three response buttons and optional textarea |
| CHKN-04 | 03-01 | Patient can opt out of proactive check-ins from profile settings | SATISFIED | `checkInsOptOut` field in Prisma Patient model; profile PATCH/GET wired; Inngest function checks `patient.checkInsOptOut` before creating notification |
| ESCL-01 | 03-02 | Emergency keywords → immediate high-priority notification + 000 referral | SATISFIED | `evaluateCheckInResponse` delegates free text to `detectEmergency`; emergency path creates type "emergency" notification; `sendEscalationEmail` triggered |
| ESCL-02 | 03-02 | "Worse" on check-in → urgency tier increases, specialist notified in care status | SATISFIED | `evaluateCheckInResponse("worse", "")` returns `newUrgencyTier: "urgent", notifySpecialist: true`; respond route upserts `careTeamStatus` with "Sarah AI — Cardiology" specialist message |
| ESCL-03 | 03-04 | Doctor portal shows monitoring queue — all active patients with last check-in status, urgency, last agent activity | SATISFIED | `GET /api/doctor/monitoring` returns all fields; `MonitoringQueue` renders full data; doctor portal has dedicated "Monitoring Queue" tab |
| NOTF-01 | 03-03 | In-app notification system: care team updates, check-in requests, escalation alerts, consultation summaries | SATISFIED | `NotificationInbox` categorizes by type; "check-in" renders response card, "emergency"/"escalation" renders alert styling, others render standard card |
| NOTF-02 | 03-03 | Email notifications via Resend: check-in follow-ups, escalation alerts (weekly care summary deferred to Phase 4) | SATISFIED | `sendCheckInEmail` in Inngest; `sendEscalationEmail` in respond route; both gracefully degrade when `RESEND_API_KEY` missing; weekly summary intentionally deferred to Phase 4 per plan scope note |
| NOTF-03 | 03-03 | Unread notification badge on patient portal nav | SATISFIED | `unreadCount` computed from `patient.notifications.filter(n => !n.read).length`; `Badge variant="destructive"` shown on Notifications tab when `unreadCount > 0` |

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps no additional Phase 3 IDs beyond those covered by the four plans. No orphaned requirements.

---

### Anti-Patterns Found

No blockers or warnings found.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TODO/FIXME/placeholder comments found in Phase 3 files | — | — |
| — | — | No empty return stubs found | — | — |

**Notable observation:** `NOTF-02` weekly care summary email is intentionally deferred to Phase 4 — documented explicitly in both `03-03-PLAN.md` scope note and `03-03-SUMMARY.md` decisions. The requirement is marked [x] in REQUIREMENTS.md; verifier notes this deferral but it is within plan scope and documented.

---

### Human Verification Required

#### 1. Inngest Check-in Timing Flow

**Test:** Start Inngest Dev Server (`bunx inngest-cli dev`), trigger a consultation, use the Inngest dashboard to skip the 48h `step.sleep`, observe results.
**Expected:** Check-in notification appears in patient portal Notifications tab; if `RESEND_API_KEY` is configured, email arrives at patient's email address.
**Why human:** The 48h `step.sleep` cannot be covered by unit tests; requires Inngest Dev Server time-skipping functionality.

#### 2. Check-in Response Interactive Flow

**Test:** Log in as a patient who has a pending check-in notification. Navigate to Notifications tab. Observe the check-in notification.
**Expected:** `CheckInResponseCard` renders with Better/Same/Worse buttons. Selecting "Worse" and submitting shows escalation confirmation. If emergency keywords are entered in the free text, the 000 referral message renders prominently.
**Why human:** Button selection state, conditional `CheckInResponseCard` rendering based on `checkIn.status === "pending"`, and post-submission UI state are visual/interactive behaviors.

#### 3. Doctor Monitoring Queue Visual

**Test:** Log in to doctor portal, click "Monitoring Queue" tab.
**Expected:** Patients sorted by urgency; emergency patients show red "Destructive" badge, urgent patients show default badge; last check-in response colored green/yellow/red; last agent activity message and timestamp displayed; empty state shows when no patients.
**Why human:** Badge color rendering, responsive card grid collapse on mobile, empty state display — all visual.

---

### Gaps Summary

No gaps. All 10 observable truths are verified. All 16 required artifacts exist and are substantive. All 10 key links are wired end-to-end. All 10 requirement IDs (CHKN-01 through CHKN-04, ESCL-01 through ESCL-03, NOTF-01 through NOTF-03) are satisfied by concrete implementation evidence.

The phase goal is achieved: Medicrew now initiates contact with patients after consultations (via the Inngest 48h check-in job), detects worsening patterns (deterministic escalation rules engine reusing Phase 1 emergency detection), and routes escalations (CareTeamStatus upsert + email notifications + doctor monitoring queue). The system has crossed from a chat tool into a proactive care platform.

---

_Verified: 2026-03-26T08:00:00Z_
_Verifier: Claude (gsd-verifier)_

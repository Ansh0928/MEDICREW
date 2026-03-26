# Phase 3: Proactive Care Loop — Research

**Researched:** 2026-03-26
**Phase:** 3 — Proactive Care Loop
**Researcher:** gsd-phase-researcher

## RESEARCH COMPLETE

---

## 1. Codebase State Entering Phase 3

### What Exists

| Area | Current State |
|------|--------------|
| `src/lib/inngest/client.ts` | `Inngest({ id: "medicrew" })` created — no functions registered |
| `src/app/api/inngest/route.ts` | Serve handler scaffolded, `functions: []` — ready to add |
| `prisma/schema.prisma` | `Notification` model exists (patientId, doctorId, title, message, type, read, createdAt) — lacks: `priority`, `notificationType` enum, `checkInId` foreign key |
| `prisma/schema.prisma` | No `CheckIn` model — needs creation |
| `prisma/schema.prisma` | `Consultation.urgencyLevel` String — needs to drive escalation but has no `checkInOptOut` on Patient |
| `src/lib/emergency-rules.ts` | `detectEmergency(text)` pure function — deterministic, no LLM, returns `isEmergency`, `category`, `response` with 000 CTA. **Reuse directly in escalation engine.** |
| `src/app/api/portal/queue/route.ts` | Uses in-memory `doctors-patients-store` — NOT Supabase/Prisma. Phase 3 doctor monitoring queue must use Prisma instead. |
| `src/lib/doctors-patients-store.ts` | In-memory store — NOT persistent. Doctor monitoring queue in Phase 3 will bypass this and query Prisma directly. |
| `src/app/api/notifications/route.ts` | GET handler exists — reads Prisma `Notification` model. Phase 3 extends this: add unread count endpoint + mark-read. |
| `src/lib/supabase/client.ts` | `createSupabaseBrowser()` — Supabase JS client for browser Realtime. |
| `src/lib/supabase/server.ts` | `createSupabaseServer()` — server-side Supabase client. |
| `src/components/` | `consult/`, `dashboard/`, `doctor/`, `landing/`, `onboarding/`, `portal/`, `profile/`, `ui/` — no notification-specific components yet |

### Schema Gaps to Fill in Phase 3

```prisma
// 1. Add to Patient model
checkInOptOut  Boolean  @default(false)

// 2. New CheckIn model
model CheckIn {
  id              String   @id @default(cuid())
  patientId       String
  patient         Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  consultationId  String
  consultation    Consultation @relation(fields: [consultationId], references: [id], onDelete: Cascade)
  scheduledAt     DateTime
  sentAt          DateTime?
  response        String?          // "Better" | "Same" | "Worse" | free text
  responseType    String?          // "better" | "same" | "worse" | "emergency"
  respondedAt     DateTime?
  escalated       Boolean  @default(false)
  createdAt       DateTime @default(now())
}

// 3. Extend Notification model
// Add: priority String @default("normal") // "normal" | "high" | "emergency"
// Add: notificationType String @default("general")
//      values: "check_in_request" | "escalation" | "care_update" | "emergency" | "consultation_summary"
// Add: checkInId String?  (optional link to triggering check-in)
// Add: emailSent Boolean @default(false)

// 4. Extend Consultation model
// Add: checkIns CheckIn[]  (relation back-link)
// Add: primaryAgentId String? (which agent ran the consult — for check-in message authorship)
```

---

## 2. Inngest: Durable Check-In Job

### Pattern: Inngest + Next.js (v4.x)

```ts
// Defining a function
import { inngest } from "@/lib/inngest/client";

export const scheduleCheckIn = inngest.createFunction(
  { id: "schedule-checkin" },
  { event: "medicrew/consultation.completed" },
  async ({ event, step }) => {
    // step.sleep is the durable delay — survives restarts
    await step.sleep("wait-48h", "48 hours");

    // step.run is a durable checkpoint
    await step.run("send-checkin-notification", async () => {
      // create Notification + CheckIn record
    });
  }
);

// Registering in route.ts
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scheduleCheckIn],
});
```

### Event Firing (trigger from consultation end)

```ts
// In consultation completion handler:
await inngest.send({
  name: "medicrew/consultation.completed",
  data: {
    patientId,
    consultationId,
    primaryAgentId: "alex-ai-gp", // from care-team-config
    patientName,
  },
});
```

### Key Points
- `step.sleep("48 hours")` is durable — survives Vercel function restarts and cold starts
- Inngest Dev Server (port 8288) needed for local testing: `bunx inngest-cli@latest dev`
- Opt-out check: read `patient.checkInOptOut` inside the function before sending — if true, return early and log skip
- Vercel Cron is NOT needed — Inngest's `step.sleep` handles the delay natively. ROADMAP mention of "Vercel Cron trigger" is misleading; the correct approach is Inngest `step.sleep`.

---

## 3. Escalation Rules Engine

### Design: Extend `emergency-rules.ts` Pattern

Phase 1 established `detectEmergency(text)` as a pure, deterministic function. Phase 3 adds a parallel `detectEscalation(response: string, responseType: string)` function:

```ts
// src/lib/escalation-rules.ts

export type EscalationResult = {
  isEmergency: boolean;          // triggers 000 path (reuses detectEmergency)
  isEscalation: boolean;         // "Worse" → urgency tier increase
  newUrgencyLevel?: string;      // "urgent" | "emergency" etc.
  action: "none" | "escalate" | "emergency";
  notificationTitle: string;
  notificationMessage: string;
  notificationPriority: "normal" | "high" | "emergency";
};

export function detectEscalation(
  text: string,
  responseType: "better" | "same" | "worse" | string
): EscalationResult {
  // Step 1: emergency check (reuse detectEmergency)
  const emergencyResult = detectEmergency(text);
  if (emergencyResult.isEmergency) {
    return { isEmergency: true, isEscalation: true, action: "emergency", ... };
  }
  // Step 2: worsening pattern
  if (responseType === "worse" || /worse|deteriorating|getting worse|feeling worse/i.test(text)) {
    return { isEmergency: false, isEscalation: true, action: "escalate", ... };
  }
  return { isEmergency: false, isEscalation: false, action: "none", ... };
}
```

### Urgency Tier Escalation

Current `Consultation.urgencyLevel` values: `emergency`, `urgent`, `routine`, `self_care`.

Escalation logic: `Worse` response → promote one tier:
- `self_care` → `routine`
- `routine` → `urgent`
- `urgent` → `emergency`
- `emergency` → stays `emergency`

Update `Patient`'s most recent `Consultation.urgencyLevel` in Prisma, then push Supabase Realtime event.

### Supabase Realtime Push

Use Supabase broadcast channel for instant dashboard updates (no polling):

```ts
import { createSupabaseServer } from "@/lib/supabase/server";

const supabase = await createSupabaseServer();
await supabase.channel(`patient-${patientId}`)
  .send({
    type: "broadcast",
    event: "escalation",
    payload: { patientId, newUrgencyLevel, notificationId },
  });
```

Client subscribes to the same channel in the dashboard component.

---

## 4. In-App Notification System

### Existing `Notification` Model

The Prisma `Notification` model exists but lacks:
- `priority` — needed for emergency visual distinction
- `notificationType` — needed to categorize (check_in, escalation, emergency, etc.)
- `checkInId` — FK to link notification to triggering check-in

### Required API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/notifications?patientId=` | GET | Exists — returns all notifications |
| `/api/notifications/unread-count?patientId=` | GET | New — returns `{ count: N }` |
| `/api/notifications/[id]/read` | PATCH | New — marks single notification read |
| `/api/notifications/mark-all-read` | POST | New — bulk mark read for patient |

### Unread Badge

In patient nav: read `unreadCount` from `/api/notifications/unread-count`. Use Supabase Realtime subscription to increment badge in real-time when new notifications arrive (no polling). Badge: conditionally render a `<span>` with count when `unreadCount > 0`.

### Resend Email Integration

Resend is NOT currently installed in `package.json`. Install: `bun add resend`.

```ts
// src/lib/email.ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEscalationEmail(to: string, patientName: string, escalationDetail: string) {
  await resend.emails.send({
    from: "Medicrew <noreply@medicrew.au>",
    to,
    subject: `[Medicrew] Care Alert: ${patientName}`,
    html: `...`,
  });
}
```

Email triggers: escalation alerts (ESCL-02) and emergency detection (ESCL-01). Check `patient.email` and `Notification.emailSent` to avoid duplicates.

---

## 5. Doctor Monitoring Queue

### Current State

`src/app/api/portal/queue/route.ts` reads from in-memory `doctors-patients-store`. This is NOT suitable for Phase 3 — it's ephemeral, not Prisma-backed.

### Phase 3 Queue: Prisma-Backed

New query: join `Patient` → `Consultation` (latest per patient) → `CheckIn` (latest per consultation) → `Notification` (latest per patient).

```ts
// Conceptual query
const patients = await prisma.patient.findMany({
  where: { onboardingComplete: true, deletedAt: null },
  include: {
    consultations: { orderBy: { createdAt: "desc" }, take: 1 },
    // checkIns via consultation relation
    notifications: { orderBy: { createdAt: "desc" }, take: 1 },
    careTeamStatus: true,
  },
});
```

New route: `src/app/api/portal/monitoring-queue/route.ts` (separate from existing `queue` which uses in-memory store). Returns shaped data:
```ts
{
  patientId, patientName, urgencyLevel,
  lastCheckInStatus,    // "Better" | "Same" | "Worse" | "No response" | "Pending"
  lastCheckInDate,
  lastAgentActivity,    // CareTeamStatus.updatedAt
  checkInScheduled,     // next pending CheckIn.scheduledAt
}
```

### Doctor Portal UI

`src/components/portal/` already exists. New component: `MonitoringQueue.tsx` — table with sortable columns (urgency, last activity, check-in status). Uses Supabase Realtime to auto-refresh when escalations occur.

---

## 6. Validation Architecture

### Test Strategy

| Concern | Test Approach |
|---------|--------------|
| `detectEscalation()` | Unit tests in `src/__tests__/escalation-rules.test.ts` — test "Worse", emergency keywords, "Better" (no escalation) |
| Inngest function | Mock Inngest step functions with `@inngest/test` or manual mock — test opt-out early return, sleep duration |
| `/api/notifications` routes | Vitest with Prisma mock (`vi.mock('@/lib/prisma')`) |
| Resend email | Mock `resend.emails.send` with `vi.fn()` — assert called with correct `to`, `subject` |
| Monitoring queue route | Mock Prisma, assert correct shape |
| Supabase Realtime | Integration: manual QA in dev — Supabase Realtime channel subscription tested via browser DevTools |

### Acceptance Criteria Coverage

| Success Criterion | How to verify |
|-------------------|--------------|
| 48h check-in fires | Inngest `step.sleep("48 hours")` present in function; local test: use `step.sleep("10 seconds")` env var override |
| "Worse" → urgency escalation | `detectEscalation("feeling worse", "worse")` returns `action: "escalate"` |
| Emergency keywords → 000 | `detectEscalation("chest pain", "worse")` returns `action: "emergency"` |
| Doctor queue shows all active patients | GET `/api/portal/monitoring-queue` returns patients with last check-in status |
| Unread badge | `Notification.read = false` count > 0 → badge renders with count |

---

## 7. Key Implementation Decisions

| Decision | Rationale |
|----------|-----------|
| Inngest `step.sleep("48 hours")` — NOT Vercel Cron | Durable, survives restarts. Vercel Cron would require a separate cron job that scans for pending check-ins — more complex, less reliable. |
| Reuse `detectEmergency()` in escalation engine | Deterministic, already tested, single source of truth per COMP-03 |
| New `/api/portal/monitoring-queue` route | Avoids polluting in-memory store route; Prisma-backed for correctness |
| `Resend` for email | Already implied in NOTF-02; no SMTP infra needed; matches pattern of existing integrations |
| Supabase Realtime broadcast for escalations | Existing pattern (Phase 2 used Realtime for CareTeamStatus); zero-polling, instant |
| `CheckIn` as first-class model | Enables querying check-in history, opt-out per-consultation, and linking notifications to their trigger |

---

## 8. File Map: What Phase 3 Touches

```
prisma/schema.prisma                  — Add CheckIn model, extend Patient, Notification, Consultation
src/lib/inngest/client.ts             — Unchanged (already configured)
src/lib/inngest/functions/            — NEW: checkin.ts (scheduleCheckIn function)
src/app/api/inngest/route.ts          — Register scheduleCheckIn
src/lib/escalation-rules.ts           — NEW: detectEscalation() + urgency tier logic
src/lib/email.ts                      — NEW: Resend client + email templates
src/app/api/notifications/route.ts    — Extend: add unread-count and mark-read endpoints
src/app/api/notifications/[id]/read/  — NEW route
src/app/api/portal/monitoring-queue/  — NEW route (Prisma-backed queue)
src/components/portal/MonitoringQueue.tsx — NEW component
src/components/dashboard/             — Extend: unread notification badge in nav
src/app/(portal)/doctor/              — Add monitoring queue tab/page
```

---

*Research complete: 2026-03-26*
*Phase: 03-proactive-care-loop*
